import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from './lib/api';
import { SubmitEvent, useState } from 'react';
import { login, register } from './auth/auth.api';
import { Button } from './components/ui/button';
import { loginSchema, registerSchema } from '@ascentry/shared';

type Mode = 'login' | 'register';

function toMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Email ou mot de passe incorrect.';
    if (err.status === 409) return 'Un compte existe déjà avec cet email.';
  }
  return 'Une erreur est survenue. Réessaie.';
}

export function AuthScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      mode === 'login' ? login(input) : register(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: unknown) => {
      setFormError(toMessage(err));
    },
  });

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    setFormError(null);
    const schema = mode === 'login' ? loginSchema : registerSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Saisie invalide.');
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 text-slate-800">
      <h1 className="text-4xl font-bold">Ascentry</h1>
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
        <h2 className="text-xl font-semibold">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h2>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          className="rounded border border-slate-300 px-3 py-2"
        />
        {formError !== null && <p className="text-sm text-red-600">{formError}</p>}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </Button>
      </form>
      <button
        type="button"
        className="text-sm text-slate-500 underline"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'register' : 'login'));
          setFormError(null);
        }}
      >
        {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </main>
  );
}
