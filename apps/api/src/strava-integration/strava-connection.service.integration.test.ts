import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTestDatabase, truncateAll, type TestDatabase } from '../testing/postgres-container';
import { StravaConnectionService } from './strava-connection.service';
import { EncryptionService } from './encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import type { StravaClient } from './strava.client';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

const KEY_B64 = Buffer.alloc(32, 7).toString('base64');

const makeEncryption = () => {
  const config = { get: vi.fn().mockReturnValue(KEY_B64) };
  return new EncryptionService(config as unknown as ConfigService<Env, true>);
};

const noopStravaClient: StravaClient = {
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

  const makeService = (stravaClient: StravaClient = noopStravaClient) => {
    const encryption = makeEncryption();
    const service = new StravaConnectionService(
      db.prisma as unknown as PrismaService,
      encryption,
      stravaClient,
    );
    return { service, encryption };
  };

  const createUser = () =>
    db.prisma.user.create({ data: { email: 'rider@example.com', passwordHash: 'hash' } });

  describe('saveConnection', () => {
    it('persists an encrypted connection round-trip against a real Postgres', async () => {
      const { service, encryption } = makeService();
      const user = await createUser();

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
      const { service, encryption } = makeService();
      const user = await createUser();

      await service.saveConnection(user.id, credentials, 'read');

      const reconnected = {
        accessToken: 'acc2',
        refreshToken: 'ref2',
        expiresAt: new Date('2031-01-01T00:00:00Z'),
        athleteId: 42,
      };
      await service.saveConnection(user.id, reconnected, 'read,activity:read_all');

      const rows = await db.prisma.stravaConnection.findMany({ where: { userId: user.id } });

      expect(rows).toHaveLength(1);
      expect(rows[0]!.scope).toBe('read,activity:read_all');
      expect(rows[0]!.expiresAt).toEqual(reconnected.expiresAt);
      expect(encryption.decrypt(rows[0]!.accessToken, `${user.id}:access`)).toBe('acc2');
    });
  });

  describe('getValidAccessToken', () => {
    const connect = (service: StravaConnectionService, userId: string, expiresAt: Date) =>
      service.saveConnection(
        userId,
        { accessToken: 'stored-acc', refreshToken: 'stored-ref', expiresAt, athleteId: 42 },
        'read',
      );

    it('returns the stored access token without refreshing when still valid', async () => {
      const refreshTokens = vi.fn();
      const { service } = makeService({
        exchangeCode: vi.fn(),
        listActivities: vi.fn(),
        refreshTokens,
      });
      const user = await createUser();
      await connect(service, user.id, new Date(Date.now() + 60 * 60 * 1000));

      const token = await service.getValidAccessToken(user.id);

      expect(token).toBe('stored-acc');
      expect(refreshTokens).not.toHaveBeenCalled();
    });

    it('refreshes and re-persists the rotated pair when expired', async () => {
      const refreshTokens = vi.fn().mockResolvedValue({
        accessToken: 'fresh-acc',
        refreshToken: 'fresh-ref',
        expiresAt: new Date('2031-01-01T00:00:00Z'),
      });
      const { service, encryption } = makeService({
        exchangeCode: vi.fn(),
        listActivities: vi.fn(),
        refreshTokens,
      });
      const user = await createUser();
      await connect(service, user.id, new Date(Date.now() - 1000));

      const token = await service.getValidAccessToken(user.id);

      expect(token).toBe('fresh-acc');
      expect(refreshTokens).toHaveBeenCalledWith('stored-ref');
      const row = await db.prisma.stravaConnection.findUnique({ where: { userId: user.id } });
      expect(encryption.decrypt(row!.refreshToken, `${user.id}:refresh`)).toBe('fresh-ref');
      expect(row!.expiresAt).toEqual(new Date('2031-01-01T00:00:00Z'));
    });

    it('serializes concurrent refreshes: two simultaneous callers trigger only one Strava refresh', async () => {
      let refreshCalls = 0;
      const refreshTokens = vi.fn(async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100)); // hold the lock, widen the window
        return {
          accessToken: 'fresh-acc',
          refreshToken: 'fresh-ref',
          expiresAt: new Date('2031-01-01T00:00:00Z'),
        };
      });
      const { service } = makeService({
        exchangeCode: vi.fn(),
        listActivities: vi.fn(),
        refreshTokens,
      });
      const user = await createUser();
      await connect(service, user.id, new Date(Date.now() - 1000));

      const [first, second] = await Promise.all([
        service.getValidAccessToken(user.id),
        service.getValidAccessToken(user.id),
      ]);

      expect(refreshCalls).toBe(1); // FOR UPDATE made the 2nd caller wait and reuse the rotated token
      expect(first).toBe('fresh-acc');
      expect(second).toBe('fresh-acc');
    });
  });
});
