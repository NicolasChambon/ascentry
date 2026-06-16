import { useMe } from './auth/useMe';
import { AuthScreen } from './AuthScreen';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from './auth/auth.api';
import { Button } from './components/ui/button';
import { PageShell } from './components/PageShell';

export function App() {
  const me = useMe();
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  if (me.isPending) {
    return <Centered>Chargement...</Centered>;
  }
  if (me.isError) {
    return <Centered>Erreur de connexion au serveur</Centered>;
  }
  if (!me.data) {
    return <AuthScreen />;
  }

  return (
    <PageShell>
      <p className="text-muted-foreground">{`Connecté : ${me.data.email}`}</p>
      <Button
        onClick={() => {
          logoutMutation.mutate();
        }}
        disabled={logoutMutation.isPending}
      >
        Se déconnecter
      </Button>
    </PageShell>
  );
}

function Centered({ children }: { children: string }) {
  return (
    <PageShell>
      <p className="text-muted-foreground">{children}</p>
    </PageShell>
  );
}
