import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Container boot + `migrate deploy` (image pull on first run) is slow.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    env: {
      // Ryuk (testcontainers' cleanup sidecar) spins up its OWN container to reap
      // leftovers — and it hits the same limitation as ours: Docker Desktop under
      // WSL doesn't publish daemon-assigned ephemeral ports, so Ryuk hangs on boot.
      // Disabled → afterAll's container.stop() handles teardown. Tradeoff: a
      // hard-killed local run leaks the Postgres container (clean up: docker rm -f).
      TESTCONTAINERS_RYUK_DISABLED: 'true',
    },
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
