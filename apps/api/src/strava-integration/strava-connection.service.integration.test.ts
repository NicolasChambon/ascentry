import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTestDatabase, truncateAll, type TestDatabase } from '../testing/postgres-container';
import { StravaConnectionService } from './strava-connection.service';
import { EncryptionService } from './encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

const KEY_B64 = Buffer.alloc(32, 7).toString('base64');

const makeEncryption = () => {
  const config = { get: vi.fn().mockReturnValue(KEY_B64) };
  return new EncryptionService(config as unknown as ConfigService<Env, true>);
};

const stravaClientStub = {
  exchangeCode: vi.fn(),
  refreshTokens: vi.fn(),
  listActivities: vi.fn(),
};

const credentials = {
  accessToken: 'acc',
  refreshToken: 'ref',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  athleteId: 42,
};

describe('StravaConnectionService (integration)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  });

  afterAll(async () => {
    await db.stop();
  });

  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  it('persists an encrypted connection round-trip against a real Postgres', async () => {
    const encryption = makeEncryption();
    const service = new StravaConnectionService(
      db.prisma as unknown as PrismaService,
      encryption,
      stravaClientStub,
    );

    const user = await db.prisma.user.create({
      data: { email: 'rider@example.com', passwordHash: 'hash' },
    });

    await service.saveConnection(user.id, credentials, 'read,activity:read_all');

    const row = await db.prisma.stravaConnection.findUnique({ where: { userId: user.id } });

    expect(row).not.toBeNull();
    expect(row!.stravaAthleteId).toBe(42n);
    expect(row!.scope).toBe('read,activity:read_all');
    expect(row!.expiresAt).toEqual(credentials.expiresAt);

    expect(row!.accessToken).not.toBe('acc');
    expect(encryption.decrypt(row!.accessToken, `${user.id}:access`)).toBe('acc');
    expect(encryption.decrypt(row!.refreshToken, `${user.id}:refresh`)).toBe('ref');
  });

  it('updates the existing row when the same user reconnects (upsert update path)', async () => {
    const encryption = makeEncryption();
    const service = new StravaConnectionService(
      db.prisma as unknown as PrismaService,
      encryption,
      stravaClientStub,
    );

    const user = await db.prisma.user.create({
      data: { email: 'rider@example.com', passwordHash: 'hash' },
    });

    await service.saveConnection(user.id, credentials, 'read');

    const reconnected = {
      accessToken: 'acc2',
      refreshToken: 'ref2',
      expiresAt: new Date('2031-01-01T00:00:00Z'),
      athleteId: 42,
    };
    await service.saveConnection(user.id, reconnected, 'read,activity:read_all');

    const rows = await db.prisma.stravaConnection.findMany({ where: { userId: user.id } });

    expect(rows).toHaveLength(1); // upsert updated in place, no duplicate row
    expect(rows[0]!.scope).toBe('read,activity:read_all');
    expect(rows[0]!.expiresAt).toEqual(reconnected.expiresAt);
    expect(encryption.decrypt(rows[0]!.accessToken, `${user.id}:access`)).toBe('acc2');
  });
});
