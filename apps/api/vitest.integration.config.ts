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
