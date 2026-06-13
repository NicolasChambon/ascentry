import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema';
import type { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { AuthRequest } from './session.guard';

const dbUser = {
  id: 'u1',
  email: 'example@email.com',
  emailVerified: false,
  passwordHash: 'stored-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthController', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let passwordService: {
    hash: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let sessionService: {
    create: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  let res: {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
  let controller: AuthController;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    passwordService = {
      hash: vi.fn(),
      verify: vi.fn(),
    };
    sessionService = {
      create: vi
        .fn()
        .mockResolvedValue({ token: 'raw-token', expiresAt: new Date(Date.now() + 60_000) }),
      revoke: vi.fn(),
    };
    res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };
    const config = {
      get: vi.fn().mockReturnValue('development'),
    };
    controller = new AuthController(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      sessionService as unknown as SessionService,
      config as unknown as ConfigService<Env, true>,
    );
  });

  it('register: hashes, creates the user, opens a session, returns the public user (no passwordHash)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('argon2-hash');
    prisma.user.create.mockResolvedValue({
      ...dbUser,
      passwordHash: 'argon2-hash',
    });

    const result = await controller.register(
      {
        email: 'ExAmple@email.com',
        password: 'longenough',
      },
      res as unknown as Response,
    );

    expect(passwordService.hash).toHaveBeenCalledWith('longenough');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'example@email.com', // normalized email
        passwordHash: 'argon2-hash',
      },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'raw-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      }),
    );
    expect(result).toEqual({
      id: 'u1',
      email: 'example@email.com',
      emailVerified: false,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('login: sets the cookie and returns the public user on valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    passwordService.verify.mockResolvedValue(true);

    const result = await controller.login(
      {
        email: 'example@email.com',
        password: 'longenough',
      },
      res as unknown as Response,
    );

    expect(passwordService.verify).toHaveBeenCalledWith('stored-hash', 'longenough');
    expect(res.cookie).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'u1',
      email: 'example@email.com',
      emailVerified: false,
    });
  });

  it('login: throws 401 for an unknown (verify not even called)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      controller.login(
        {
          email: 'example@email.com',
          password: 'longenough',
        },
        res as unknown as Response,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('me: returns the public user for the authenticated request', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const result = await controller.me({ cookies: {}, userId: 'u1' } satisfies AuthRequest);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result).toEqual({
      id: 'u1',
      email: 'example@email.com',
      emailVerified: false,
    });
  });

  it('logout: revokes the session and clears the cookie', async () => {
    await controller.logout(
      { cookies: { session: 'raw-token' } } satisfies AuthRequest,
      res as unknown as Response,
    );

    expect(sessionService.revoke).toHaveBeenCalledWith('raw-token');
    expect(res.clearCookie).toHaveBeenCalledWith('session', { path: '/' });
  });
});
