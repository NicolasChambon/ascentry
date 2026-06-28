import { useQuery } from '@tanstack/react-query';
import { getStravaStatus } from './strava.api';

export function useStravaStatus() {
  return useQuery({
    queryKey: ['strava-status'],
    queryFn: getStravaStatus,
    retry: false,
  });
}
