import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { notifyStravaRedirect } from './notifyStravaRedirect';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const success = vi.mocked(toast.success);
const error = vi.mocked(toast.error);

const setUrl = (search: string) => {
  window.history.replaceState({}, '', `/${search}`);
};

describe('notifyStravaRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('toasts success and strips the param on ?strava=connected', () => {
    setUrl('?strava=connected');
    notifyStravaRedirect();
    expect(success).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('toasts an error on ?strava=denied', () => {
    setUrl('?strava=denied');
    notifyStravaRedirect();
    expect(error).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('toasts an error on ?strava=already_linked', () => {
    setUrl('?strava=already_linked');
    notifyStravaRedirect();
    expect(error).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('');
  });

  it('does nothing and keeps the URL when there is no param', () => {
    setUrl('');
    notifyStravaRedirect();
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });
});
