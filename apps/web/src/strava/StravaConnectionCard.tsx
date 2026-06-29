import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useStravaStatus } from './useStravaStatus';
import { connectStrava, disconnectStrava } from './strava.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export function StravaConnectionCard() {
  const status = useStravaStatus();
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: disconnectStrava,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['strava-status'] });
      toast.success('Compte Strava déconnecté');
    },
    onError: () => {
      toast.error('La déconnexion a échoué');
    },
  });

  const description = status.isPending
    ? 'Vérification de la connexion…'
    : status.isError
      ? 'Statut Strava indisponible pour le moment.'
      : status.data.connected
        ? 'Ton compte Strava est connecté.'
        : 'Connecte ton compte Strava pour synchroniser tes activités.';

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Strava</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {status.isPending && <Spinner className="text-muted-foreground" />}
        {status.isError && (
          <p className="text-destructive">Impossible de charger le statut Strava.</p>
        )}
        {status.isSuccess && !status.data.connected && (
          <Button
            onClick={() => {
              connectStrava();
            }}
          >
            Connecter Strava
          </Button>
        )}
        {status.isSuccess && status.data.connected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={disconnectMutation.isPending}>
                Déconnecter Strava
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Déconnecter Strava ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tu devras réautoriser l'accès pour reconnecter ton compte plus tard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    disconnectMutation.mutate();
                  }}
                >
                  Déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
