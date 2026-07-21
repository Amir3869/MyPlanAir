// src/features/world/Globe3DView.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Globe 3D — visualisation monde parcouru
// Règle produit : le globe reste VISUEL.
// - Maison visible
// - Un seul arc : voyage en cours, sinon prochain voyage à venir
// - Pays concernés coloriés uniquement (pas les 195 pays)
// - Villes/destinations en points
// - Pas d'overlay, pas de stats, pas d'infos lourdes
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { lazy as reactLazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import type { Trip } from '../../store/tripStore';
import { tripStatus } from '../../utils/dateHelpers';
import { haversineKm } from '../../utils/geo';
import { COLOR, getGeoFeatureCountryCode, getTripCoords, isUsableCoord, type TripPoint } from './worldHelpers';

const Globe = reactLazy(() => import('react-globe.gl'));

// ─── Types ──────────────────────────────────────────────────────────────────

type GlobePoint = {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  status: string;
};

type HomeHtmlPoint = {
  lat: number;
  lng: number;
  label: string;
};

type GlobeArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
};

type GlobePolygon = {
  type: 'Feature';
  geometry: Geometry;
  properties: Record<string, unknown>;
};

type CountryStatus = 'finished' | 'ongoing';

// ─── Helpers ────────────────────────────────────────────────────────────────

const countryRank: Record<CountryStatus, number> = {
  finished: 1,
  ongoing: 2,
};

const countryColor = (status: CountryStatus): string => {
  // Couleurs pleines : meilleure lecture, moins d'effet "trous" sur le globe.
  if (status === 'ongoing') return '#56c5a4';
  return '#4f46e5';
};

const countryStroke = (status: CountryStatus): string => {
  if (status === 'ongoing') return '#6ee7b7';
  return '#a5b4fc';
};

const getTripLabel = (trip: Trip): string =>
  trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination;

