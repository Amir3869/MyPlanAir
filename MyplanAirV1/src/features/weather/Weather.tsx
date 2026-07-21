// src/features/weather/Weather.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Page Météo — Prévisions 7 jours + détails par période
// Route : /trip/:id/weather (enfant du Cockpit, PAS de header propre)
// V5.1 : Géocodage villes roadtrip via Photon + indicateur ville actuelle
// V5.2 : Cache 2 couches (RAM + localStorage 48h) — quasi plus de spinner
// V5.3 : Fix freeze — useMemo sur destinations + primitives dans useEffect deps
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wind, Droplets, Thermometer, Sun, Sunrise, Sunset,
  RefreshCw, MapPin, Cloud,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { GlassCard } from '../../shared/GlassCard';
import {
  fetchForecast,
  fetchWeather,
  geocodeCity,
  getCachedForecast,
  getCachedWeather,
  getWeatherInfo,
  uvLabel,
  type DailyForecast,
  type WeatherResult,
} from '../../api/weather';
import { CAPITAL_COORDS } from '../../api/cloud';
import { tripStatus } from '../../utils/dateHelpers';
import type { TripDestination } from '../../store/types';

// ─── Périodes (cohérent avec Parcours) ──────────────────────────────────────

const PERIODS = [
  { key: 'morning' as const,   label: 'Matin',      emoji: '🌅', color: '#56c5a4' },
  { key: 'afternoon' as const, label: 'Après-midi', emoji: '☀️', color: '#f0b24a' },
  { key: 'night' as const,     label: 'Soir',       emoji: '🌙', color: '#7c8cff' },
] as const;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getRoadtripDestinationKey = (destination: TripDestination): string =>
  `${destination.city}|${destination.fromDay}|${destination.toDay}`;

// ─── Spinner ────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex flex-col items-center py-12 gap-3">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full"
    />
    <p className="text-sm text-white/40">Chargement des prévisions...</p>
  </div>
);

// ─── Composant : Stat box (Vent/Humidité/UV/Pression) ──────────────────────

const StatBox = ({ icon, value, unit }: {
  icon: React.ReactNode;
  value: string;
  unit: string;
}) => (
  <div
    className="flex flex-col items-center gap-1 p-2.5 rounded-xl"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="text-white/40">{icon}</div>
    <div className="text-sm font-bold font-display tracking-tight">{value}</div>
    <div className="text-[9px] text-white/35 uppercase tracking-wider">{unit}</div>
  </div>
);

// ─── Composant : Period Card (Matin/Après-midi/Soir) ───────────────────────

const PeriodCard = ({ label, emoji, color, temp, humidity, windSpeed }: {
  label: string;
  emoji: string;
  color: string;
  temp: number;
  humidity: number;
  windSpeed: number;
}) => (
  <div
    className="flex flex-col items-center gap-2 p-3 rounded-xl"
    style={{
      background: `${color}10`,
      border: `1px solid ${color}25`,
    }}
  >
    <span className="text-lg">{emoji}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
      {label}
    </span>
    <span className="text-lg font-bold font-display tracking-tight">{temp}°</span>
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-white/35">💧 {humidity}%</span>
      <span className="text-[10px] text-white/35">💨 {windSpeed} km/h</span>
    </div>
  </div>
);

// ─── Composant : Ligne jour (7-day forecast) ───────────────────────────────

