import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';
import { ToastProvider } from './shared/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// FIX LEAFLET ICONS (Vite)
// ─────────────────────────────────────────────────────────────────────────────
import L from 'leaflet';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// Clerk publishable key — depuis .env.local
// ─────────────────────────────────────────────────────────────────────────────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// ✅ Graceful fallback : si la clé Clerk est manquante, on affiche l'app
// sans Clerk (mode local) au lieu de crasher complètement.
if (!CLERK_KEY) {
  console.warn(
    '⚠️ VITE_CLERK_PUBLISHABLE_KEY manquante dans .env.local — mode sans auth'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Si la clé Clerk existe → on enveloppe avec ClerkProvider
// Sinon → on affiche l'app sans auth (fallback gracieux)
// ─────────────────────────────────────────────────────────────────────────────
const RootApp = () => (
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);

const root = createRoot(document.getElementById('root')!);

if (CLERK_KEY) {
  root.render(
    <ClerkProvider publishableKey={CLERK_KEY}>
      <RootApp />
    </ClerkProvider>
  );
} else {
  root.render(<RootApp />);
}