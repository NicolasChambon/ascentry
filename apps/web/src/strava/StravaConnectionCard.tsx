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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Strava</CardTitle>
        <CardDescription>
          {status.data?.connected
            ? 'Ton compte Strava est connecté.'
            : 'Connecte ton compte Strava pour synchroniser tes activités.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status.isPending && <p className="text-muted-foreground">Chargement...</p>}
        {status.isError && (
          <p className="text-destructive">Impossible de charger le statut Strava.</p>
        )}
        {status.data?.connected === false && (
          <Button
            onClick={() => {
              connectStrava();
            }}
          >
            Connecter Strava
          </Button>
        )}
        {status.data?.connected === true && (
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
