import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { STRAVA_CLIENT } from './strava.client';
import { HttpStravaClient } from './http-strava.client';
import { StravaConnectionService } from './strava-connection.service';
import { AuthModule } from '../auth/auth.module';
import { StravaController } from './strava.controller';

@Module({
  imports: [AuthModule],
  controllers: [StravaController],
  providers: [
    EncryptionService,
    { provide: STRAVA_CLIENT, useClass: HttpStravaClient },
    StravaConnectionService,
  ],
  exports: [EncryptionService, STRAVA_CLIENT, StravaConnectionService],
})
export class StravaIntegrationModule {}
