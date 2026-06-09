import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('<App />', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ status: 'ok', uptime: 1, timestamp: new Date().toISOString() }),
      }),
    );
  });

  it('display the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ascentry' })).toBeInTheDocument();
  });

  it('display status sended back by the API', async () => {
    render(<App />);
    expect(await screen.findByText('API health : ok')).toBeInTheDocument();
  });
});
