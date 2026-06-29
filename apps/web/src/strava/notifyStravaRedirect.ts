import { toast } from 'sonner';

export function notifyStravaRedirect(): void {
  const strava = new URLSearchParams(window.location.search).get('strava');

  if (strava === null) {
    return;
  }

  window.history.replaceState({}, '', window.location.pathname);

  if (strava === 'connected') {
    toast.success('Compte Strava connecté');
  } else if (strava === 'denied') {
    toast.error('Connexion à Strava refusée');
  } else if (strava === 'already_linked') {
    toast.error('Ce compte Strava est déjà lié à un autre utilisateur');
  }
}
