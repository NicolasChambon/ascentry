import { Injectable } from '@nestjs/common';
import z from 'zod';
import type { StravaClient, StravaCredentials, StravaTokens } from './strava.client';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

const credentialsResponseSchema = tokenResponseSchema.extend({
  athlete: z.object({
    id: z.number(),
  }),
});

@Injectable()
export class HttpStravaClient implements StravaClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async exchangeCode(code: string): Promise<StravaCredentials> {
    const data = await this.requestToken({ grant_type: 'authorization_code', code });
    const parsed = credentialsResponseSchema.parse(data);
    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      expiresAt: new Date(parsed.expires_at * 1000),
      athleteId: parsed.athlete.id,
    };
  }

  async refreshTokens(refreshToken: string): Promise<StravaTokens> {
    const data = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const parsed = tokenResponseSchema.parse(data);
    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      expiresAt: new Date(parsed.expires_at * 1000),
    };
  }

  private async requestToken(params: Record<string, string>): Promise<unknown> {
    const clientId = this.config.get('STRAVA_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('STRAVA_CLIENT_SECRET', { infer: true });

    const body = new URLSearchParams({
      ...params,
      client_id: String(clientId),
      client_secret: clientSecret,
    });

    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Strava token request failed (${String(response.status)}): ${detail}`);
    }

    return response.json();
  }
}
