// src/features/dashboard/Dashboard.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Home — Route "/"
// Landing page : carte voyage + grille 2×2 + section ARIA conversationnelle
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plane, Map, MessageCircle, Search, Sparkles, MapPin,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useTripStore, type Trip } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { BellWithBadge, NotificationCenter, useNotificationGenerator } from '../notifications/NotificationCenter';
import { tripStatus, dayCounter, fmtRange, getTripProgress } from '../../utils/dateHelpers';
import { fmtMoney } from '../../utils/formatters';
import { haversineKm } from '../../utils/geo';
import { nameToHue, nameToInitials } from '../../store/types';
import { RoadtripDots, ItineraryLine } from '../../shared/RoadtripDots';
import { TripCreator } from '../trips/TripCreator';
import { TravelPrepSheet } from '../travelPrep/TravelPrepSheet';
import { haptic } from '../../utils/haptic';
import { getExpensesBudgetTotal } from '../../utils/expenseHelpers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return 'Bonjour';
  return 'Bonsoir';
};

const formatDate = (): string => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const formatLocalTime = (lat?: number, lon?: number): string | null => {
  if (!lat || !lon) return null;
  try {
    const offset = Math.round(lon / 15);
    const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
    const local = new Date(utc + offset * 3600000);
    return local.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
};

const getHomeTime = (): string => {
  try {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  } catch {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
};

const isValidCoord = (lat?: number, lon?: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lon);

const getTripReferenceCoords = (trip: Trip): { lat: number; lon: number } | null => {
  if (isValidCoord(trip.lat, trip.lon)) {
    return { lat: trip.lat!, lon: trip.lon! };
  }

  const destinations = trip.destinations ?? [];
  if (destinations.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const activeDestination = destinations.find((dest) =>
    dest.fromDate <= today && today <= dest.toDate && isValidCoord(dest.lat, dest.lon),
  );

  const fallbackDestination = activeDestination
    ?? destinations.find((dest) => isValidCoord(dest.lat, dest.lon));

  return fallbackDestination && isValidCoord(fallbackDestination.lat, fallbackDestination.lon)
    ? { lat: fallbackDestination.lat!, lon: fallbackDestination.lon! }
    : null;
};

const getDistanceFromHome = (
  lat?: number,
  lon?: number,
  homeLat?: number,
  homeLon?: number,
): number | null => {
  if (!isValidCoord(lat, lon) || !isValidCoord(homeLat, homeLon)) return null;
  return Math.round(haversineKm(homeLat!, homeLon!, lat!, lon!));
};

const getTripDistanceFromHome = (
  trip: Pick<Trip, 'lat' | 'lon' | 'isRoadtrip' | 'destinations'>,
  homeLat?: number,
  homeLon?: number,
): number => {
  if (!isValidCoord(homeLat, homeLon)) return 0;

  const roadtripCoords = (trip.destinations ?? [])
    .filter((dest) => isValidCoord(dest.lat, dest.lon))
    .map((dest) => ({ lat: dest.lat!, lon: dest.lon! }));

  if (trip.isRoadtrip && roadtripCoords.length > 0) {
    let distance = haversineKm(homeLat!, homeLon!, roadtripCoords[0].lat, roadtripCoords[0].lon);

    for (let i = 1; i < roadtripCoords.length; i += 1) {
      distance += haversineKm(
        roadtripCoords[i - 1].lat,
        roadtripCoords[i - 1].lon,
        roadtripCoords[i].lat,
        roadtripCoords[i].lon,
      );
    }

    const last = roadtripCoords[roadtripCoords.length - 1];
    distance += haversineKm(last.lat, last.lon, homeLat!, homeLon!);
    return distance;
  }

  const referenceCoords = getTripReferenceCoords(trip as Trip);
  if (!referenceCoords) return 0;

  return haversineKm(homeLat!, homeLon!, referenceCoords.lat, referenceCoords.lon) * 2;
};

// ─── FlagBadge ───────────────────────────────────────────────────────────────

const FlagBadge = ({ countryCode, countryName }: { countryCode: string; countryName: string }) => {
  const cc = (countryCode || '').toUpperCase();
  const getFlagEmoji = (code: string): string => {
    if (code.length !== 2) return '🌍';
    const A = 0x1f1e6;
    try {
      return String.fromCodePoint(A + code.charCodeAt(0) - 65) + String.fromCodePoint(A + code.charCodeAt(1) - 65);
    } catch { return '🌍'; }
  };
  const flagStyle: React.CSSProperties = {
    fontSize: '14px', lineHeight: '1', display: 'inline-block',
    fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif',
    userSelect: 'none', letterSpacing: '0',
  };
  return (
    <div className="glass-strong pill px-2.5 py-1 flex items-center gap-1.5">
      <span aria-label={`Drapeau ${countryName}`} role="img" style={flagStyle}>{getFlagEmoji(cc)}</span>
      <span className="text-[11px] font-semibold tracking-tight">{countryName}</span>
    </div>
  );
};

// ─── Status Pill ─────────────────────────────────────────────────────────────

type StatusType = 'upcoming' | 'ongoing' | 'finished';

const STATUS_LABEL: Record<StatusType, { label: string; color: string }> = {
  upcoming: { label: 'À venir', color: '#7c8cff' },
  ongoing:  { label: 'En cours', color: '#56c5a4' },
  finished: { label: 'Terminé', color: 'rgba(255,255,255,0.45)' },
};

const StatusPill = ({ status }: { status: StatusType }) => {
  const info = STATUS_LABEL[status];
  const isOngoing = status === 'ongoing';
  return (
    <div
      className="pill px-3 py-1.5 flex items-center gap-2 backdrop-blur-xl"
      style={{
        background: status === 'upcoming'
          ? 'rgba(var(--accent-from-rgb), 0.18)'
          : isOngoing
          ? 'linear-gradient(135deg, rgba(86,197,164,0.34), rgba(86,197,164,0.16))'
          : `${info.color}26`,
        border: status === 'upcoming'
          ? '1px solid rgba(var(--accent-from-rgb), 0.38)'
          : isOngoing
          ? '1px solid rgba(86,197,164,0.68)'
          : `1px solid ${info.color}55`,
        boxShadow: isOngoing ? '0 0 22px rgba(86,197,164,0.20)' : undefined,
      }}
    >
      {isOngoing && <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: info.color, boxShadow: '0 0 10px rgba(86,197,164,0.75)' }} />}
      <span className="text-xs font-semibold" style={{ color: status === 'upcoming' ? 'var(--accent-label)' : info.color }}>
        {info.label}
      </span>
    </div>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

const Avatar = ({ name, photoUrl, onClick }: { name: string; photoUrl: string | null; onClick: () => void }) => {
  const initials = nameToInitials(name);
  const hue = nameToHue(name);
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center tap relative overflow-hidden"
      style={{
        background: photoUrl ? 'transparent' : `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`,
        border: '2px solid rgba(255,255,255,0.15)',
      }}
      aria-label="Mon profil"
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="absolute inset-0 w-full h-full object-cover rounded-full" />
      ) : (
        <span className="font-bold text-sm text-white">{initials}</span>
      )}
    </button>
  );
};

