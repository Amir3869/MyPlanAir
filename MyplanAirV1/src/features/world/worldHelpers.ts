// src/features/world/worldHelpers.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Types, constantes, badges, stats, cache GeoJSON pour Mon Monde
// ═══════════════════════════════════════════════════════════════════════════════

import type { Feature, Geometry } from 'geojson';
import type { Trip } from '../../store/types';
import { CAPITAL_COORDS } from '../../api/cloud';
import { tripStatus } from '../../utils/dateHelpers';
import { haversineKm } from '../../utils/geo';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ViewMode = 'map2d' | 'globe3d' | 'stats';

export type TripPoint = {
  lat: number;
  lon: number;
  label: string;
  country: string;
  countryCode: string;
  status: 'upcoming' | 'ongoing' | 'finished';
  tripId: string;
  dateRange: string;
};

export type ArcData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label?: string;
};

export type Badge = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  unlocked: boolean;
  xp: number;
  progress?: { current: number; target: number };
};

export type WorldStats = {
  totalTrips: number;
  uniqueCountries: number;
  totalCountries: number;
  pctWorld: number;
  totalKm: number;
  finishedTrips: number;
  ongoingTrips: number;
  upcomingTrips: number;
  hasOngoing: boolean;
  favoriteCountry: string | null;
  favoriteCode: string;
  favoriteCount: number;
  kmBreakdown: KmEntry[];
};

export type KmEntry = {
  tripId: string;
  destination: string;
  countryCode: string;
  status: 'upcoming' | 'ongoing' | 'finished';
  distanceKm: number;
  isRoadtrip: boolean;
  roadtripLegs?: { from: string; to: string; km: number }[];
};

// ─── Constantes ─────────────────────────────────────────────────────────────

export const COLOR = {
  ongoing: '#56c5a4',
  upcoming: '#7c8cff',
  finished: 'rgba(255,255,255,0.55)',
  dream: '#f0b24a',
  base: '#07070b',
  glass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.1)',
} as const;

export const TOTAL_COUNTRIES = 195;

// ─── Helpers pays / coordonnées ─────────────────────────────────────────────

export const getGeoFeatureCountryCode = (feature: Feature<Geometry>): string => {
  const props = feature.properties as Record<string, string> | null;
  return (
    props?.['ISO3166-1-Alpha-2'] ??
    props?.ISO_A2 ??
    props?.iso_a2 ??
    props?.ADM0_A3?.slice(0, 2) ??
    ''
  ).toUpperCase();
};

export const isValidCoord = (lat?: number, lon?: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lon);

export const isUsableCoord = (lat?: number, lon?: number): boolean =>
  isValidCoord(lat, lon) && !(lat === 0 && lon === 0);

export const getTripCoords = (trip: Trip): { lat: number; lon: number; source: 'trip' | 'destination' | 'capital' } | null => {
  if (isUsableCoord(trip.lat, trip.lon)) {
    return { lat: trip.lat!, lon: trip.lon!, source: 'trip' };
  }

  const firstDestination = trip.destinations?.find((dest) =>
    isUsableCoord(dest.lat, dest.lon),
  );
  if (firstDestination && isUsableCoord(firstDestination.lat, firstDestination.lon)) {
    return { lat: firstDestination.lat!, lon: firstDestination.lon!, source: 'destination' };
  }

  const capital = CAPITAL_COORDS[trip.countryCode.toUpperCase()];
  if (capital && isUsableCoord(capital.lat, capital.lon)) {
    return { lat: capital.lat, lon: capital.lon, source: 'capital' };
  }

  return null;
};

export const getTripDistanceDetails = (
  trip: Trip,
  homeLat: number,
  homeLon: number,
): Pick<KmEntry, 'distanceKm' | 'roadtripLegs'> | null => {
  if (!isUsableCoord(homeLat, homeLon)) return null;

  const roadtripCoords = (trip.destinations ?? [])
    .filter((destination) => isUsableCoord(destination.lat, destination.lon))
    .map((destination) => ({
      city: destination.city,
      lat: destination.lat!,
      lon: destination.lon!,
    }));

  if (trip.isRoadtrip && roadtripCoords.length > 0) {
    const roadtripLegs: { from: string; to: string; km: number }[] = [];
    let total = 0;

    const first = roadtripCoords[0];
    const firstKm = Math.round(haversineKm(homeLat, homeLon, first.lat, first.lon));
    roadtripLegs.push({ from: '🏠', to: first.city, km: firstKm });
    total += firstKm;

    for (let i = 1; i < roadtripCoords.length; i += 1) {
      const prev = roadtripCoords[i - 1];
      const curr = roadtripCoords[i];
      const km = Math.round(haversineKm(prev.lat, prev.lon, curr.lat, curr.lon));
      roadtripLegs.push({ from: prev.city, to: curr.city, km });
      total += km;
    }

    const last = roadtripCoords[roadtripCoords.length - 1];
    const returnKm = Math.round(haversineKm(last.lat, last.lon, homeLat, homeLon));
    roadtripLegs.push({ from: last.city, to: '🏠', km: returnKm });
    total += returnKm;

    return { distanceKm: total, roadtripLegs };
  }

  const coords = getTripCoords(trip);
  if (!coords) return null;

  return {
    distanceKm: Math.round(haversineKm(homeLat, homeLon, coords.lat, coords.lon) * 2),
  };
};

