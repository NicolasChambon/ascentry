import { Injectable } from '@nestjs/common';
import z from 'zod';
import type {
  ListActivitiesParams,
  StravaActivity,
  StravaClient,
  StravaCredentials,
  StravaTokens,
} from './strava.client';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_URL = 'https://www.strava.com/api/v3';

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

const activitySchema = z.object({
  id: z.number(),
  name: z.string(),
  sport_type: z.string(),
  distance: z.number(),
  moving_time: z.number(),
  elapsed_time: z.number(),
  total_elevation_gain: z.number(),
  start_date: z.iso.datetime(),
  start_date_local: z.iso.datetime(),
  timezone: z.string(),
  average_speed: z.number(),
  max_speed: z.number(),
  average_heartrate: z.number().optional(),
  max_heartrate: z.number().optional(),
  kudos_count: z.number(),
  total_photo_count: z.number(),
});

const activitiesResponseSchema = z.array(activitySchema);

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

  async listActivities(
    accessToken: string,
    params: ListActivitiesParams,
  ): Promise<StravaActivity[]> {
    const query = new URLSearchParams({
      page: String(params.page),
      per_page: String(params.perPage),
    });

    if (params.after !== undefined) {
      query.set('after', String(params.after));
    }

    const response = await fetch(`${STRAVA_API_URL}/athlete/activities?${query.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Strava activity request failed (${String(response.status)}): ${detail}`);
    }

    const data: unknown = await response.json();
    const parsed = activitiesResponseSchema.parse(data);

    return parsed.map((activity) => ({
      stravaActivityId: activity.id,
      name: activity.name,
      sportType: activity.sport_type,
      distance: activity.distance,
      movingTime: activity.moving_time,
      elapsedTime: activity.elapsed_time,
      totalElevationGain: activity.total_elevation_gain,
      startDate: new Date(activity.start_date),
      startDateLocal: new Date(activity.start_date_local),
      timezone: activity.timezone,
      averageSpeed: activity.average_speed,
      maxSpeed: activity.max_speed,
      averageHeartrate: activity.average_heartrate ?? null,
      maxHeartrate: activity.max_heartrate ?? null,
      kudosCount: activity.kudos_count,
      photoCount: activity.total_photo_count,
    }));
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
