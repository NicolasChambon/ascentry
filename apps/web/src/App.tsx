import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@ascentry/shared';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

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

  return (
    <main>
      <h1>Ascentry</h1>
      <p>API health : {health ? health.status : 'loading...'}</p>
    </main>
  );
}