// ─── Badges ─────────────────────────────────────────────────────────────────

export const computeBadges = (
  totalTrips: number,
  uniqueCountries: number,
  totalKm: number,
  hasOngoing: boolean,
): Badge[] => [
  {
    id: 'first_trip', emoji: '✈️', label: '1er Voyage',
    description: 'Premier carnet créé',
    unlocked: totalTrips >= 1, xp: 50,
    progress: { current: Math.min(totalTrips, 1), target: 1 },
  },
  {
    id: 'explorer', emoji: '🗺️', label: 'Explorateur',
    description: '5 pays visités',
    unlocked: uniqueCountries >= 5, xp: 150,
    progress: { current: Math.min(uniqueCountries, 5), target: 5 },
  },
  {
    id: 'globetrotter', emoji: '🌍', label: 'Globe-trotter',
    description: '10 pays visités',
    unlocked: uniqueCountries >= 10, xp: 300,
    progress: { current: Math.min(uniqueCountries, 10), target: 10 },
  },
  {
    id: 'frequent', emoji: '🎒', label: 'Voyageur Fréquent',
    description: '5 voyages créés',
    unlocked: totalTrips >= 5, xp: 200,
    progress: { current: Math.min(totalTrips, 5), target: 5 },
  },
  {
    id: 'km_10k', emoji: '🚀', label: '10 000 km',
    description: '10 000 km parcourus',
    unlocked: totalKm >= 10000, xp: 250,
    progress: { current: Math.min(Math.round(totalKm / 1000) * 1000, 10000), target: 10000 },
  },
  {
    id: 'km_50k', emoji: '🛸', label: '50 000 km',
    description: '50 000 km parcourus',
    unlocked: totalKm >= 50000, xp: 500,
    progress: { current: Math.min(Math.round(totalKm / 1000) * 1000, 50000), target: 50000 },
  },
  {
    id: 'nomad', emoji: '🏕️', label: 'Nomade',
    description: 'Voyage en cours',
    unlocked: hasOngoing, xp: 100,
  },
  {
    id: 'legend', emoji: '👑', label: 'Légende',
    description: '10 voyages créés',
    unlocked: totalTrips >= 10, xp: 1000,
    progress: { current: Math.min(totalTrips, 10), target: 10 },
  },
];

// ─── Stats ──────────────────────────────────────────────────────────────────

export const computeWorldStats = (
  trips: Trip[],
  homeLat: number,
  homeLon: number,
): WorldStats => {
  const travelledTrips = trips.filter((t) => {
    const status = tripStatus(t.startDate, t.endDate);
    return status === 'finished' || status === 'ongoing';
  });
  const uniqueCountries = new Set(travelledTrips.map((t) => t.countryCode));

  // Km breakdown — distance cohérente avec Dashboard : aller-retour simple,
  // ou boucle roadtrip domicile → étapes → domicile.
  const kmBreakdown: KmEntry[] = trips
    .map((t) => {
      const details = getTripDistanceDetails(t, homeLat, homeLon);
      if (!details) return null;

      const status = tripStatus(t.startDate, t.endDate);
      const entry: KmEntry = {
        tripId: t.id,
        destination: t.isRoadtrip ? t.country : t.destination,
        countryCode: t.countryCode,
        status,
        distanceKm: details.distanceKm,
        isRoadtrip: !!t.isRoadtrip,
      };

      if (details.roadtripLegs && details.roadtripLegs.length > 0) {
        entry.roadtripLegs = details.roadtripLegs;
      }

      return entry;
    })
    .filter((entry): entry is KmEntry => entry !== null);

  // Total km : voyages terminés + en cours seulement
  const totalKm = kmBreakdown
    .filter((e) => e.status !== 'upcoming')
    .reduce((sum, e) => sum + e.distanceKm, 0);

  // Favorite country
  const countryCounts = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.country] = (acc[t.country] ?? 0) + 1;
    return acc;
  }, {});
  const favoriteEntry = Object.entries(countryCounts).sort(([, a], [, b]) => b - a)[0];

  return {
    totalTrips: trips.length,
    uniqueCountries: uniqueCountries.size,
    totalCountries: TOTAL_COUNTRIES,
    pctWorld: Math.min(100, (uniqueCountries.size / TOTAL_COUNTRIES) * 100),
    totalKm,
    finishedTrips: trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'finished').length,
    ongoingTrips: trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'ongoing').length,
    upcomingTrips: trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'upcoming').length,
    hasOngoing: trips.some((t) => tripStatus(t.startDate, t.endDate) === 'ongoing'),
    favoriteCountry: favoriteEntry?.[0] ?? null,
    favoriteCode: favoriteEntry ? (trips.find((t) => t.country === favoriteEntry[0])?.countryCode ?? '') : '',
    favoriteCount: favoriteEntry?.[1] ?? 0,
    kmBreakdown,
  };
};

