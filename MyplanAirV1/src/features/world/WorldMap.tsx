// src/features/world/WorldMap.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Mon Monde — Orchestrateur principal
// Header + nav vues (2D / 3D / Stats) + GeoJSON loading + state management
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Globe as GlobeIcon, Map,
  Trophy, Calendar,
} from 'lucide-react';
import type { GeoJsonObject } from 'geojson';
import { useTripStore, type Trip } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { GlassCard } from '../../shared/GlassCard';
import { fmtRange, tripStatus, dayCounter } from '../../utils/dateHelpers';
import {
  COLOR,
  type ViewMode,
  computeBadges,
  computeWorldStats,
  computeTripPoints,
  getTripCoords,
  getTripDistanceDetails,
  getCachedGeoJson,
  setCachedGeoJson,
  GEOJSON_URL,
} from './worldHelpers';
import { Map2DView } from './Map2DView';
import { Globe3DView } from './Globe3DView';
import { StatsView } from './StatsView';
import { recordLocalUsage } from '../../utils/usageTelemetry';

// ─── Helpers panneau voyages ───────────────────────────────────────────────

const sortTripsForWorldPanel = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => {
    const sa = tripStatus(a.startDate, a.endDate);
    const sb = tripStatus(b.startDate, b.endDate);
    const rank = { ongoing: 0, upcoming: 1, finished: 2 } as const;
    const diff = rank[sa] - rank[sb];
    if (diff !== 0) return diff;

    if (sa === 'upcoming') {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }

    return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
  });

const getStatusMeta = (trip: Trip) => {
  const status = tripStatus(trip.startDate, trip.endDate);
  const color = status === 'ongoing' ? COLOR.ongoing : status === 'upcoming' ? COLOR.upcoming : COLOR.finished;
  const label = status === 'ongoing' ? '● En cours' : status === 'upcoming' ? '○ À venir' : '✓ Terminé';
  return { status, color, label };
};

// ─── TripListItem V2 : focus détaillé + autres compacts ─────────────────────

