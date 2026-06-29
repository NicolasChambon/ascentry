import { apiFetch } from '@/lib/api';
import { StravaStatus, stravaStatusSchema } from '@ascentry/shared';

export async function getStravaStatus(): Promise<StravaStatus> {
  const data = await apiFetch('/strava/status');
  return stravaStatusSchema.parse(data);
}

export async function disconnectStrava(): Promise<void> {
  await apiFetch('/strava/connection', { method: 'DELETE' });
}

export function connectStrava(): void {
  window.location.assign('/api/strava/connect');
}
