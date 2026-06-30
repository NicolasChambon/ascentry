import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStravaClient } from './http-strava.client';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema';

const makeClient = () => {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'STRAVA_CLIENT_ID') return 12345;
      if (key === 'STRAVA_CLIENT_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  return new HttpStravaClient(config as unknown as ConfigService<Env, true>);
};

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const stravaActivity = {
  id: 123456789,
  name: 'Morning Run',
  sport_type: 'Run',
  distance: 10234.5,
  moving_time: 3600,
  elapsed_time: 3700,
  total_elevation_gain: 120,
  start_date: '2026-06-20T06:00:00Z',
  start_date_local: '2026-06-20T08:00:00Z',
  timezone: '(GMT+01:00) Europe/Paris',
  average_speed: 2.84,
  max_speed: 4.1,
  average_heartrate: 152.3,
  max_heartrate: 178,
  kudos_count: 5,
  total_photo_count: 2,
  achievement_count: 3,
  type: 'Run',
};

describe('HttpStravaClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('exchangeCode', () => {
    it('maps the Strava response to StravaCredentials', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          access_token: 'acc',
          refresh_token: 'ref',
          expires_at: 1700000000,
          athlete: { id: 42 },
        }),
      );

      const creds = await makeClient().exchangeCode('the-code');

      expect(creds).toEqual({
        accessToken: 'acc',
        refreshToken: 'ref',
        expiresAt: new Date(1700000000 * 1000),
        athleteId: 42,
      });
    });

    it('posts the auth-code grant with client credentials', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ access_token: 'a', refresh_token: 'r', expires_at: 1, athlete: { id: 1 } }),
      );

      await makeClient().exchangeCode('the-code');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://www.strava.com/oauth/token');
      expect(options.method).toBe('POST');
      const body = options.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('the-code');
      expect(body.get('client_id')).toBe('12345');
      expect(body.get('client_secret')).toBe('test-secret');
    });
  });

  describe('refreshTokens', () => {
    it('maps the response and needs no athlete', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ access_token: 'a2', refresh_token: 'r2', expires_at: 1700000000 }),
      );

      const tokens = await makeClient().refreshTokens('old-refresh');

      expect(tokens).toEqual({
        accessToken: 'a2',
        refreshToken: 'r2',
        expiresAt: new Date(1700000000 * 1000),
      });
      const body = fetchMock.mock.calls[0]![1].body as URLSearchParams;
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('old-refresh');
    });

    it('throws when Strava returns a non-2xx status', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Bad' }, { ok: false, status: 400 }));
      await expect(makeClient().refreshTokens('x')).rejects.toThrow(/400/);
    });

    it('throws when the response shape is invalid (boundary validation)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ refresh_token: 'r', expires_at: 1 })); // no access_token
      await expect(makeClient().refreshTokens('x')).rejects.toThrow();
    });
  });

  describe('listActivities', () => {
    it('maps a Strava activity to the domain shape', async () => {
      fetchMock.mockResolvedValue(jsonResponse([stravaActivity]));

      const activities = await makeClient().listActivities('the-token', { page: 1, perPage: 200 });

      expect(activities).toEqual([
        {
          stravaActivityId: 123456789,
          name: 'Morning Run',
          sportType: 'Run',
          distance: 10234.5,
          movingTime: 3600,
          elapsedTime: 3700,
          totalElevationGain: 120,
          startDate: new Date('2026-06-20T06:00:00Z'),
          startDateLocal: new Date('2026-06-20T08:00:00Z'),
          timezone: '(GMT+01:00) Europe/Paris',
          averageSpeed: 2.84,
          maxSpeed: 4.1,
          averageHeartrate: 152.3,
          maxHeartrate: 178,
          kudosCount: 5,
          photoCount: 2,
        },
      ]);
    });

    it('normalizes missing heart-rate fields to null', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse([
          { ...stravaActivity, average_heartrate: undefined, max_heartrate: undefined },
        ]),
      );

      const [activity] = await makeClient().listActivities('t', { page: 1, perPage: 200 });

      expect(activity!.averageHeartrate).toBeNull();
      expect(activity!.maxHeartrate).toBeNull();
    });

    it('sends a Bearer token and pagination params, including after', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await makeClient().listActivities('the-token', { page: 2, perPage: 100, after: 1700000000 });

      const [url, options] = fetchMock.mock.calls[0]!;
      expect(url).toBe(
        'https://www.strava.com/api/v3/athlete/activities?page=2&per_page=100&after=1700000000',
      );
      expect(options.headers.Authorization).toBe('Bearer the-token');
    });

    it('omits after when not provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await makeClient().listActivities('t', { page: 1, perPage: 200 });

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://www.strava.com/api/v3/athlete/activities?page=1&per_page=200');
    });

    it('throws when Strava returns a non-2xx status', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: 'Rate Limit Exceeded' }, { ok: false, status: 429 }),
      );
      await expect(makeClient().listActivities('t', { page: 1, perPage: 200 })).rejects.toThrow(
        /429/,
      );
    });

    it('throws when an activity has an invalid shape (boundary validation)', async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ ...stravaActivity, distance: 'far' }]));
      await expect(makeClient().listActivities('t', { page: 1, perPage: 200 })).rejects.toThrow();
    });
  });
});
