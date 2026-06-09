import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@ascentry/shared';

describe('healthResponseSchema', () => {
  it('accepts a valid answer', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      uptime: 123,
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ko',
      uptime: 123,
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });
});
