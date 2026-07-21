// src/utils/platform.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Détection plateforme / appareil
// Extrait de TripChat.tsx (déduplication)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecte si l'utilisateur est sur iOS (iPhone, iPad, iPod).
 * Utilisé pour choisir entre Apple Maps et Google Maps lors de l'ouverture
 * d'un lieu dans une app de navigation.
 *
 * Sur iPad avec trackpad (macOS), navigator.platform === 'MacIntel' && maxTouchPoints > 1
 */
export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
