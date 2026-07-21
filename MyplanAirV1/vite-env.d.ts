/// <reference types="vite/client" />

// ✅ FIX TS2882 — déclaration explicite chemin leaflet CSS
declare module 'leaflet/dist/leaflet.css' {}
// Déclaration générique pour tous autres imports CSS side-effect
declare module '*.css' {}