import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StravaController } from './strava.controller';
import { ConfigService } from '@nestjs/config';
import { STRAVA_CLIENT } from './strava.client';
import { StravaConnectionService } from './strava-connection.service';
import { AuthRequest, SessionGuard } from '../auth/session.guard';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const config = {
  get: (key: string) =>
    ({
      NODE_ENV: 'test',
      STRAVA_CLIENT_ID: 12345,
      STRAVA_REDIRECT_URI: 'https://app.example/api/strava/callback',
      WEB_ORIGIN: 'https://app.example',
    })[key],
};

describe('Strava API (fake client + mocked connection service)', () => {
  let app: INestApplication;
  const stravaClient = {
    exchangeCode: vi.fn(),
    refreshTokens: vi.fn(),
  };
  const connectionService = {
    saveConnection: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StravaController],
      providers: [
        { provide: ConfigService, useValue: config },
        { provide: STRAVA_CLIENT, useValue: stravaClient },
        { provide: StravaConnectionService, useValue: connectionService },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<AuthRequest>().userId = 'user-1';
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const startConnect = async () => {
    const res = await request(app.getHttpServer()).get('/api/strava/connect');
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const stateCookie = setCookie
      .find((cookie) => cookie.startsWith('strava_oauth_state='))!
      .split(';')[0]!;
    const location = res.headers['location']!;
    const state = new URL(location).searchParams.get('state')!;
    return { res, state, stateCookie };
  };

  it('GET /api/strava/connect → 302 to Strava, with state both in the URL and the cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/strava/connect');

    expect(res.status).toBe(302);
    const url = new URL(res.headers['location']!);

    expect(`${url.origin}${url.pathname}`).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('12345');
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const cookieValue = setCookie
      .find((cookie) => cookie.startsWith('strava_oauth_state='))!
      .split('=')[1]!
      .split(';')[0]!;

    expect(url.searchParams.get('state')).toBe(cookieValue);
  });

  it('GET /api/strava/callback with a valid state → exchanges, saves, redirects connected', async () => {
    const { stateCookie, state } = await startConnect();
    stravaClient.exchangeCode.mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      expiresAt: new Date('2030-01-01'),
      athleteId: 42,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/strava/callback?state=${state}&code=the-code&scope=read,activity:read_all`)
      .set('Cookie', stateCookie);

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('https://app.example?strava=connected');
    expect(stravaClient.exchangeCode).toHaveBeenCalledWith('the-code');
    expect(connectionService.saveConnection).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        athleteId: 42,
      }),
      'read,activity:read_all',
    );
  });

  it('GET /api/strava/callback with a mismatched state → 403, no exchange', async () => {
    const { stateCookie } = await startConnect();

    const res = await request(app.getHttpServer())
      .get('/api/strava/callback?state=forged&code=x')
      .set('Cookie', stateCookie);

    expect(res.status).toBe(403);
    expect(stravaClient.exchangeCode).not.toHaveBeenCalled();
  });

  it('GET /api/strava/callback when the user denied (error param) → redirect declined, no exchange', async () => {
    const { stateCookie, state } = await startConnect();

    const res = await request(app.getHttpServer())
      .get(`/api/strava/callback?state=${state}&error=access_denied`)
      .set('Cookie', stateCookie);

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('https://app.example?strava=denied');
    expect(stravaClient.exchangeCode).not.toHaveBeenCalled();
  });

  it('GET /api/strava/callback when the athlete is already linked (P2002) → redirect already_linked', async () => {
    const { stateCookie, state } = await startConnect();

    stravaClient.exchangeCode.mockResolvedValue({
      accessToken: 'a',
      refresh_token: 'r',
      expiresAt: new Date('2030-01-01'),
      athleteId: 42,
    });
    connectionService.saveConnection.mockRejectedValue({
      code: 'P2002',
    });

    const res = await request(app.getHttpServer())
      .get(`/api/strava/callback?state=${state}&code=the-code&scope=read`)
      .set('Cookie', stateCookie);

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('https://app.example?strava=already_linked');
  });
});
