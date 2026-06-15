import { useMe } from './auth/useMe';
import type { ReactNode } from 'react';
import { AuthScreen } from './AuthScreen';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from './auth/auth.api';
import { Button } from './components/ui/button';

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 text-slate-800">
      <h1 className="text-4xl font-bold">Ascentry</h1>
      <p className="text-slate-600">{`Connecté : ${me.data.email}`}</p>
      <Button
        onClick={() => {
          logoutMutation.mutate();
        }}
        disabled={logoutMutation.isPending}
      >
        Se déconnecter
      </Button>
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 text-slate-800">
      <h1 className="text-4xl font-bold">Ascentry</h1>
      <p className="text-slate-600">{children}</p>
    </main>
  );
}
