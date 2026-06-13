import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.schema';

describe('registerSchema', () => {
  it('is wired: accepts a valid payload, rejects a malformed one', () => {
    expect(
      registerSchema.safeParse({
        email: 'example@email.com',
        password: 'longenough',
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        email: 'nope',
        password: 'short',
      }).success,
    ).toBe(false);
  });
});
