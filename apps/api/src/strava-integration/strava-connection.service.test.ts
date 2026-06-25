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
  };
  const service = new StravaConnectionService(
    prisma as unknown as PrismaService,
    encryption as unknown as EncryptionService,
    stravaClient,
  );
  return { service, prisma, encryption, stravaClient };
};

const credentials = {
  accessToken: 'acc',
  refreshToken: 'ref',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  athleteId: 42,
};

describe('StravaConnectionService', () => {
  describe('saveConnection', () => {
    it('encrypts each token with a per-field AAD bound to the user ID', async () => {
      const { service, encryption } = makeService();
      await service.saveConnection('user-1', credentials, 'read,activity:read_all');

      expect(encryption.encrypt).toHaveBeenCalledWith('acc', 'user-1:access');
      expect(encryption.encrypt).toHaveBeenCalledWith('ref', 'user-1:refresh');
    });

    it('upserts by userId with encrypted tokens and a BigInt athleteId', async () => {
      const { service, prisma } = makeService();
      await service.saveConnection('user-1', credentials, 'read');

      const data = {
        stravaAthleteId: 42n,
        accessToken: 'enc(acc|user-1:access)',
        refreshToken: 'enc(ref|user-1:refresh)',
        expiresAt: credentials.expiresAt,
        scope: 'read',
      };

      expect(prisma.stravaConnection.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: {
          userId: 'user-1',
          ...data,
        },
        update: data,
      });
    });
  });

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

  describe('getValidAccessToken', () => {
    it('throws when the user has no connection', async () => {
      const { service, prisma } = makeService();
      prisma.stravaConnection.findUnique.mockResolvedValue(null);

      await expect(service.getValidAccessToken('user-1')).rejects.toThrow();
    });

    it('returns the decrypted access token without refreshing when still valid', async () => {
      const { service, prisma, encryption, stravaClient } = makeService();
      prisma.stravaConnection.findUnique.mockResolvedValue({
        accessToken: 'cipher-acc',
        refreshToken: 'cipher-ref',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const token = await service.getValidAccessToken('user-1');

      expect(token).toBe('dec(cipher-acc|user-1:access)');
      expect(encryption.decrypt).toHaveBeenCalledWith('cipher-acc', 'user-1:access');
      expect(stravaClient.refreshTokens).not.toHaveBeenCalled();
      expect(prisma.stravaConnection.update).not.toHaveBeenCalled();
    });

    it('refreshes with the decrypted refresh token, re-persists the rotated pair, and returns the new access token', async () => {
      const { service, prisma, stravaClient } = makeService();
      prisma.stravaConnection.findUnique.mockResolvedValue({
        accessToken: 'cipher-acc',
        refreshToken: 'cipher-ref',
        expiresAt: new Date(Date.now() - 1000),
      });
      const newExpiry = new Date('2030-06-01T00:00:00Z');
      stravaClient.refreshTokens.mockResolvedValue({
        accessToken: 'new-acc',
        refreshToken: 'new-ref',
        expiresAt: newExpiry,
      });

      const token = await service.getValidAccessToken('user-1');

      expect(stravaClient.refreshTokens).toHaveBeenCalledWith('dec(cipher-ref|user-1:refresh)');
      expect(prisma.stravaConnection.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          accessToken: 'enc(new-acc|user-1:access)',
          refreshToken: 'enc(new-ref|user-1:refresh)',
          expiresAt: newExpiry,
        },
      });
      expect(token).toBe('new-acc');
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
