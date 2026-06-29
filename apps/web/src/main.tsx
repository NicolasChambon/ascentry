import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from 'zod';
import { fr } from 'zod/locales';
import { Toaster } from './components/ui/sonner';
import { StravaRedirectToast } from './strava/StravaRedirectToast';

config(fr());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element');
}

const queryClient = new QueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
      <StravaRedirectToast />
    </QueryClientProvider>
  </StrictMode>,
);
