// src/utils/geo.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Fonctions géographiques partagées (haversine, distance, geocoding)
// Extraites depuis WorldMap.tsx + TripChat.tsx (déduplication)
// ═══════════════════════════════════════════════════════════════════════════════

import { recordLocalUsage } from './usageTelemetry';

/**
 * Calcul de distance entre deux points GPS (formule de Haversine).
 * Retourne la distance en kilomètres.
 *
 * Utilisé dans :
 * - WorldMap.tsx (stats km totaux)
 * - TripChat.tsx (distance lieu ↔ utilisateur)
 * - Profil (stats km parcourus)
 */
export const haversineKm = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Formate une distance en km ou m.
 * - < 1 km → affiche en mètres (ex: "350 m")
 * - ≥ 1 km → affiche en km avec 1 décimale (ex: "2.3 km")
 */
export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

/**
 * Temps de marche estimé en minutes (vitesse moyenne 5 km/h).
 */
export const walkMinutes = (km: number): number => Math.round((km / 5) * 60);

/**
 * Temps de métro estimé en minutes (vitesse moyenne 30 km/h + 5 min attente).
 */
export const metroMinutes = (km: number): number => Math.round((km / 30) * 60 + 5);

/**
 * Géocodage via Photon (OpenStreetMap).
 * Retourne les coordonnées { lat, lon } ou null si introuvable.
 *
 * Utilisé dans :
 * - TripChat.tsx (localisation des lieux mentionnés par ARIA)
 */
export const geocodePlace = async (
  query: string,
): Promise<{ lat: number; lon: number } | null> => {
  const startedAt = Date.now();

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=fr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      recordLocalUsage({
        service: 'geocode',
        category: 'external',
        endpoint: 'photon/place',
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorReason: `http_${res.status}`,
        details: { query },
      });
      return null;
    }
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!feat) {
      recordLocalUsage({
        service: 'geocode',
        category: 'external',
        endpoint: 'photon/place',
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorReason: 'not_found',
        details: { query },
      });
      return null;
    }
    const [lon, lat] = feat.geometry.coordinates as [number, number];
    recordLocalUsage({
      service: 'geocode',
      category: 'external',
      endpoint: 'photon/place',
      status: 'success',
      durationMs: Date.now() - startedAt,
      details: { query },
    });
    return { lat, lon };
  } catch (err) {
    recordLocalUsage({
      service: 'geocode',
      category: 'external',
      endpoint: 'photon/place',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorReason: 'network_error',
      details: { query, error: String((err as Error)?.message ?? err) },
    });
    return null;
  }
};
