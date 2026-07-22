/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGO_DEV_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ✅ FIX TS2882 — déclaration explicite chemin leaflet CSS
declare module 'leaflet/dist/leaflet.css' {}
// Déclaration générique pour tous autres imports CSS side-effect
declare module '*.css' {}
