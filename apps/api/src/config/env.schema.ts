import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),

  STRAVA_CLIENT_ID: z.coerce.number().int().positive(),
  STRAVA_CLIENT_SECRET: z.string().min(1),
  STRAVA_REDIRECT_URI: z.url(),
  STRAVA_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'STRAVA_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)',
    }),
});

export type Env = z.infer<typeof envSchema>;