// ─── Trip points & arcs ────────────────────────────────────────────────────

export const computeTripPoints = (trips: Trip[]): TripPoint[] =>
  trips
    .map((t) => {
      const coords = getTripCoords(t);
      if (!coords) return null;

      return {
        lat: coords.lat,
        lon: coords.lon,
        label: t.isRoadtrip ? `${t.country} · Roadtrip` : t.destination,
        country: t.country,
        countryCode: t.countryCode,
        status: tripStatus(t.startDate, t.endDate),
        tripId: t.id,
        dateRange: `${t.startDate} → ${t.endDate}`,
      };
    })
    .filter((point): point is TripPoint => point !== null);

export const computeArcs = (
  tripPoints: TripPoint[],
  homeLat: number,
  homeLon: number,
): ArcData[] =>
  tripPoints
    .filter((p) => p.status === 'ongoing' || p.status === 'finished')
    .map((p) => ({
      startLat: homeLat,
      startLng: homeLon,
      endLat: p.lat,
      endLng: p.lon,
      color: p.status === 'ongoing' ? `${COLOR.ongoing}cc` : 'rgba(255,255,255,0.2)',
      label: `${Math.round(haversineKm(homeLat, homeLon, p.lat, p.lon)).toLocaleString('fr-FR')} km`,
    }));

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Durée estimée d'un vol (vitesse moyenne ~850 km/h) */
export const estimateFlightTime = (distanceKm: number): string => {
  const hours = distanceKm / 850;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

/** Formate la distance en km */
export const fmtDistance = (km: number): string => {
  if (km >= 1000) return `${(km / 1000).toFixed(1).replace('.0', '')}k km`;
  return `${km} km`;
};

// ─── GeoJSON Cache — IndexedDB ─────────────────────────────────────────────

const GEO_DB = 'mytrip-geo';
const GEO_STORE = 'geojson';
const GEO_KEY = 'countries';
const GEO_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours

const openGeoDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(GEO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(GEO_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const getCachedGeoJson = async (): Promise<unknown | null> => {
  try {
    const db = await openGeoDB();
    return new Promise((resolve) => {
      const tx = db.transaction(GEO_STORE, 'readonly');
      const req = tx.objectStore(GEO_STORE).get(GEO_KEY);
      req.onsuccess = () => {
        db.close();
        const record = req.result as { data: unknown; ts: number } | undefined;
        if (!record || Date.now() - record.ts > GEO_TTL) {
          resolve(null);
          return;
        }
        resolve(record.data);
      };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch { return null; }
};

export const setCachedGeoJson = async (data: unknown): Promise<void> => {
  try {
    const db = await openGeoDB();
    const tx = db.transaction(GEO_STORE, 'readwrite');
    tx.objectStore(GEO_STORE).put({ data, ts: Date.now() }, GEO_KEY);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch { /* silent */ }
};

/** URL du GeoJSON mondial (format GeoJSON avec propriétés ISO_A2) */
export const GEOJSON_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

// ─── Country sets ───────────────────────────────────────────────────────────

export const computeCountrySets = (trips: Trip[]) => {
  const visited = new Set<string>();
  const upcoming = new Set<string>();
  const ongoing = new Set<string>();

  for (const t of trips) {
    const code = t.countryCode.toUpperCase();
    const s = tripStatus(t.startDate, t.endDate);
    if (s === 'ongoing') ongoing.add(code);
    else if (s === 'upcoming') upcoming.add(code);
    else visited.add(code);
  }

  return { visited, upcoming, ongoing };
};
