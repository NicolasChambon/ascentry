import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { STRAVA_CLIENT, type StravaClient, StravaCredentials } from './strava.client';
import { StravaStatus } from '@ascentry/shared';

const REFRESH_SKEW_MS = 60 * 1000;

@Injectable()
export class StravaConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(STRAVA_CLIENT) private readonly stravaClient: StravaClient,
  ) {}

  async getStatus(userId: string): Promise<StravaStatus> {
    const connection = await this.prisma.stravaConnection.findUnique({
      where: { userId },
    });

    if (connection == null) {
      return { connected: false };
    }

    return {
      connected: true,
      athleteId: Number(connection.stravaAthleteId),
      scopes: connection.scope === '' ? [] : connection.scope.split(','),
      expiresAt: connection.expiresAt.toISOString(),
    };
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const connection = await this.prisma.stravaConnection.findUnique({
      where: { userId },
    });

    if (connection == null) {
      throw new NotFoundException('No Strava connection for this user');
    }

    const stillValid = connection.expiresAt.getTime() > Date.now() + REFRESH_SKEW_MS;
    if (stillValid) {
      return this.encryption.decrypt(connection.accessToken, `${userId}:access`);
    }

    const currentRefresh = this.encryption.decrypt(connection.refreshToken, `${userId}:refresh`);
    const tokens = await this.stravaClient.refreshTokens(currentRefresh);

    await this.prisma.stravaConnection.update({
      where: { userId },
      data: {
        accessToken: this.encryption.encrypt(tokens.accessToken, `${userId}:access`),
        refreshToken: this.encryption.encrypt(tokens.refreshToken, `${userId}:refresh`),
        expiresAt: tokens.expiresAt,
      },
    });

    return tokens.accessToken;
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.prisma.stravaConnection.deleteMany({ where: { userId } });
  }

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
