import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortalShell } from '@gomhoasen/ui-portal';
import './styles.css';

declare global {
  interface Window {
    __API_URL__?: string;
  }
}

if (import.meta.env.VITE_API_URL) {
  window.__API_URL__ = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <PortalShell />
  </StrictMode>
);
