import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGOTITHM = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const keyBase64 = config.get('STRAVA_TOKEN_ENCRYPTION_KEY', { infer: true });
    this.key = Buffer.from(keyBase64, 'base64');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGOTITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, ciphertext].map((part) => part.toString('base64')).join(':');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (ivB64 === undefined || tagB64 === undefined || dataB64 === undefined) {
      throw new Error('Invalid encrypted payload format');
    }

    const decipher = createDecipheriv(ALGOTITHM, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
