import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@ascentry/shared';
import { Button } from './components/ui/button';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/health', { signal: controller.signal })
      .then(async (res) => {
        const data: unknown = await res.json();
        setHealth(healthResponseSchema.parse(data));
      })
      .catch((err: unknown) => {
        console.error('Health check échoué', err);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const handleClick = () => {
    setCount((c) => c + 1);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <h1 className="text-4xl font-bold text-slate-800">Ascentry</h1>
      <p className="text-slate-600">API health : {health ? health.status : 'chargement…'}</p>
      <p className="text-slate-600">Test prod</p>
      <Button onClick={handleClick}>Count: {count}</Button>
    </main>
  );
}
