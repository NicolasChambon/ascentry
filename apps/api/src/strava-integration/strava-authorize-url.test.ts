import { describe, expect, it } from 'vitest';
import { buildStravaAuthorizeUrl } from './strava-authorize-url';

describe('buildStravaAuthorizeUrl', () => {
  it('builds the authorize URL with all required OAuth params', () => {
    const url = new URL(
      buildStravaAuthorizeUrl({
        clientId: '12345',
        redirectUri: 'https://app.example/api/strava/callback',
        state: 'nonce-abc',
      }),
    );

    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('12345');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example/api/strava/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
    expect(url.searchParams.get('state')).toBe('nonce-abc');
    expect(url.searchParams.get('approval_prompt')).toBe('auto');
  });
});
