import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as stravaApi from './strava.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StravaConnectionCard } from './StravaConnectionCard';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('./strava.api', () => ({
  getStravaStatus: vi.fn(),
  disconnectStrava: vi.fn(),
  connectStrava: vi.fn(),
}));

const api = vi.mocked(stravaApi);

const connectedStatus = {
  connected: true as const,
  athleteId: 42,
  scopes: ['read'],
  expiresAt: '2030-01-01T00:00:00.000Z',
};

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StravaConnectionCard />
    </QueryClientProvider>,
  );
}

describe('StravaConnectionCard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a connect button when not connected and triggers the redirect', async () => {
    api.getStravaStatus.mockResolvedValue({ connected: false });
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'Connecter Strava' }));

    expect(api.connectStrava).toHaveBeenCalled();
  });

  it('shows a disconnect button when connected', async () => {
    api.getStravaStatus.mockResolvedValue(connectedStatus);
    renderCard();

    expect(await screen.findByRole('button', { name: /strava/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connecter Strava' })).not.toBeInTheDocument();
  });

  it('calls the API only after confirming in the dialog', async () => {
    api.getStravaStatus.mockResolvedValue(connectedStatus);
    api.disconnectStrava.mockResolvedValue();
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: /strava/i }));
    expect(api.disconnectStrava).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'Déconnecter' }));

    await waitFor(() => {
      expect(api.disconnectStrava).toHaveBeenCalled();
    });
  });
});
