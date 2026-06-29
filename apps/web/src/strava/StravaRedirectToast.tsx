import { useEffect } from 'react';
import { notifyStravaRedirect } from './notifyStravaRedirect';

export function StravaRedirectToast(): null {
  useEffect(() => {
    notifyStravaRedirect();
  }, []);

  return null;
}
