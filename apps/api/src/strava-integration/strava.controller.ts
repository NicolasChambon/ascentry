import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type AuthRequest, SessionGuard } from '../auth/session.guard';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { STRAVA_CLIENT, type StravaClient } from './strava.client';
import { StravaConnectionService } from './strava-connection.service';
import { STRAVA_STATE_COOKIE } from './strava.constants';
import { buildStravaAuthorizeUrl } from './strava-authorize-url';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { StravaStatus } from '@ascentry/shared';

const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Controller('strava')
@UseGuards(SessionGuard)
export class StravaController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @Inject(STRAVA_CLIENT) private readonly stravaClient: StravaClient,
    private readonly connections: StravaConnectionService,
  ) {}

  @Get('status')
  async getStatus(@Req() req: AuthRequest): Promise<StravaStatus> {
    if (req.userId === undefined) {
      throw new ForbiddenException();
    }

    return this.connections.getStatus(req.userId);
  }

  @Delete('connection')
  @HttpCode(204)
  async disconnect(@Req() req: AuthRequest): Promise<void> {
    if (req.userId === undefined) {
      throw new ForbiddenException();
    }

    await this.connections.deleteConnection(req.userId);
  }

  @Get('connect')
  connect(@Res() res: Response): void {
    const state = randomBytes(32).toString('base64url');

    res.cookie(STRAVA_STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      path: '/api/strava',
    });

    const url = buildStravaAuthorizeUrl({
      clientId: String(this.config.get('STRAVA_CLIENT_ID', { infer: true })),
      redirectUri: this.config.get('STRAVA_REDIRECT_URI', { infer: true }),
      state,
    });

    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('code') code?: string,
    @Query('scope') scope?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    const cookieState = req.cookies[STRAVA_STATE_COOKIE];
    res.clearCookie(STRAVA_STATE_COOKIE, { path: '/api/strava' });

    if (typeof cookieState !== 'string' || cookieState !== state) {
      throw new ForbiddenException('Invalid OAuth state');
    }

    const webOrigin = this.config.get('WEB_ORIGIN', { infer: true });

    if (typeof error === 'string' || typeof code !== 'string') {
      res.redirect(`${webOrigin}?strava=denied`);
      return;
    }

    if (req.userId === undefined) {
      throw new ForbiddenException();
    }

    const credentials = await this.stravaClient.exchangeCode(code);

    try {
      await this.connections.saveConnection(req.userId, credentials, scope ?? '');
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        res.redirect(`${webOrigin}?strava=already_linked`);
        return;
      }

      throw error;
    }

    res.redirect(`${webOrigin}?strava=connected`);
  }
}
