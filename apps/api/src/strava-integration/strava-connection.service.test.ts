import { describe, expect, it, vi } from 'vitest';
import { StravaConnectionService } from './strava-connection.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';

const makeService = () => {
  const prisma = {
    stravaConnection: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const encryption = {
    encrypt: vi.fn((value: string, aad: string) => `enc(${value}|${aad})`),
    decrypt: vi.fn((value: string, aad: string) => `dec(${value}|${aad})`),
  };
  const stravaClient = {
    exchangeCode: vi.fn(),
    refreshTokens: vi.fn(),
    listActivities: vi.fn(),
  };
  const service = new StravaConnectionService(
    prisma as unknown as PrismaService,
    encryption as unknown as EncryptionService,
    stravaClient,
  );
  return { service, prisma, encryption, stravaClient };
};

describe('StravaConnectionService', () => {
  describe('getStatus', () => {
    it('returns connected:false when there is no connection', async () => {
      const { service, prisma } = makeService();
      prisma.stravaConnection.findUnique.mockResolvedValue(null);

      expect(await service.getStatus('user-1')).toEqual({ connected: false });
    });

    it('maps the row to a connected status (number athleteId, split scopes, ISO expiry)', async () => {
      const { service, prisma } = makeService();

      prisma.stravaConnection.findUnique.mockResolvedValue({
        stravaAthleteId: 42n,
        scope: 'read,activity:read_all',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      });

      expect(await service.getStatus('user-1')).toEqual({
        connected: true,
        athleteId: 42,
        scopes: ['read', 'activity:read_all'],
        expiresAt: '2030-01-01T00:00:00.000Z',
      });
    });

    it('maps an empty scope to an empty scopes array', async () => {
      const { service, prisma } = makeService();
      prisma.stravaConnection.findUnique.mockResolvedValue({
        stravaAthleteId: 7n,
        scope: '',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      });

      expect(await service.getStatus('user-1')).toEqual({
        connected: true,
        athleteId: 7,
        scopes: [],
        expiresAt: '2030-01-01T00:00:00.000Z',
      });
    });
  });

  describe('deleteConnection', () => {
    it('deletes the connection by userId via idempotent deleteMany', async () => {
      const { service, prisma } = makeService();
      await service.deleteConnection('user-1');

      expect(prisma.stravaConnection.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
