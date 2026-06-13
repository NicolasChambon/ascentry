import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { LoginDto, RegisterDto } from './auth.dto';
import type { Response } from 'express';
import { PublicUser } from '@ascentry/shared';
import { SESSION_COOKIE } from './auth.constants';
import { SessionGuard, type AuthRequest } from './session.guard';

@Controller()
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('auth/register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const email = this.normalizeEmail(body.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing !== null) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(body.password);
    const user = await this.prisma.user.create({ data: { email, passwordHash } });

    await this.openSession(res, user.id);

    return this.toPublicUser(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  @Post('auth/login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const email = this.normalizeEmail(body.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user == null || !(await this.passwordService.verify(user.passwordHash, body.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.openSession(res, user.id);
    return this.toPublicUser(user);
  }

  @Post('auth/logout')
  @HttpCode(204)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = req.cookies[SESSION_COOKIE];

    if (typeof token === 'string') {
      await this.sessionService.revoke(token);
    }

    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: AuthRequest): Promise<PublicUser> {
    if (req.userId === undefined) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });

    if (user === null) {
      throw new UnauthorizedException();
    }

    return this.toPublicUser(user);
  }

  private toPublicUser(user: { id: string; email: string; emailVerified: boolean }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  private async openSession(res: Response, userId: string): Promise<void> {
    const { token, expiresAt } = await this.sessionService.create(userId);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
  }
}
