import { STRAVA_AUTHORIZE_URL, STRAVA_SCOPES } from './strava.constants';

export function buildStravaAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPES,
    state: params.state,
  });

  return `${STRAVA_AUTHORIZE_URL}?${query.toString()}`;
}
