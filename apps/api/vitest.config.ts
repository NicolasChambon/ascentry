import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    env: {
      // AppModule validate the env at boot (ConfigModule). Prisma is mocked in
      // API tests → this URL is never used, only validated.
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
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