const TripListItem = ({
  trip,
  index,
  selected,
  homeLat,
  homeLon,
  onSelect,
  onOpen,
}: {
  trip: Trip;
  index: number;
  selected: boolean;
  homeLat: number;
  homeLon: number;
  onSelect: () => void;
  onOpen: () => void;
}) => {
  const { color, label } = getStatusMeta(trip);
  const distanceKm = getTripDistanceDetails(trip, homeLat, homeLon)?.distanceKm ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18), type: 'spring', damping: 24 }}
    >
      <GlassCard
        className={selected ? 'p-4 cursor-pointer transition-all' : 'px-3 py-2.5 cursor-pointer transition-all'}
        onClick={onSelect}
        style={{
          border: selected ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.075)',
          boxShadow: selected ? `0 16px 48px ${color}18` : 'none',
          background: selected ? 'rgba(255,255,255,0.078)' : 'rgba(255,255,255,0.038)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className={selected
              ? 'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0'
              : 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0'}
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Flag code={trip.countryCode} size={selected ? 24 : 18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className={selected ? 'font-semibold tracking-tight truncate' : 'text-sm font-semibold tracking-tight truncate'}>
              {trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination}
            </div>

            {selected ? (
              <>
                <div className="text-xs text-white/45 flex items-center gap-1.5 mt-1">
                  <Calendar size={10} />
                  {fmtRange(trip.startDate, trip.endDate)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-white/35">
                  {distanceKm !== null && (
                    <span>{distanceKm.toLocaleString('fr-FR')} km depuis la maison</span>
                  )}
                  {trip.isRoadtrip && trip.destinations && (
                    <span>· {trip.destinations.length} villes</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-white/35 truncate mt-0.5">
                {fmtRange(trip.startDate, trip.endDate)}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div
              className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {selected ? 'Focus' : label}
            </div>
            {selected && (
              <div className="text-[9px] text-white/25">{dayCounter(trip.startDate, trip.endDate)}</div>
            )}
          </div>
        </div>

        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="mt-3 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="w-full rounded-2xl py-2.5 text-xs font-semibold tap"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                boxShadow: '0 10px 28px rgba(var(--accent-from-rgb), 0.25)',
              }}
            >
              Voir le voyage →
            </button>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
};

const TripPanel = ({
  title,
  trips,
  selectedTripId,
  homeLat,
  homeLon,
  onSelectTrip,
  onOpenTrip,
  maxHeight,
}: {
  title: string;
  trips: Trip[];
  selectedTripId: string | null;
  homeLat: number;
  homeLon: number;
  onSelectTrip: (id: string) => void;
  onOpenTrip: (id: string) => void;
  maxHeight: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const sortedTrips = useMemo(() => sortTripsForWorldPanel(trips), [trips]);
  const selectedTrip = sortedTrips.find((trip) => trip.id === selectedTripId) ?? null;
  const otherTrips = selectedTrip
    ? sortedTrips.filter((trip) => trip.id !== selectedTrip.id)
    : sortedTrips;

  return (
    <GlassCard
      strong
      className="p-3 overflow-hidden rounded-[24px]"
      style={{
        background: 'rgba(12,12,18,0.72)',
        border: '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(28px) saturate(170%)',
        boxShadow: '0 18px 54px rgba(0,0,0,0.34)',
      }}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35">{title}</div>
          <div className="text-[11px] text-white/25 mt-0.5">
            Voyage en cours en premier · tap pour focus
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="px-3 py-1.5 rounded-full text-[10px] font-semibold tap"
          style={{
            background: expanded ? 'rgba(var(--accent-from-rgb), 0.20)' : 'rgba(var(--accent-from-rgb), 0.12)',
            border: '1px solid rgba(var(--accent-from-rgb), 0.24)',
            color: 'var(--accent-label)',
          }}
        >
          {expanded ? 'Réduire' : `Déplier · ${trips.length}`}
        </button>
      </div>

      <div
        className="space-y-2 overflow-y-auto overscroll-contain pr-1 pb-1"
        style={{ maxHeight: expanded ? maxHeight : undefined }}
      >
        {selectedTrip && (
          <TripListItem
            trip={selectedTrip}
            index={0}
            selected
            homeLat={homeLat}
            homeLon={homeLon}
            onSelect={() => onSelectTrip(selectedTrip.id)}
            onOpen={() => onOpenTrip(selectedTrip.id)}
          />
        )}

        {expanded && selectedTrip && otherTrips.length > 0 && (
          <div className="px-1 pt-1 text-[10px] uppercase tracking-wider text-white/22">
            Autres destinations
          </div>
        )}

        {expanded && otherTrips.map((trip, i) => (
          <TripListItem
            key={trip.id}
            trip={trip}
            index={i + 1}
            selected={false}
            homeLat={homeLat}
            homeLon={homeLon}
            onSelect={() => onSelectTrip(trip.id)}
            onOpen={() => onOpenTrip(trip.id)}
          />
        ))}
      </div>
    </GlassCard>
  );
};

// ─── Focus par défaut : en cours → dernier terminé → prochain à venir ───────
const getDefaultFocusedTripId = (trips: Trip[]): string | null => {
  const withCoords = trips.filter((t) => getTripCoords(t) !== null);
  if (withCoords.length === 0) return trips[0]?.id ?? null;

  const ongoing = withCoords.find((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');
  if (ongoing) return ongoing.id;

  const finished = withCoords
    .filter((t) => tripStatus(t.startDate, t.endDate) === 'finished')
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
  if (finished) return finished.id;

  const upcoming = withCoords
    .filter((t) => tripStatus(t.startDate, t.endDate) === 'upcoming')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
  return upcoming?.id ?? withCoords[0]?.id ?? null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORLDMAP — COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export const WorldMap = () => {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const userName = useTripStore((s) => s.userName);
  const homeLat = useTripStore((s) => s.homeLat);
  const homeLon = useTripStore((s) => s.homeLon);

  // ── Vue active ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('map2d');

  // ── Voyage focus : en cours → dernier terminé → prochain à venir ─────
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() =>
    getDefaultFocusedTripId(trips),
  );

  useEffect(() => {
    if (trips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    const stillExists = selectedTripId
      ? trips.some((trip) => trip.id === selectedTripId)
      : false;

    if (!stillExists) {
      setSelectedTripId(getDefaultFocusedTripId(trips));
    }
  }, [trips, selectedTripId]);

  // ── GeoJSON loading ───────────────────────────────────────────────────
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGeoJson = async () => {
      const startedAt = Date.now();

      // 1. IndexedDB cache
      const cached = await getCachedGeoJson();
      if (cached && !cancelled) {
        recordLocalUsage({
          service: 'worldmap',
          category: 'local',
          endpoint: 'worldmap/geojson',
          status: 'cache',
          durationMs: Date.now() - startedAt,
          details: { layer: 'indexedDB' },
        });
        setGeoData(cached as GeoJsonObject);
        return;
      }

      // 2. Fetch from CDN
      try {
        const res = await fetch(GEOJSON_URL, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          recordLocalUsage({
            service: 'worldmap',
            category: 'external',
            endpoint: 'worldmap/geojson',
            status: 'error',
            durationMs: Date.now() - startedAt,
            errorReason: `http_${res.status}`,
          });
          throw new Error(`HTTP ${res.status}`);
        }
        const data: GeoJsonObject = await res.json();
        if (!cancelled) {
          recordLocalUsage({
            service: 'worldmap',
            category: 'external',
            endpoint: 'worldmap/geojson',
            status: 'success',
            durationMs: Date.now() - startedAt,
          });
          setGeoData(data);
          setCachedGeoJson(data); // Cache for 30 days
        }
      } catch (err) {
        // 3. Try expired cache
        if (cached && !cancelled) {
          recordLocalUsage({
            service: 'worldmap',
            category: 'external',
            endpoint: 'worldmap/geojson',
            status: 'fallback',
            durationMs: Date.now() - startedAt,
            errorReason: 'expired_cache',
            details: { error: String((err as Error)?.message ?? err) },
          });
          setGeoData(cached as GeoJsonObject);
          return;
        }
        if (!cancelled) {
          recordLocalUsage({
            service: 'worldmap',
            category: 'external',
            endpoint: 'worldmap/geojson',
            status: 'error',
            durationMs: Date.now() - startedAt,
            errorReason: 'network_error',
            details: { error: String((err as Error)?.message ?? err) },
          });
          setGeoError(true);
        }
      }
    };

    loadGeoJson();
    return () => { cancelled = true; };
  }, []);

  // ── GPS ───────────────────────────────────────────────────────────────
  const [gpsPos, setGpsPos] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [centerOnGps, setCenterOnGps] = useState(false);

  const requestGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCenterOnGps(true);
        setGpsLoading(false);
        setTimeout(() => setCenterOnGps(false), 1500);
      },
      () => setGpsLoading(false),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  // ── Computed data ─────────────────────────────────────────────────────
  const tripPoints = useMemo(() => computeTripPoints(trips), [trips]);
  const stats = useMemo(() => computeWorldStats(trips, homeLat, homeLon), [trips, homeLat, homeLon]);
  const badges = useMemo(
    () => computeBadges(stats.totalTrips, stats.uniqueCountries, stats.totalKm, stats.hasOngoing),
    [stats],
  );

  // ── Nav items ─────────────────────────────────────────────────────────
  const VIEW_TABS = [
    { mode: 'map2d' as ViewMode, icon: Map, label: 'Carte 2D' },
    { mode: 'globe3d' as ViewMode, icon: GlobeIcon, label: 'Globe 3D' },
    { mode: 'stats' as ViewMode, icon: Trophy, label: 'Stats' },
  ];

  const statCards = [
    { value: stats.totalTrips, label: 'Voyages', emoji: '✈️', color: COLOR.upcoming },
    { value: stats.uniqueCountries, label: 'Pays', emoji: '🌍', color: COLOR.ongoing },
    { value: `${(stats.totalKm / 1000).toFixed(0)}k`, label: 'Km', emoji: '🚀', color: COLOR.dream },
    { value: `${stats.pctWorld.toFixed(1)}%`, label: 'Monde', emoji: '🌎', color: '#ec4899' },
  ];

  return (
    <div className="min-h-screen relative bg-[#07070b]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-20" />
      </div>

      {/* ═══ Header ═══ */}
      <header className="relative z-20 px-5 pt-safe">
        <div className="max-w-3xl mx-auto pt-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full glass flex items-center justify-center tap"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl font-bold tracking-tighter">Mon Monde</h1>
            <p className="text-xs text-white/45">
              {userName} · {stats.uniqueCountries} pays · {stats.totalKm.toLocaleString('fr-FR')} km
            </p>
          </div>

          {/* Sélecteur vue — harmonisé boutons header MyTrip */}
          <div
            className="flex items-center gap-1 rounded-[22px] p-1"
            style={{
              background: 'rgba(255,255,255,0.065)',
              border: `1px solid ${COLOR.border}`,
              backdropFilter: 'blur(22px) saturate(160%)',
              boxShadow: '0 10px 34px rgba(0,0,0,0.24)',
            }}
          >
            {VIEW_TABS.map(({ mode, icon: Icon, label }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="relative w-10 h-10 rounded-[18px] flex items-center justify-center tap transition-all"
                  style={{
                    background: active ? 'rgba(var(--accent-from-rgb, 124,140,255), 0.22)' : 'rgba(255,255,255,0.02)',
                    border: active ? '1px solid rgba(var(--accent-from-rgb, 124,140,255), 0.38)' : '1px solid transparent',
                    boxShadow: active ? '0 8px 24px rgba(var(--accent-from-rgb, 124,140,255), 0.20)' : 'none',
                  }}
                  aria-label={label}
                  title={label}
                >
                  {active && (
                    <motion.div
                      layoutId="worldViewPill"
                      className="absolute inset-0 rounded-[18px]"
                      style={{ background: 'rgba(255,255,255,0.035)' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    />
                  )}
                  <Icon
                    size={18}
                    className="relative z-10"
                    style={{ color: active ? 'var(--accent-label, #a5b4fc)' : 'rgba(255,255,255,0.52)' }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══ Stats premium compactes ═══ */}
      <div className="relative z-10 px-5 max-w-3xl mx-auto mt-5">
        <div className="grid grid-cols-4 gap-2.5">
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 24 }}
              className="rounded-[20px] px-2.5 py-3 text-center overflow-hidden relative"
              style={{
                background: `linear-gradient(180deg, ${stat.color}18 0%, rgba(255,255,255,0.045) 100%)`,
                border: `1px solid ${stat.color}30`,
                boxShadow: `0 12px 34px ${stat.color}10`,
                backdropFilter: 'blur(18px) saturate(150%)',
              }}
            >
              <div
                className="absolute inset-x-3 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.color}88, transparent)` }}
              />
              <div className="text-base leading-none mb-1">{stat.emoji}</div>
              <div
                className="text-lg font-bold font-display tracking-tighter leading-none"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-[10px] text-white/45 mt-1 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══ Contenu ═══ */}
      <div className="relative z-10 px-5 max-w-3xl mx-auto mt-4 pb-32">
        <AnimatePresence mode="wait">
          {viewMode === 'map2d' && (
            <motion.div
              key="map2d"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Map2DView
                trips={trips}
                geoData={geoData}
                geoError={geoError}
                homeLat={homeLat}
                homeLon={homeLon}
                gpsPos={gpsPos}
                gpsLoading={gpsLoading}
                onRequestGPS={requestGPS}
                centerOnGps={centerOnGps}
                selectedTripId={selectedTripId}
              />

              {/* Liste voyages */}
              {trips.length > 0 ? (
                <TripPanel
                  title="Mes voyages"
                  trips={trips}
                  selectedTripId={selectedTripId}
                  homeLat={homeLat}
                  homeLon={homeLon}
                  onSelectTrip={setSelectedTripId}
                  onOpenTrip={(id) => navigate(`/trip/${id}/overview`)}
                  maxHeight="min(52vh, 620px)"
                />
              ) : (
                <GlassCard className="p-8 text-center">
                  <GlobeIcon size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/45 text-sm">Aucun voyage créé pour l'instant.</p>
                  <p className="text-white/25 text-xs mt-1">Crée ton premier voyage pour le voir sur la carte.</p>
                </GlassCard>
              )}
            </motion.div>
          )}

          {viewMode === 'globe3d' && (
            <motion.div
              key="globe3d"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <Globe3DView
                tripPoints={tripPoints}
                trips={trips}
                geoData={geoData}
                homeLat={homeLat}
                homeLon={homeLon}
              />

              {trips.length > 0 && (
                <TripPanel
                  title="Destinations"
                  trips={trips}
                  selectedTripId={selectedTripId}
                  homeLat={homeLat}
                  homeLon={homeLon}
                  onSelectTrip={setSelectedTripId}
                  onOpenTrip={(id) => navigate(`/trip/${id}/overview`)}
                  maxHeight="min(42vh, 520px)"
                />
              )}
            </motion.div>
          )}

          {viewMode === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <StatsView
                stats={stats}
                badges={badges}
                trips={trips}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
