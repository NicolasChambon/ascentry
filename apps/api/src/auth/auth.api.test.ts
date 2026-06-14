import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';
import { PrismaService } from '../prisma/prisma.service';

const prisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
};

const dbUser = {
  id: 'u1',
  email: 'example@email.com',
  emailVerified: false,
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth API (mocked Prisma)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    dbUser.passwordHash = await argon2.hash('correct-password');

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })],
      controllers: [AuthController],
      providers: [
        PasswordService,
        SessionService,
        SessionGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.create.mockResolvedValue({});
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('POST /api/auth/register → 201, httpOnly cookie, no passwordHash in body', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(dbUser);

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'example@email.com', password: 'longenough' })
      .expect(201);

    expect(res.body).toEqual({
      id: 'u1',
      email: 'example@email.com',
      emailVerified: false,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('POST /api/auth/register → 409 when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'example@email.com', password: 'longenough' })
      .expect(409);
  });

  it('POST /api/auth/login → 200, with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'example@email.com', password: 'correct-password' })
      .expect(200);
  });

  it('POST /api/auth/login → 401 with wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'example@email.com', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /api/auth/login → 401 with unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@email.com', password: 'whatever' })
      .expect(401);
  });

  it('GET /api/me → 200 with a valid session cookie', async () => {
    prisma.session.findUnique.mockResolvedValue({
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', ['session=any-token'])
      .expect(200);

    expect(res.body).toEqual({ id: 'u1', email: 'example@email.com', emailVerified: false });
  });

  it('GET /api/me → 401 without a cookie', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('GET /api/me → 401 when the session is unknown/expired', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', ['session=any-token'])
      .expect(401);
  });

  it('POST /api/auth/logout → 204 and clears the cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', ['session=any-token'])
      .expect(204);

    expect(prisma.session.deleteMany).toHaveBeenCalled();
    expect(String(res.headers['set-cookie'])).toMatch(/session=;|Expires=Thu, 01 Jan 1970/i);
  });
});
