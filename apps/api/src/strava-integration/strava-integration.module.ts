import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { STRAVA_CLIENT } from './strava.client';
import { HttpStravaClient } from './http-strava.client';

@Module({
  providers: [EncryptionService, { provide: STRAVA_CLIENT, useClass: HttpStravaClient }],
  exports: [EncryptionService, STRAVA_CLIENT],
})
export class StravaIntegrationModule {}
