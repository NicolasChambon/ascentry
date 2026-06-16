import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from './lib/api';
import { SubmitEvent, useState } from 'react';
import { login, register } from './auth/auth.api';
import { Button } from './components/ui/button';
import { loginSchema, registerSchema } from '@ascentry/shared';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { PageShell } from './components/PageShell';
import { Spinner } from './components/ui/spinner';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <PageShell>
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-xl">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: forrest.gump@me.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setShowPassword((v) => !v);
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute top-1/2 right-1 -mt-3.5 text-muted-foreground"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {formError !== null && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Button
        variant="link"
        type="button"
        className="text-muted-foreground"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'register' : 'login'));
          setFormError(null);
        }}
      >
        {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </Button>
    </PageShell>
  );
}
