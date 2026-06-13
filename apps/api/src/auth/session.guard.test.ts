import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { type AuthRequest, SessionGuard } from './session.guard';
import { describe, expect, it, vi } from 'vitest';
import type { SessionService } from './session.service';

function contextWith(request: AuthRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(validate: ReturnType<typeof vi.fn>): SessionGuard {
  return new SessionGuard({
    validate,
  } as unknown as SessionService);
}

describe('SessionGuard', () => {
  it('throws 401 when there is no session cookie', async () => {
    const guard = makeGuard(vi.fn().mockResolvedValue({ userId: 'u1' }));
    await expect(guard.canActivate(contextWith({ cookies: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws 401 when the session is invalid or expired', async () => {
    const guard = makeGuard(vi.fn().mockResolvedValue(null));
    await expect(guard.canActivate(contextWith({ cookies: { session: 'tok' } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches userId and returns true for a live session', async () => {
    const guard = makeGuard(vi.fn().mockResolvedValue({ userId: 'u1' }));
    const request: AuthRequest = { cookies: { session: 'tok' } };
    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);
    expect(request.userId).toBe('u1');
  });
});
