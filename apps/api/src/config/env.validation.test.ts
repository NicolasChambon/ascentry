import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults values on a minimal config', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      STRAVA_CLIENT_ID: '12345',
      STRAVA_CLIENT_SECRET: 'test-secret',
      STRAVA_REDIRECT_URI: 'http://localhost:3000/api/strava/callback',
      STRAVA_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.SESSION_TTL_DAYS).toBe(30);
  });

  it('fails if DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
