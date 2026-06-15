import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface MockUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

let fetchMock: Mock;

function setupServer() {
  const user: MockUser = {
    id: 'u1',
    email: 'example@email.com',
    emailVerified: false,
  };
  let session: MockUser | null = null;

  fetchMock = vi.fn((input: string) => {
    let status = 404;
    let body: unknown = null;

    if (input.endsWith('/api/me')) {
      status = session ? 200 : 401;
      body = session;
    } else if (input.endsWith('/api/auth/login') || input.endsWith('/api/auth/register')) {
      session = user;
      status = input.endsWith('/login') ? 200 : 201;
      body = user;
    } else if (input.endsWith('/api/auth/logout')) {
      session = null;
      status = 204;
    }

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);
  });

  vi.stubGlobal('fetch', fetchMock);
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('Auth flow', () => {
  beforeEach(() => {
    setupServer();
    renderApp();
  });

  it('shows the login form when /me is 401', async () => {
    expect(await screen.findByText('Connexion')).toBeInTheDocument();
  });

  it('logs in and swaps to the connected view', async () => {
    await screen.findByText('Connexion');
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'example@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'longenough' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/example@email\.com/)).toBeInTheDocument();
  });

  it('logs out and returns to the login form', async () => {
    fireEvent.change(await screen.findByPlaceholderText('Email'), {
      target: { value: 'example@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'longenough' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await screen.findByText('Connecté : example@email.com');

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(await screen.findByText('Connexion')).toBeInTheDocument();
  });

  it('rejects a too-short password on register without calling the API', async () => {
    fireEvent.click(await screen.findByRole('button', { name: "Pas de compte ? S'inscrire" }));
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'example@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));

    expect(
      await screen.findByText('Too small: expected string to have >=8 characters'),
    ).toBeInTheDocument();
    const registerWasCalled = fetchMock.mock.calls.some((call) =>
      String(call[0]).endsWith('/api/auth/register'),
    );
    expect(registerWasCalled).toBe(false);
  });
});