// ─── Carte Voyage En Cours (200px + progress bar) ────────────────────────────

const CurrentTripCard = ({ trip }: { trip: Pick<Trip, 'id' | 'destination' | 'country' | 'countryCode' | 'startDate' | 'endDate' | 'photoUrl' | 'budget' | 'currency' | 'isRoadtrip' | 'lat' | 'lon' | 'expenses' | 'destinations'> }) => {
  const navigate = useNavigate();
  const status = tripStatus(trip.startDate, trip.endDate) as StatusType;
  const counter = dayCounter(trip.startDate, trip.endDate);
  const progress = getTripProgress(trip.startDate, trip.endDate);

  const destinationLabel = trip.isRoadtrip ? trip.country : trip.destination;
  const subLabel = trip.isRoadtrip ? 'Roadtrip' : trip.country;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-[24px] overflow-hidden cursor-pointer tap"
      style={{ height: 200, boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}
      onClick={() => navigate(`/trip/${trip.id}/overview`)}
    >
      {trip.photoUrl ? (
        <img src={trip.photoUrl} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,140,255,0.3), rgba(236,72,153,0.2))' }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.55) 60%,rgba(0,0,0,0.85) 100%)' }} />

      {/* TOP */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
        <FlagBadge countryCode={trip.countryCode} countryName={trip.country} />
        <div className="flex items-center gap-2">
          {trip.isRoadtrip && (
            <div
              className="pill px-2.5 py-1.5 flex items-center gap-1.5 backdrop-blur-xl"
              style={{ background: 'rgba(var(--accent-from-rgb), 0.18)', border: '1px solid rgba(var(--accent-from-rgb), 0.38)' }}
            >
              <Map size={11} style={{ color: 'var(--accent-label)' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-label)' }}>Roadtrip</span>
            </div>
          )}
          <StatusPill status={status} />
        </div>
      </div>

      {/* BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="text-2xl font-bold font-display tracking-tighter leading-tight">
          {destinationLabel}
          <span className="text-white/55 font-semibold"> — {subLabel}</span>
        </div>
        {/* Ligne itinéraire roadtrip */}
        {trip.isRoadtrip && trip.destinations && trip.destinations.length > 1 && (
          <ItineraryLine destinations={trip.destinations} className="mt-0.5" />
        )}
        <div className="text-sm text-white/65 mt-1 mb-2">{fmtRange(trip.startDate, trip.endDate)}</div>
        <div className="flex items-center justify-between gap-3">
          <div className="pill px-3 py-1 glass-strong text-xs font-semibold">{counter}</div>
          {trip.budget > 0 && <div className="text-xs text-white/60 font-medium">{fmtMoney(trip.budget, trip.currency)}</div>}
        </div>
        {/* Roadtrip dots */}
        {trip.isRoadtrip && trip.destinations && trip.destinations.length > 1 && (
          <RoadtripDots destinations={trip.destinations} status={status} className="mt-2.5" />
        )}
      </div>

      {/* Progress bar — thin bar gradient + glow */}
      {progress !== null && (
        <div className="absolute bottom-0 left-0 right-0 h-[4px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            className="h-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
              boxShadow: '0 0 12px rgba(var(--accent-from-rgb), 0.5)',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

// ─── Grille 2×2 ─────────────────────────────────────────────────────────────

const GRID_STAGGER = 0.06;

const GridCard = ({
  emoji, label, value, sublabel, accentColor, onClick, index,
}: {
  emoji: string; label: string; value: string; sublabel: string; accentColor: string; onClick: () => void; index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * GRID_STAGGER }}
  >
    <GlassCard onClick={onClick} className="p-4 cursor-pointer relative overflow-hidden">
      <div className="text-xs font-semibold tracking-wider text-white/45 uppercase flex items-center gap-1.5 mb-2">
        <span
          className="text-base"
          style={{ filter: 'saturate(1.35) brightness(1.16)', textShadow: `0 0 12px ${accentColor}66` }}
        >
          {emoji}
        </span> {label}
      </div>
      <div className="text-lg font-bold font-display tracking-tighter leading-tight mb-0.5">{value}</div>
      <div className="text-[11px] text-white/40 leading-tight">{sublabel}</div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
    </GlassCard>
  </motion.div>
);

// ─── Section ARIA ────────────────────────────────────────────────────────────

const AriaSection = ({ currentTrip }: { currentTrip: Pick<Trip, 'destination' | 'country' | 'isRoadtrip' | 'id' | 'startDate' | 'endDate'> | null }) => {
  const navigate = useNavigate();

  const ariaMessage = useMemo(() => {
    const hour = new Date().getHours();
    if (!currentTrip) {
      if (hour >= 6 && hour < 18) return "Un nouveau jour, une nouvelle destination ? Laisse-moi t'inspirer.";
      if (hour >= 18 && hour < 22) return "Réfléchis à ta prochaine escapade pendant que tu te détends.";
      return "Même la nuit, on peut rêver de voyage. Où veux-tu aller ?";
    }
    const status = tripStatus(currentTrip.startDate, currentTrip.endDate);
    const dest = currentTrip.isRoadtrip ? currentTrip.country : currentTrip.destination;
    if (status === 'ongoing') return `Tu es en voyage à ${dest} ! Des questions sur ta destination ? Je peux t'aider en temps réel.`;
    if (status === 'upcoming') return `Ton départ pour ${dest} approche ! Je peux t'aider à préparer ton voyage.`;
    return `De retour de ${dest} ? Raconte-moi tes impressions ou planifions ta prochaine aventure !`;
  }, [currentTrip]);

  return (
    <GlassCard className="p-5">
      {/* En-tête ARIA */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-xl">✨</span>
        <div>
          <div className="text-sm font-semibold tracking-tight">ARIA</div>
          <div className="text-[10px] text-white/35">Ton assistant voyage</div>
        </div>
      </div>

      {/* Bulle de chat */}
      <div
        className="rounded-2xl rounded-tl-md p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm text-white/60 leading-relaxed">{ariaMessage}</p>
      </div>

      {/* ✨ Boutons — Design A : Glass + Glow dessous */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/decouvrir')}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold tap"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.80)',
            boxShadow: '0 4px 20px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.1) inset',
          }}
        >
          <Search size={15} /> Découvrir
        </button>
        <button
          onClick={() => currentTrip ? navigate(`/trip/${currentTrip.id}/chat`) : navigate('/decouvrir')}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold tap"
          style={{
            background: 'rgba(var(--accent-from-rgb), 0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(var(--accent-from-rgb), 0.25)',
            color: 'var(--accent-label)',
            boxShadow: '0 4px 24px rgba(var(--accent-from-rgb), 0.20), 0 1px 0 rgba(255,255,255,0.1) inset',
          }}
        >
          <MessageCircle size={15} /> Discuter
        </button>
      </div>
    </GlassCard>
  );
};

// ─── Dashboard Principal ─────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useClerk();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [prepTrip, setPrepTrip] = useState<Trip | null>(null);

  const trips        = useTripStore((s) => s.trips);
  const userName     = useTripStore((s) => s.userName);
  const userPhotoUrl = useTripStore((s) => s.userPhotoUrl);
  const homeLat      = useTripStore((s) => s.homeLat);
  const homeLon      = useTripStore((s) => s.homeLon);

  useNotificationGenerator();

  const avatarUrl = userPhotoUrl ?? user?.imageUrl ?? null;

  const currentTrip = useMemo(() => {
    const ongoing = trips.find((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');
    if (ongoing) return ongoing;
    const upcoming = trips
      .filter((t) => tripStatus(t.startDate, t.endDate) === 'upcoming')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return upcoming[0] ?? null;
  }, [trips]);

  const stats = useMemo(() => {
    const finishedTrips = trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'finished');
    const travelledTrips = trips.filter((t) => {
      const status = tripStatus(t.startDate, t.endDate);
      return status === 'finished' || status === 'ongoing';
    });
    const uniqueCountries = new Set(trips.map((t) => t.countryCode)).size;
    const totalKm = travelledTrips.reduce(
      (sum, trip) => sum + getTripDistanceFromHome(trip, homeLat, homeLon),
      0,
    );
    return { totalTrips: trips.length, uniqueCountries, totalKm, finishedTrips: finishedTrips.length };
  }, [trips, homeLat, homeLon]);

  // Widget heure locale — contextuel
  const timeWidget = useMemo(() => {
    if (!currentTrip) {
      if (stats.finishedTrips > 0) return { type: 'lastTrip' as const };
      return null;
    }
    const status = tripStatus(currentTrip.startDate, currentTrip.endDate);
    const referenceCoords = getTripReferenceCoords(currentTrip);
    if (status === 'ongoing') {
      return {
        type: 'home' as const,
        time: getHomeTime(),
        distance: getDistanceFromHome(referenceCoords?.lat, referenceCoords?.lon, homeLat, homeLon),
        destination: currentTrip.isRoadtrip ? currentTrip.country : currentTrip.destination,
      };
    }
    if (status === 'upcoming') {
      const destTime = formatLocalTime(referenceCoords?.lat, referenceCoords?.lon);
      if (destTime) return { type: 'destination' as const, time: destTime, destination: currentTrip.isRoadtrip ? currentTrip.country : currentTrip.destination };
      return { type: 'lastTrip' as const };
    }
    return { type: 'lastTrip' as const };
  }, [currentTrip, stats.finishedTrips, homeLat, homeLon]);

  // Widget budget — contextuel
  const budgetWidget = useMemo(() => {
    if (!currentTrip || currentTrip.budget <= 0) return null;
    const status = tripStatus(currentTrip.startDate, currentTrip.endDate);
    if (status === 'ongoing') {
      const spent = getExpensesBudgetTotal(currentTrip.expenses, currentTrip.currency);
      const pct = Math.min(100, Math.round((spent / currentTrip.budget) * 100));
      return { type: 'spent' as const, spent, budget: currentTrip.budget, currency: currentTrip.currency, pct };
    }
    return { type: 'planned' as const, budget: currentTrip.budget, currency: currentTrip.currency };
  }, [currentTrip]);

  const greeting = getGreeting();
  const dateStr = formatDate();
  const ambientPhotoUrl = currentTrip?.photoUrl ?? trips[0]?.photoUrl ?? null;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-[#07070b] pointer-events-none" style={{ zIndex: 0 }} />

      {ambientPhotoUrl && (
        <div
          className="fixed inset-0 bg-cover bg-center pointer-events-none"
          style={{
            zIndex:          1,
            backgroundImage: `url(${ambientPhotoUrl})`,
            filter:          'blur(18px) saturate(135%) brightness(0.95)',
            transform:       'scale(1.08)',
            opacity:         0.62,
          }}
        />
      )}

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'linear-gradient(180deg, rgba(7,7,11,0.30) 0%, rgba(7,7,11,0.62) 48%, rgba(7,7,11,0.88) 100%)',
        }}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 3 }}>
        <div className="aurora opacity-5" />
      </div>

      {/* ── Header — logo à l’emplacement initial + greeting ── */}
      <header className="relative z-10 px-5 pt-safe max-w-3xl mx-auto overflow-x-clip">
        <div className="flex items-start justify-between gap-3 pt-5">
          <div className="min-w-0 flex-1">
            <div className="w-[190px] h-9 overflow-hidden flex items-center justify-center mb-1 pointer-events-none">
              <img
                src="/brand/logo-dashboard.svg"
                alt="My Plan'Air"
                className="max-w-none object-contain"
                style={{ width: 608, height: 140, transform: 'translateX(-28px)' }}
              />
            </div>
            <div className="text-sm text-white/55 truncate">
              {greeting} <span className="text-white/80 font-semibold">{userName}</span>
            </div>
            <div className="text-xs text-white/30 mt-0.5 capitalize">{dateStr}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <BellWithBadge onClick={() => setNotifOpen(true)} />
            <Avatar name={userName} photoUrl={avatarUrl} onClick={() => navigate('/profil')} />
          </div>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="relative z-10 px-5 pb-28 max-w-3xl mx-auto mt-8 space-y-4">

        {currentTrip ? (
          <CurrentTripCard trip={currentTrip} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="relative rounded-[24px] overflow-hidden flex flex-col items-center justify-center text-center px-6"
              style={{ height: 200, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backdropFilter: 'blur(24px)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)', boxShadow: '0 8px 24px rgba(var(--accent-from-rgb),0.35)' }}>
                <Plane size={22} className="text-white -rotate-12" />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tight">Ta prochaine aventure</h3>
              <p className="text-sm text-white/50 mt-1 mb-4">Commencer en 30 secondes</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { haptic(8); setCreateChoiceOpen(true); }}
                className="h-12 px-6 rounded-2xl font-semibold text-white inline-flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)', boxShadow: '0 8px 24px rgba(var(--accent-from-rgb), 0.35)' }}
              >
                Créer un voyage
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Grille 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          <GridCard index={0} emoji="🌍" label="Mon Monde" value={`${stats.uniqueCountries} pays`} sublabel={`${Math.round(stats.totalKm).toLocaleString('fr-FR')} km parcourus`} accentColor="#7c8cff" onClick={() => navigate('/world')} />

          {timeWidget?.type === 'home' ? (
            <GridCard index={1} emoji="🏠" label="Heure maison" value={timeWidget.time} sublabel={`${timeWidget.distance?.toLocaleString('fr-FR') ?? '—'} km de chez toi`} accentColor="#56c5a4" onClick={() => navigate(`/trip/${currentTrip!.id}/overview`)} />
          ) : timeWidget?.type === 'destination' ? (
            <GridCard index={1} emoji="🕐" label="Heure locale" value={timeWidget.time} sublabel={`${timeWidget.destination} · À venir`} accentColor="#f0b24a" onClick={() => navigate(`/trip/${currentTrip!.id}/overview`)} />
          ) : timeWidget?.type === 'lastTrip' && stats.finishedTrips > 0 ? (
            <GridCard index={1} emoji="✈️" label="Dernier voyage" value={`${stats.finishedTrips} terminé${stats.finishedTrips > 1 ? 's' : ''}`} sublabel="Retrouve tes aventures passées" accentColor="#f0b24a" onClick={() => navigate('/voyages')} />
          ) : (
            <GridCard index={1} emoji="🧳" label="Prêt ?" value="Organise" sublabel="Ton prochain voyage t'attend" accentColor="#ec4899" onClick={() => navigate('/voyages')} />
          )}

          <GridCard index={2} emoji="🛒" label="Marketplace" value="Vols · Hôtels" sublabel="eSIM · Assurance · Activités" accentColor="#a78bfa" onClick={() => navigate('/decouvrir')} />

          {/* 4ème carte dynamique : Documents (en cours) / Budget (à venir) / Communauté */}
          {(() => {
            const currentStatus = currentTrip ? tripStatus(currentTrip.startDate, currentTrip.endDate) : null;
            // Voyage EN COURS → Documents
            if (currentStatus === 'ongoing') {
              const docs = currentTrip!.documents ?? [];
              const docCount = docs.length;
              const ticketCount = docs.filter(d => d.category === 'ticket').length;
              const resaCount = docs.filter(d => d.category === 'reservation').length;
              const otherCount = docCount - ticketCount - resaCount;
              return (
                <GridCard
                  index={3}
                  emoji="📄"
                  label="Documents"
                  value={docCount > 0 ? `${docCount} fichier${docCount > 1 ? 's' : ''}` : 'Aucun'}
                  sublabel={docCount > 0
                    ? `✈️${ticketCount} · 🏨${resaCount}${otherCount > 0 ? ` · 📎${otherCount}` : ''}`
                    : 'Ajoute tes billets ✈️'}
                  accentColor="#0770e3"
                  onClick={() => navigate(`/trip/${currentTrip!.id}/documents`)}
                />
              );
            }
            // Voyage À VENIR → Budget prévu
            if (budgetWidget?.type === 'planned') {
              return (
                <GridCard index={3} emoji="💰" label="Budget" value={fmtMoney(budgetWidget.budget, budgetWidget.currency)} sublabel="Budget prévu pour ce voyage" accentColor="#56c5a4" onClick={() => navigate(`/trip/${currentTrip!.id}/budget`)} />
              );
            }
            if (budgetWidget?.type === 'spent') {
              return (
                <GridCard index={3} emoji="💰" label="Budget" value={`${budgetWidget.pct}%`} sublabel={`${fmtMoney(budgetWidget.spent, budgetWidget.currency)} / ${fmtMoney(budgetWidget.budget, budgetWidget.currency)}`} accentColor={budgetWidget.pct > 90 ? '#ef4444' : '#56c5a4'} onClick={() => navigate(`/trip/${currentTrip!.id}/budget`)} />
              );
            }
            // Aucun voyage → Communauté placeholder
            return (
              <GridCard index={3} emoji="👥" label="Communauté" value="Bientôt" sublabel="Partagez vos aventures" accentColor="rgba(255,255,255,0.25)" onClick={() => {}} />
            );
          })()}
        </div>

        <AriaSection currentTrip={currentTrip} />
      </main>

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Create Choice Sheet */}
      <CreateChoiceSheet
        open={createChoiceOpen}
        onClose={() => setCreateChoiceOpen(false)}
        onPlanner={() => {
          setCreateChoiceOpen(false);
          navigate('/decouvrir', { state: { openPlanner: true } });
        }}
        onManual={() => {
          setCreateChoiceOpen(false);
          setTimeout(() => setCreatorOpen(true), 180);
        }}
      />

      <AnimatePresence>
        {creatorOpen && (
          <TripCreator
            onClose={() => setCreatorOpen(false)}
            onCreatedTrip={(trip) => {
              setCreatorOpen(false);
              setPrepTrip(trip);
            }}
          />
        )}
      </AnimatePresence>

      <TravelPrepSheet
        open={!!prepTrip}
        trip={prepTrip}
        onClose={() => setPrepTrip(null)}
        onOpenTrip={() => {
          if (!prepTrip) return;
          const id = prepTrip.id;
          setPrepTrip(null);
          navigate(`/trip/${id}/overview`);
        }}
      />
    </div>
  );
};

