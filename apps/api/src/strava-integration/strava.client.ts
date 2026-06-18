export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface StravaCredentials extends StravaTokens {
  athleteId: number;
}

export interface StravaClient {
  exchangeCode(code: string): Promise<StravaCredentials>;
  refreshTokens(refreshToken: string): Promise<StravaTokens>;
}

export const STRAVA_CLIENT = Symbol('STRAVA_CLIENT');
