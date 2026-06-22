import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { StravaCredentials } from './strava.client';

@Injectable()
export class StravaConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async saveConnection(
    userId: string,
    credentials: StravaCredentials,
    scope: string,
  ): Promise<void> {
    const accessToken = this.encryption.encrypt(credentials.accessToken, `${userId}:access`);
    const refreshToken = this.encryption.encrypt(credentials.refreshToken, `${userId}:refresh`);

    const data = {
      stravaAthleteId: BigInt(credentials.athleteId),
      accessToken,
      refreshToken,
      expiresAt: credentials.expiresAt,
      scope,
    };

    await this.prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }
}
