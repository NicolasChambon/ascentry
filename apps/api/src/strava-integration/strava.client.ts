export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface StravaCredentials extends StravaTokens {
  athleteId: number;
}

export interface StravaActivity {
  stravaActivityId: number;
  name: string;
  sportType: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  startDate: Date;
  startDateLocal: Date;
  timezone: string;
  averageSpeed: number;
  maxSpeed: number;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  kudosCount: number;
  photoCount: number;
}

export interface ListActivitiesParams {
  page: number;
  perPage: number;
  after?: number;
}

export interface StravaClient {
  exchangeCode(code: string): Promise<StravaCredentials>;
  refreshTokens(refreshToken: string): Promise<StravaTokens>;
  listActivities(accessToken: string, params: ListActivitiesParams): Promise<StravaActivity[]>;
}

export const STRAVA_CLIENT = Symbol('STRAVA_CLIENT');