// ─── Create Choice Sheet ─────────────────────────────────────────────────────
const CreateChoiceSheet = ({
  open, onClose, onPlanner, onManual,
}: {
  open: boolean;
  onClose: () => void;
  onPlanner: () => void;
  onManual: () => void;
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full max-w-lg rounded-t-[28px] overflow-hidden"
            style={{
              background: 'rgba(14,14,22,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div className="px-5 pt-3 pb-6">
              <h2 className="text-xl font-bold tracking-tight">Commencer un voyage</h2>
              <p className="text-sm text-white/45 mt-1 mb-5">Comment veux-tu créer ton voyage ?</p>

              <div className="space-y-3">
                <button
                  onClick={() => { haptic(8); onPlanner(); }}
                  className="w-full text-left rounded-[20px] p-4 tap transition flex items-center gap-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,140,255,0.18), rgba(236,72,153,0.12))',
                    border: '1px solid rgba(124,140,255,0.35)',
                    boxShadow: '0 8px 32px rgba(124,140,255,0.15)',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <Sparkles size={20} style={{ color: '#a5b4fc' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold tracking-tight" style={{ color: '#a5b4fc' }}>Planificateur IA</div>
                    <div className="text-xs text-white/45 mt-0.5">Je ne sais pas où aller</div>
                  </div>
                </button>

                <button
                  onClick={() => { haptic(8); onManual(); }}
                  className="w-full text-left rounded-[20px] p-4 tap transition flex items-center gap-4"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <MapPin size={20} className="text-white/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold tracking-tight text-white/90">Je connais ma destination</div>
                    <div className="text-xs text-white/40 mt-0.5">Ville, dates, budget → c'est parti</div>
                  </div>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 py-3.5 rounded-2xl tap font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
