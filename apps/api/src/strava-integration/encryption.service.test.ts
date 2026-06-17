import { describe, expect, it, vi } from 'vitest';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

const KEY_B64 = Buffer.alloc(32, 7).toString('base64');

const makeService = () => {
  const config = {
    get: vi.fn().mockReturnValue(KEY_B64),
  };
  return new EncryptionService(config as unknown as ConfigService<Env, true>);
};

describe('EncryptionService', () => {
  it('round-trips a value: decrypt(encrypt(x)) === x', () => {
    const service = makeService();
    const secret = 'strava-access-token-123';
    expect(service.decrypt(service.encrypt(secret))).toBe(secret);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const service = makeService();
    const a = service.encrypt('same');
    const b = service.encrypt('same');
    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe('same');
    expect(service.decrypt(b)).toBe('same');
  });

  it('never leaks the plaintext in the payload', () => {
    const service = makeService();
    expect(service.encrypt('top-secret')).not.toContain('top-secret');
  });

  it('rejects a tampered ciphertext (GCM authentication)', () => {
    const service = makeService();
    const [iv, tag, data] = service.encrypt('value').split(':');
    const bytes = Buffer.from(data!, 'base64');
    bytes[0] = bytes[0]! ^ 0xff; // flip one bit of the ciphertext
    const tampered = [iv, tag, bytes.toString('base64')].join(':');
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('rejects a malformed payload', () => {
    const service = makeService();
    expect(() => service.decrypt('not-a-valid-payload')).toThrow('Invalid encrypted payload');
  });
});
