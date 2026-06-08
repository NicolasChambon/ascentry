import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env.schema';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ZodValidationPipe());

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });

  app.setGlobalPrefix('api');

  app.enableShutdownHooks();

  await app.listen(port);

  app.get(Logger).log(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
