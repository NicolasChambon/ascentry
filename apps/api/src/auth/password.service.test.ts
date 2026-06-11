import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes into argon2id PHC string, not the plaintext', async () => {
    const hash = await service.hash('s3cret-password');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('s3cret-password');
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('s3cret-password');
    await expect(service.verify(hash, 's3cret-password')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('s3cret-password');
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const [a, b] = await Promise.all([service.hash('same'), service.hash('same')]);
    expect(a).not.toBe(b);
  });
});