const DayRow = ({
  day,
  index,
  overallMin,
  overallRange,
  isExpanded,
  onToggle,
}: {
  day: DailyForecast;
  index: number;
  overallMin: number;
  overallRange: number;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const info = getWeatherInfo(day.weatherCode);
  const leftPct = overallRange > 0 ? ((day.tempMin - overallMin) / overallRange) * 100 : 0;
  const widthPct = overallRange > 0
    ? Math.max(8, ((day.tempMax - day.tempMin) / overallRange) * 100)
    : 80;

  return (
    <div>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl tap transition-colors"
        style={{
          background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
        }}
      >
        {/* Nom du jour */}
        <span className="w-[72px] text-left text-sm font-medium truncate text-white/80">
          {day.dayName}
        </span>

        {/* Icône météo */}
        <span className="text-xl w-7 text-center flex-shrink-0">{info.icon}</span>

        {/* Temp min */}
        <span className="text-sm text-white/40 w-8 text-right flex-shrink-0">
          {day.tempMin}°
        </span>

        {/* Barre gradient relative (Apple Weather style) */}
        <div className="flex-1 h-1.5 rounded-full relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            initial={{ width: 0, x: 0 }}
            animate={{ width: `${widthPct}%`, x: `${leftPct}%` }}
            transition={{ duration: 0.6, delay: index * 0.04 + 0.2, ease: 'easeOut' }}
            className="absolute h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
            }}
          />
        </div>

        {/* Temp max */}
        <span className="text-sm font-semibold w-8 flex-shrink-0">{day.tempMax}°</span>

        {/* Humidité + Précipitation */}
        <div className="flex items-center gap-1.5 w-16 justify-end flex-shrink-0">
          {day.precipitation > 0 && (
            <span className="text-[10px] text-blue-300/70">
              🌧️{day.precipitation.toFixed(0)}
            </span>
          )}
          <span className="text-[10px] text-white/30">
            💧{day.humidity}%
          </span>
        </div>
      </motion.button>

      {/* Détail expandu : 3 périodes */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              <PeriodCard
                label={PERIODS[0].label}
                emoji={PERIODS[0].emoji}
                color={PERIODS[0].color}
                temp={day.morning.temp}
                humidity={day.morning.humidity}
                windSpeed={day.morning.windSpeed}
              />
              <PeriodCard
                label={PERIODS[1].label}
                emoji={PERIODS[1].emoji}
                color={PERIODS[1].color}
                temp={day.afternoon.temp}
                humidity={day.afternoon.humidity}
                windSpeed={day.afternoon.windSpeed}
              />
              <PeriodCard
                label={PERIODS[2].label}
                emoji={PERIODS[2].emoji}
                color={PERIODS[2].color}
                temp={day.night.temp}
                humidity={day.night.humidity}
                windSpeed={day.night.windSpeed}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE MÉTÉO — PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export const Weather = () => {
  const { trip } = useTripContext();

  // ── Roadtrip : index ville sélectionnée ────────────────────────────────
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);

  // ── Données météo ──────────────────────────────────────────────────────
  const [activeCoords, setActiveCoords] = useState<{
    lat: number; lon: number; name: string; isFallback: boolean;
  } | null>(null);
  const [forecast, setForecast]         = useState<DailyForecast[] | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherResult | null>(null);
  const [loading, setLoading]           = useState(true);
  const [offline, setOffline]           = useState(false);
  const [expandedDay, setExpandedDay]   = useState<number | null>(0);
  const [noCoords, setNoCoords]         = useState(false);

  // ── Destinations roadtrip — MEMOIZÉ pour éviter boucle infinie ────────
  // ⚠️ Si on fait `trip.destinations ?? []` directement, ça crée un nouveau
  // tableau à chaque render → le useEffect se relance → setStates → re-render → ♾️ freeze
  const destinations: TripDestination[] = useMemo(
    () => trip.destinations ?? [],
    [trip.destinations]
  );

  const isRoadtrip = !!(trip.isRoadtrip && destinations.length > 0);

  const repeatedCityNames = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach((dest) => {
      const key = dest.city.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [destinations]);

  // ── Statut voyage ──────────────────────────────────────────────────────
  const status = tripStatus(trip.startDate, trip.endDate);
  const isPast = status === 'finished';

  // ── Ville actuelle (pour indicateur vert dans les pills) ───────────────
  const currentCityIdx = useMemo(() => {
    if (!isRoadtrip || destinations.length === 0) return -1;
    const s = tripStatus(trip.startDate, trip.endDate);
    if (s !== 'ongoing') return -1;
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const currentDay = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    const idx = destinations.findIndex(d => currentDay >= d.fromDay && currentDay <= d.toDay);
    return idx >= 0 ? idx : -1;
  }, [isRoadtrip, destinations, trip.startDate, trip.endDate]);

  // ── Auto-sélection ville (selon jour du voyage) ───────────────────────
  useEffect(() => {
    if (!isRoadtrip) return;
    const s = tripStatus(trip.startDate, trip.endDate);
    if (s === 'ongoing') {
      const now = new Date();
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      now.setHours(12, 0, 0, 0);
      const currentDay = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
      const idx = destinations.findIndex(d => currentDay >= d.fromDay && currentDay <= d.toDay);
      if (idx >= 0) setSelectedCityIdx(idx);
    } else if (s === 'upcoming') {
      setSelectedCityIdx(0);
    } else {
      setSelectedCityIdx(destinations.length - 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, isRoadtrip]);

  // ── Résoudre coordonnées + fetch prévisions ────────────────────────────
  // V5.3 : FIX FREEZE — dépendances primitives seulement, pas d'objets
  // trip.id, trip.lat, trip.lon, trip.countryCode, trip.destination
  // au lieu de `trip` (qui change de référence à chaque render)
  useEffect(() => {
    if (isPast) {
      setActiveCoords(null);
      setForecast(null);
      setCurrentWeather(null);
      setOffline(false);
      setNoCoords(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setOffline(false);
      setNoCoords(false);
      setCurrentWeather(null);

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 0 : Lecture synchrone du cache → affichage instantané
      // ══════════════════════════════════════════════════════════════════
      let hasInstantCache = false;

      // Coords connues immédiatement (sans géocodage)
      let instantLat: number | undefined, instantLon: number | undefined;
      if (isRoadtrip) {
        const dest = destinations[selectedCityIdx] ?? destinations[0];
        const destLat = dest?.lat;
        const destLon = dest?.lon;
        if (isFiniteNumber(destLat) && isFiniteNumber(destLon)) {
          instantLat = destLat;
          instantLon = destLon;
        }
      } else {
        const tripLat = trip.lat;
        const tripLon = trip.lon;
        if (isFiniteNumber(tripLat) && isFiniteNumber(tripLon)) {
          instantLat = tripLat;
          instantLon = tripLon;
        }
      }

      if (isFiniteNumber(instantLat) && isFiniteNumber(instantLon)) {
        const cachedWeather = getCachedWeather(instantLat, instantLon);
        if (cachedWeather?.ok) {
          setCurrentWeather(cachedWeather);
        }

        const cached = getCachedForecast(instantLat, instantLon);
        if (cached?.ok && cached.days.length > 0) {
          // ✅ Données en cache → affichage immédiat, PAS de spinner
          setForecast(cached.days);
          setLoading(false);
          hasInstantCache = true;

          // Mettre à jour les coords actives
          const locName = isRoadtrip
            ? ((destinations[selectedCityIdx] ?? destinations[0])?.city ?? trip.destination)
            : trip.destination;
          setActiveCoords(prev => {
            if (prev && prev.lat === instantLat && prev.lon === instantLon && prev.name === locName && prev.isFallback === false) {
              return prev; // ⚠️ Même référence → pas de re-render
            }
            return { lat: instantLat, lon: instantLon, name: locName, isFallback: false };
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 1 : Résoudre les coordonnées (avec géocodage si nécessaire)
      // ══════════════════════════════════════════════════════════════════
      let lat: number | undefined;
      let lon: number | undefined;
      let locName = '';
      let locFallback = false;

      if (isRoadtrip) {
        const dest = destinations[selectedCityIdx] ?? destinations[0];
        if (!dest) {
          if (!cancelled) {
            setActiveCoords(null);
            setCurrentWeather(null);
            setNoCoords(true);
            setLoading(false);
          }
          return;
        }

        locName = dest.city;

        const destLat = dest.lat;
        const destLon = dest.lon;
        if (isFiniteNumber(destLat) && isFiniteNumber(destLon)) {
          lat = destLat;
          lon = destLon;
        } else {
          const geo = await geocodeCity(dest.city, trip.countryCode);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
            if (geo.isFallback) {
              locFallback = true;
              locName = geo.fallbackName ?? dest.city;
            }
          }
        }

        if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
          const cap = CAPITAL_COORDS[trip.countryCode];
          if (cap) {
            lat = cap.lat;
            lon = cap.lon;
            locFallback = true;
            locName = cap.name;
          }
        }
      } else {
        locName = trip.destination;

        const tripLat = trip.lat;
        const tripLon = trip.lon;
        if (isFiniteNumber(tripLat) && isFiniteNumber(tripLon)) {
          lat = tripLat;
          lon = tripLon;
        } else {
          const cap = CAPITAL_COORDS[trip.countryCode];
          if (cap) {
            lat = cap.lat;
            lon = cap.lon;
            locFallback = true;
            locName = cap.name;
          }
        }
      }

      // Aucune coordonnée trouvée
      if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
        if (!cancelled) {
          setActiveCoords(null);
          setCurrentWeather(null);
          setNoCoords(true);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setActiveCoords(prev => {
          if (prev && prev.lat === lat && prev.lon === lon && prev.name === locName && prev.isFallback === locFallback) {
            return prev; // ⚠️ Même référence → pas de re-render
          }
          return { lat, lon, name: locName, isFallback: locFallback };
        });
      }

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 2 : Fetch prévisions
      // ══════════════════════════════════════════════════════════════════
      if (!hasInstantCache) {
        setLoading(true);
      }

      try {
        const [forecastResult, currentResult] = await Promise.all([
          fetchForecast(lat, lon),
          fetchWeather(lat, lon),
        ]);

        if (!cancelled) {
          if (currentResult.ok) {
            setCurrentWeather(currentResult);
          } else {
            setCurrentWeather(null);
          }

          if (forecastResult.ok) {
            setForecast(forecastResult.days);
            setOffline(false);
          } else if (!hasInstantCache) {
            setOffline(true);
          }
        }
      } catch {
        if (!cancelled && !hasInstantCache) {
          setCurrentWeather(null);
          setOffline(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // ⚠️ FIX FREEZE : primitives seulement dans les dépendances
    // trip.lat, trip.lon, trip.countryCode, trip.destination au lieu de `trip`
    // destinations (memoized) au lieu de `trip.destinations ?? []`
  }, [
    isPast,
    isRoadtrip,
    destinations,
    selectedCityIdx,
    trip.id,
    trip.lat,
    trip.lon,
    trip.countryCode,
    trip.destination,
    trip.startDate,
    trip.endDate,
  ]);

  const isFutureForecastWindow = useMemo(() => {
    if (status !== 'upcoming') return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const daysUntilStart = Math.round((start.getTime() - now.getTime()) / 86400000);
    return daysUntilStart > 7;
  }, [status, trip.startDate]);

  // ── Températures globales (pour barre gradient relative) ───────────────
  const { overallMin, overallRange } = useMemo(() => {
    if (!forecast || forecast.length === 0) return { overallMin: 0, overallRange: 1 };
    const allTemps = forecast.flatMap(d => [d.tempMax, d.tempMin]);
    const min = Math.min(...allTemps);
    const max = Math.max(...allTemps);
    return { overallMin: min, overallRange: max - min || 1 };
  }, [forecast]);

  // ── Aujourd'hui (pour hero card + prévisions) ──────────────────────────
  const today = forecast?.[0] ?? null;
  const current = currentWeather?.ok ? currentWeather : null;
  const heroInfo = current
    ? { icon: current.icon, label: current.label, temp: current.temp }
    : today
    ? {
        icon: getWeatherInfo(today.weatherCode).icon,
        label: getWeatherInfo(today.weatherCode).label,
        temp: today.tempMax,
      }
    : null;

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Titre + localisation ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cloud size={18} style={{ color: 'var(--accent-label)' }} />
            <span className="font-display text-xl font-bold tracking-tighter">Météo</span>
          </div>
          <div className="text-sm text-white/50 mt-0.5 flex items-center gap-1.5">
            <MapPin size={11} className="text-white/30" />
            {isPast
              ? 'Prévisions non disponibles'
              : activeCoords
              ? (activeCoords.isFallback
                ? `📍 Capitale · ${activeCoords.name}`
                : `📍 ${activeCoords.name}`)
              : noCoords
              ? 'Coordonnées non disponibles'
              : 'Chargement...'
            }
          </div>
        </div>
      </div>

      {/* ── Roadtrip : Pills villes + indicateur ville actuelle ── */}
      {isRoadtrip && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {destinations.map((dest, i) => {
            const active = i === selectedCityIdx;
            const isCurrent = i === currentCityIdx;
            return (
              <button
                key={`${getRoadtripDestinationKey(dest)}-${i}`}
                onClick={() => { setSelectedCityIdx(i); setExpandedDay(0); }}
                className="pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap tap transition-all"
                style={{
                  background: active
                    ? 'rgba(var(--accent-from-rgb), 0.18)'
                    : 'rgba(255,255,255,0.04)',
                  border: active
                    ? '1px solid rgba(var(--accent-from-rgb), 0.35)'
                    : isCurrent
                    ? '1px solid rgba(86,197,164,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: active ? 'var(--accent-label)' : 'rgba(255,255,255,0.55)',
                }}
              >
                {/* Indicateur ville actuelle (point vert) */}
                {isCurrent && !active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                    style={{ background: '#56c5a4' }}
                  />
                )}
                {dest.city}
                {(repeatedCityNames.get(dest.city.trim().toLowerCase()) ?? 0) > 1 && (
                  <span className="text-[10px] text-white/35 font-semibold">
                    J{dest.fromDay}{dest.toDay !== dest.fromDay ? `-${dest.toDay}` : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── ÉTAT 1 : Voyage passé ── */}
      {isPast && (
        <GlassCard className="p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-display text-lg font-bold tracking-tight mb-2">
            Historique non disponible
          </h3>
          <p className="text-white/45 text-sm leading-relaxed">
            Les prévisions météo ne sont pas disponibles<br />
            pour les voyages passés.
          </p>
        </GlassCard>
      )}

      {/* ── ÉTAT 2 : Pas de coordonnées ── */}
      {!isPast && noCoords && !loading && (
        <GlassCard className="p-8 text-center">
          <div className="text-5xl mb-4">🌍</div>
          <h3 className="font-display text-lg font-bold tracking-tight mb-2">
            Localisation indisponible
          </h3>
          <p className="text-white/45 text-sm leading-relaxed">
            Les coordonnées de cette destination<br />
            ne sont pas disponibles.
          </p>
        </GlassCard>
      )}

      {/* ── ÉTAT 3 : Hors ligne ── */}
      {!isPast && !noCoords && offline && !loading && (
        <GlassCard className="p-8 text-center">
          <div className="text-5xl mb-4">📶</div>
          <h3 className="font-display text-lg font-bold tracking-tight mb-2">
            Météo indisponible
          </h3>
          <p className="text-white/45 text-sm leading-relaxed mb-5">
            Connecte-toi pour voir les prévisions<br />
            météo de ta destination.
          </p>
          {activeCoords && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setOffline(false);
                setLoading(true);
                Promise.all([
                  fetchForecast(activeCoords.lat, activeCoords.lon),
                  fetchWeather(activeCoords.lat, activeCoords.lon),
                ]).then(([forecastResult, currentResult]) => {
                  if (currentResult.ok) setCurrentWeather(currentResult);
                  else setCurrentWeather(null);

                  if (forecastResult.ok) setForecast(forecastResult.days);
                  else setOffline(true);
                  setLoading(false);
                }).catch(() => {
                  setCurrentWeather(null);
                  setOffline(true);
                  setLoading(false);
                });
              }}
              className="h-10 px-5 rounded-2xl font-semibold text-white inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              }}
            >
              <RefreshCw size={14} /> Réessayer
            </motion.button>
          )}
        </GlassCard>
      )}

      {/* ── ÉTAT 4 : Chargement ── */}
      {!isPast && !noCoords && !offline && loading && <Spinner />}

      {/* ── ÉTAT 5 : Données chargées ── */}
      {!isPast && !noCoords && !offline && !loading && forecast && forecast.length > 0 && (
        <>
          {/* ── HERO CARD : Météo d'aujourd'hui ── */}
          {today && heroInfo && (
            <GlassCard className="p-5">
              {/* Icône grande + température */}
              <div className="flex items-start gap-4 mb-4">
                <div className="text-[56px] leading-none">
                  {heroInfo.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white/55">
                    {heroInfo.label}
                  </div>
                  <div className="text-4xl font-bold font-display tracking-tighter">
                    {heroInfo.temp}°C
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Thermometer size={11} className="text-white/30" />
                    <span className="text-xs text-white/40">
                      {current
                        ? `Ressenti ${current.feelsLike}°C`
                        : `Prévision du jour · ${today.tempMin}° / ${today.tempMax}°`}
                    </span>
                  </div>
                </div>
                {/* Badge source */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: current ? 'rgba(86,197,164,0.15)' : 'rgba(255,255,255,0.06)',
                    border: current ? '1px solid rgba(86,197,164,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    color: current ? '#56c5a4' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {current && <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4] inline-block pulse-dot" />}
                  {current ? 'LIVE' : 'PRÉVISION'}
                </div>
              </div>

              {/* 4 stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <StatBox
                  icon={<Wind size={12} />}
                  value={`${current?.wind ?? today.windSpeed}`}
                  unit="km/h"
                />
                <StatBox
                  icon={<Droplets size={12} />}
                  value={`${current?.humidity ?? today.humidity}%`}
                  unit="Hum."
                />
                <StatBox
                  icon={<Sun size={12} />}
                  value={`${today.uvIndex}`}
                  unit={uvLabel(today.uvIndex)}
                />
                <StatBox
                  icon={<Thermometer size={12} />}
                  value={`${today.pressure}`}
                  unit="hPa"
                />
              </div>

              {/* Sunrise / Sunset */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1.5 text-xs text-white/45">
                  <Sunrise size={12} className="text-amber-400/60" />
                  {today.sunrise}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/45">
                  <Sunset size={12} className="text-indigo-400/60" />
                  {today.sunset}
                </div>
              </div>

              {/* Précipitation */}
              {today.precipitation > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-blue-300/60 mb-2">
                  🌧️ {today.precipitation.toFixed(1)} mm
                </div>
              )}

              {/* Source */}
              <div className="text-[10px] text-white/25 mt-2">
                {activeCoords?.isFallback
                  ? `📍 Capitale (${activeCoords.name})`
                  : `📍 ${activeCoords?.name ?? ''}`
                } · Open-Meteo
              </div>
            </GlassCard>
          )}

          {/* ── PRÉVISIONS 7 JOURS ── */}
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs uppercase tracking-wider text-white/55 font-semibold">
                {isFutureForecastWindow ? 'Prévisions actuelles à destination' : 'Prévisions 7 jours'}
              </span>
            </div>

            {isFutureForecastWindow && (
              <div className="px-4 pb-3 text-[11px] text-white/35 leading-relaxed">
                Les prévisions exactes de ton voyage seront disponibles à l’approche du départ.
              </div>
            )}

            <div className="divide-y divide-white/[0.04]">
              {forecast.map((day, index) => (
                <DayRow
                  key={day.date}
                  day={day}
                  index={index}
                  overallMin={overallMin}
                  overallRange={overallRange}
                  isExpanded={expandedDay === index}
                  onToggle={() => setExpandedDay(expandedDay === index ? null : index)}
                />
              ))}
            </div>
          </GlassCard>

          {/* ── Lien source Open-Meteo ── */}
          <div className="text-center text-[10px] text-white/20 mt-2">
            Données Open-Meteo · cache local jusqu’à 48h
          </div>
        </>
      )}
    </motion.div>
  );
};
