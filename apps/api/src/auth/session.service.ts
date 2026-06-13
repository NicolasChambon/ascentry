import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const ttlDays = this.config.get('SESSION_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + ttlDays * MS_PER_DAY);

    await this.prisma.session.create({
      data: {
        hashedToken: this.hashToken(token),
        userId,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async validate(token: string): Promise<{ userId: string } | null> {
    const session = await this.prisma.session.findUnique({
      where: {
        hashedToken: this.hashToken(token),
      },
    });

    if (session == null || session.expiresAt <= new Date()) {
      return null;
    }

    return { userId: session.userId };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        hashedToken: this.hashToken(token),
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
