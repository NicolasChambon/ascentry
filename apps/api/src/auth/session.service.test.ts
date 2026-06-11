import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';
import { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

describe('SessionService', () => {
  let prisma: {
    session: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: SessionService;

  beforeEach(() => {
    prisma = {
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    const config = {
      get: vi.fn().mockReturnValue(30),
    };

    service = new SessionService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService<Env, true>,
    );
  });

  it('create() stores the sha256 of the token, never the raw token', async () => {
    const { token, expiresAt } = await service.create('user-1');

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        hashedToken: sha256(token),
        userId: 'user-1',
        expiresAt,
      },
    });

    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('validate() returns the userId for a live session', async () => {
    prisma.session.findUnique.mockResolvedValue({
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.validate('any-token')).resolves.toEqual({ userId: 'user-1' });
  });

  it('validate() returns null for an unknown token', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    await expect(service.validate('nope')).resolves.toBeNull();
  });

  it('validate() returns null for an expired session', async () => {
    prisma.session.findUnique.mockResolvedValue({
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(service.validate('stale')).resolves.toBeNull();
  });

  it('revoke() deletes by hashed token and is idempotent', async () => {
    await service.revoke('some-token');
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { hashedToken: sha256('some-token') },
    });
  });
});
