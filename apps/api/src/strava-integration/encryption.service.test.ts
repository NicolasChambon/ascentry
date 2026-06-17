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
    expect(service.decrypt(service.encrypt(secret, 'user-1'), 'user-1')).toBe(secret);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const service = makeService();
    const a = service.encrypt('same', 'user-1');
    const b = service.encrypt('same', 'user-1');
    expect(a).not.toBe(b);
    expect(service.decrypt(a, 'user-1')).toBe('same');
    expect(service.decrypt(b, 'user-1')).toBe('same');
  });

  it('never leaks the plaintext in the payload', () => {
    const service = makeService();
    expect(service.encrypt('top-secret', 'user-1')).not.toContain('top-secret');
  });

  it('rejects a tampered ciphertext (GCM authentication)', () => {
    const service = makeService();
    const [iv, tag, data] = service.encrypt('value', 'user-1').split(':');
    const bytes = Buffer.from(data!, 'base64');
    bytes[0] = bytes[0]! ^ 0xff; // flip one bit of the ciphertext
    const tampered = [iv, tag, bytes.toString('base64')].join(':');
    expect(() => service.decrypt(tampered, 'user-1')).toThrow();
  });

  it('rejects a malformed payload', () => {
    const service = makeService();
    expect(() => service.decrypt('not-a-valid-payload', 'user-1')).toThrow(
      'Invalid encrypted payload',
    );
  });

  it('rejects decryption under a different AAD (context binding)', () => {
    const service = makeService();
    const payload = service.encrypt('user-1-token', 'user-1');
    expect(() => service.decrypt(payload, 'user-2')).toThrow();
  });
});
