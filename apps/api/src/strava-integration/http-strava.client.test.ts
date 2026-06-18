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

describe('HttpStravaClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchangeCode() maps the Strava response to StravaCredentials', async () => {
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

  it('exchangeCode() posts the auth-code grant with client credentials', async () => {
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

  it('refreshTokens() maps the response and needs no athlete', async () => {
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
