import { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
      <h1 className="text-4xl font-bold">Ascentry</h1>
      {children}
    </main>
  );
}
