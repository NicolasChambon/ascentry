import { ApiError, apiFetch } from '@/lib/api';
import { PublicUser, publicUserSchema } from '@ascentry/shared';
import { useQuery } from '@tanstack/react-query';

async function fetchMe(): Promise<PublicUser | null> {
  try {
    const data = await apiFetch('/me');
    return publicUserSchema.parse(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
}
