import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env.schema';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ZodValidationPipe());

  app.use(cookieParser());

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  const port = config.get('PORT', { infer: true });

  app.setGlobalPrefix('api');

  app.enableShutdownHooks();

  await app.listen(port);

  app.get(Logger).log(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
