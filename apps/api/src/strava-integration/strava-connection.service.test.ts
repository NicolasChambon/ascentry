import { describe, expect, it, vi } from 'vitest';
import { StravaConnectionService } from './strava-connection.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';

const makeService = () => {
  const prisma = {
    stravaConnection: {
      upsert: vi.fn(),
    },
  };
  const encryption = {
    encrypt: vi.fn((value: string, aad: string) => `enc(${value}|${aad})`),
  };
  const service = new StravaConnectionService(
    prisma as unknown as PrismaService,
    encryption as unknown as EncryptionService,
  );
  return { service, prisma, encryption };
};

const credentials = {
  accessToken: 'acc',
  refreshToken: 'ref',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  athleteId: 42,
};

describe('StravaConnectionService', () => {
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