// ─── Spinner premium léger ──────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4">
    <motion.div
      className="relative h-20 w-20 rounded-full"
      style={{
        background:
          'radial-gradient(circle at 35% 30%, rgba(86,197,164,0.35), rgba(10,61,98,0.22) 42%, rgba(7,7,11,0.9) 72%)',
        border: `1px solid ${COLOR.border}`,
        boxShadow: '0 0 60px rgba(74,144,217,0.22)',
      }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
    >
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
      <div className="absolute inset-3 rounded-full border border-white/10" />
    </motion.div>
    <div className="text-center">
      <div className="text-xs font-semibold tracking-tight text-white/65">Préparation du globe</div>
      <div className="mt-1 text-[10px] text-white/30">Chargement de ton monde…</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT GLOBE3DVIEW
// ═══════════════════════════════════════════════════════════════════════════════

type Props = {
  tripPoints: TripPoint[];
  trips: Trip[];
  geoData: GeoJsonObject | null;
  homeLat: number;
  homeLon: number;
};

export const Globe3DView = ({
  tripPoints,
  trips,
  geoData,
  homeLat,
  homeLon,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [isReady, setIsReady] = useState(false);

  // ── Mesure du container ────────────────────────────────────────────────
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const next = {
        w: containerRef.current.offsetWidth,
        h: containerRef.current.offsetHeight,
      };
      setDimensions((prev) => (
        prev.w === next.w && prev.h === next.h ? prev : next
      ));
      setIsReady(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Pays concernés uniquement ─────────────────────────────────────────
  const countryStatuses = useMemo(() => {
    const statuses = new Map<string, CountryStatus>();

    for (const trip of trips) {
      const status = tripStatus(trip.startDate, trip.endDate);
      // Le globe colorie uniquement les pays terminés et en cours.
      // Les pays à venir restent neutres.
      if (status === 'upcoming') continue;

      const code = trip.countryCode.toUpperCase();
      const previous = statuses.get(code);

      if (!previous || countryRank[status] > countryRank[previous]) {
        statuses.set(code, status);
      }
    }

    return statuses;
  }, [trips]);

  const globePolygons = useMemo<GlobePolygon[]>(() => {
    const features = (geoData as { features?: Feature<Geometry>[] } | null)?.features;
    if (!features || countryStatuses.size === 0) return [];

    return features
      .filter((feature) => countryStatuses.has(getGeoFeatureCountryCode(feature)))
      .map((feature) => {
        const status = countryStatuses.get(getGeoFeatureCountryCode(feature)) ?? 'finished';
        return {
          type: 'Feature' as const,
          geometry: feature.geometry,
          properties: {
            ...(feature.properties ?? {}),
            _fill: countryColor(status),
            _stroke: countryStroke(status),
          },
        };
      });
  }, [geoData, countryStatuses]);

  // ── Maison permanente en HTML, pas en point 3D doré ───────────────────
  const homeHtmlPoints = useMemo<HomeHtmlPoint[]>(() => [
    { lat: homeLat, lng: homeLon, label: '🏠' },
  ], [homeLat, homeLon]);

  // ── Points villes/destinations ────────────────────────────────────────
  const globePoints = useMemo<GlobePoint[]>(() => {
    const points: GlobePoint[] = [];

    for (const p of tripPoints) {
      // Le globe montre le parcours réel : terminé + en cours.
      // Les voyages à venir ne sont pas affichés en points.
      if (p.status === 'upcoming') continue;

      const cc = p.countryCode.toUpperCase();
      const A = 0x1f1e6;
      let emoji = '📍';
      try {
        emoji = String.fromCodePoint(A + cc.charCodeAt(0) - 65) +
          String.fromCodePoint(A + cc.charCodeAt(1) - 65);
      } catch {
        // fallback silencieux
      }

      points.push({
        lat: p.lat,
        lng: p.lon,
        size: p.status === 'ongoing' ? 0.28 : 0.18,
        color: p.status === 'ongoing' ? COLOR.ongoing : '#4f46e5',
        label: `${emoji} ${p.label}`,
        status: p.status,
      });
    }

    // Points roadtrip si les étapes ont des coordonnées.
    for (const trip of trips) {
      const status = tripStatus(trip.startDate, trip.endDate);
      if (status === 'upcoming') continue;

      for (const dest of trip.destinations ?? []) {
        if (!isUsableCoord(dest.lat, dest.lon)) continue;
        points.push({
          lat: dest.lat!,
          lng: dest.lon!,
          size: status === 'ongoing' ? 0.18 : 0.14,
          color: status === 'ongoing' ? COLOR.ongoing : '#4f46e5',
          label: `📍 ${dest.city}`,
          status,
        });
      }
    }

    return points;
  }, [homeLat, homeLon, tripPoints, trips]);

  // ── Un seul arc : uniquement le voyage en cours ───────────────────────
  const activeTripTarget = useMemo(() => {
    const withCoords = trips
      .map((trip) => {
        const coords = getTripCoords(trip);
        return coords ? { trip, ...coords } : null;
      })
      .filter((item): item is { trip: Trip; lat: number; lon: number; source: 'trip' | 'destination' | 'capital' } => item !== null);

    return withCoords.find((item) => tripStatus(item.trip.startDate, item.trip.endDate) === 'ongoing') ?? null;
  }, [trips]);

  const globeArcs = useMemo<GlobeArc[]>(() => {
    if (!activeTripTarget) return [];

    return [{
      startLat: homeLat,
      startLng: homeLon,
      endLat: activeTripTarget.lat,
      endLng: activeTripTarget.lon,
      color: '#22d3ee',
      label: `${getTripLabel(activeTripTarget.trip)} · ${Math.round(haversineKm(homeLat, homeLon, activeTripTarget.lat, activeTripTarget.lon)).toLocaleString('fr-FR')} km`,
    }];
  }, [activeTripTarget, homeLat, homeLon]);

  const polygonCapColor = (polygon: object): string =>
    ((polygon as { properties?: { _fill?: string } }).properties?._fill) ?? 'rgba(255,255,255,0.2)';

  const polygonStrokeColor = (polygon: object): string =>
    ((polygon as { properties?: { _stroke?: string } }).properties?._stroke) ?? 'rgba(255,255,255,0.35)';

  // ── Auto-focus : uniquement le trajet en cours ────────────────────────
  const focusTarget = useMemo(() => {
    if (!activeTripTarget) return null;

    let deltaLon = activeTripTarget.lon - homeLon;
    if (deltaLon > 180) deltaLon -= 360;
    if (deltaLon < -180) deltaLon += 360;

    // On cadre le trajet, légèrement côté maison, pour voir le départ et l'arc.
    let lng = homeLon + deltaLon * 0.42;
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    const lat = homeLat + (activeTripTarget.lat - homeLat) * 0.42;
    const distance = haversineKm(homeLat, homeLon, activeTripTarget.lat, activeTripTarget.lon);
    const altitude =
      distance > 9000 ? 2.05 :
      distance > 5500 ? 1.85 :
      distance > 2500 ? 1.55 :
      distance > 1000 ? 1.25 : 1.05;

    return { lat, lng, altitude };
  }, [activeTripTarget, homeLat, homeLon]);

  const canRenderGlobe = isReady && dimensions.w > 0 && dimensions.h > 0;

  useEffect(() => {
    if (!canRenderGlobe || !focusTarget) return;

    const timer = window.setTimeout(() => {
      globeRef.current?.pointOfView?.(
        { lat: focusTarget.lat, lng: focusTarget.lng, altitude: focusTarget.altitude },
        1100,
      );
    }, 450);

    return () => window.clearTimeout(timer);
  }, [canRenderGlobe, focusTarget]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl"
      style={{
        height: '65vh',
        minHeight: 420,
        background: 'radial-gradient(ellipse at center, rgba(10,20,40,0.8) 0%, #07070b 100%)',
        border: `1px solid ${COLOR.border}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}
    >
      {!canRenderGlobe ? (
        <Spinner />
      ) : (
        <Suspense fallback={<Spinner />}>
          <Globe
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            globeImageUrl="//unpkg.com/three-globe@2.37.1/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe@2.37.1/example/img/earth-topology.png"
            backgroundColor="rgba(7,7,11,1)"
            showAtmosphere
            atmosphereColor="#4a90d9"
            atmosphereAltitude={0.2}
            polygonsData={globePolygons}
            polygonGeoJsonGeometry="geometry"
            polygonCapColor={polygonCapColor}
            polygonSideColor={() => 'rgba(0,0,0,0.10)'}
            polygonStrokeColor={polygonStrokeColor}
            polygonAltitude={0.006}
            polygonCapCurvatureResolution={2}
            pointsData={globePoints}
            pointAltitude={0.006}
            pointRadius="size"
            pointResolution={6}
            pointColor="color"
            pointLabel="label"
            htmlElementsData={homeHtmlPoints}
            htmlLat="lat"
            htmlLng="lng"
            htmlElement={(point: object) => {
              const el = document.createElement('div');
              el.textContent = (point as HomeHtmlPoint).label;
              el.style.cssText = `
                transform: translate(-50%, -50%);
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: rgba(14,14,20,0.78);
                border: 1px solid rgba(240,178,74,0.42);
                box-shadow: 0 8px 28px rgba(240,178,74,0.20);
                font-size: 17px;
                line-height: 1;
                pointer-events: none;
              `;
              return el;
            }}
            arcsData={globeArcs}
            arcColor="color"
            arcAltitude={0.18}
            arcStroke={0.58}
            arcDashLength={0.48}
            arcDashGap={0.16}
            arcDashAnimateTime={3000}
            animateIn
          />
        </Suspense>
      )}

      {/* Indication de rotation */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-xs"
        style={{
          background: 'rgba(14,14,20,0.85)',
          border: `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        ← Faites tourner le globe →
      </div>

      {/* Légende globe */}
      <div
        className="absolute left-4 top-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-[10px]"
        style={{
          background: 'rgba(14,14,20,0.88)',
          border: `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        {[
          { emoji: '🏠', label: 'Maison' },
          { color: COLOR.ongoing, label: 'En cours' },
          { color: '#4f46e5', label: 'Terminé' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-white/55">
            {'emoji' in item ? (
              <span>{item.emoji}</span>
            ) : (
              <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
            )}
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-white/35">
          <div className="h-0 w-4 border-t border-dashed border-white/25" />
          Trajet actif
        </div>
      </div>
    </div>
  );
};
