import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StravaIntegrationModule } from './strava-integration/strava-integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport:
            config.get('NODE_ENV', { infer: true }) !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: false,
                    ignore: 'pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers',
                  },
                }
              : undefined,
        },
      }),
    }),

    PrismaModule,
    HealthModule,
    AuthModule,
    StravaIntegrationModule,
  ],
})
export class AppModule {}
