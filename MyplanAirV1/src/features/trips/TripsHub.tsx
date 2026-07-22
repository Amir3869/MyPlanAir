// src/features/trips/TripsHub.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Page Voyages — Route "/voyages"
// Header sticky 2 lignes (titre + contexte contextuel)
// Stack Apple Wallet sticky scroll (3+ voyages) — z-index correct
// Long press menu iOS, Smart ordering, Recherche, Pin
// FAB intégré dans NavTabBar (pas de FAB flottant sur la page)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Plane, Map, Search, Share2, Calendar,
  Pin as PinIcon, Copy, FileText, Trash2, X, Check,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useTripStore, type Trip } from '../../store/tripStore';
import { nameToHue, nameToInitials } from '../../store/types';
import { TripCreator } from './TripCreator';
import { addDaysISO, dayCounter, daysBetween, fmtRange, tripStatus } from '../../utils/dateHelpers';
import { fmtMoney } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import { BottomSheet } from '../../shared/BottomSheet';
import { DatePickerSheet, DateTrigger } from '../../shared/DatePickerSheet';
import { TravelPrepSheet } from '../travelPrep/TravelPrepSheet';
import { DocStorage } from '../../utils/docStorage';
import { getExpensesBudgetTotal } from '../../utils/expenseHelpers';
import { MemoryStorage } from '../../utils/memoryStorage';

// ─── Types & Constants ───────────────────────────────────────────────────────

type Filter = 'all' | 'upcoming' | 'ongoing' | 'finished';
type StatusType = 'upcoming' | 'ongoing' | 'finished';

const STATUS_LABEL: Record<StatusType, { label: string; color: string }> = {
  upcoming: { label: 'À venir',  color: '#7c8cff' },
  ongoing:  { label: 'En cours', color: '#56c5a4' },
  finished: { label: 'Terminé',  color: 'rgba(255,255,255,0.45)' },
};

const LONG_PRESS_MS  = 500;
const CARD_HEIGHT    = 208;  // h-52 ≈ 208px
const STACK_PEEK     = 40;   // peek visible en mode stack

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getReturnText = (endDate: string): string | null => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - now.getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return "Retour aujourd'hui";
  if (days === 1) return 'Retour demain';
  return `Retour dans ${days}j`;
};

const downloadICS = (trip: Trip) => {
  const title = trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination;
  const uid = `mytrip-${Date.now()}@mytrip.app`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyPlanAir//My Plan’Air App//FR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${trip.startDate.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${addDaysISO(trip.endDate, 1).replace(/-/g, '')}`,
    `SUMMARY:${title}`, `DESCRIPTION:Voyage créé avec My Plan’Air`,
    `UID:${uid}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mytrip-${title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const encodeTripForShare = (trip: object): string => {
  try { return btoa(encodeURIComponent(JSON.stringify(trip))); }
  catch { return ''; }
};

// ─── Context line — info utile, pas redondante ───────────────────────────────

const getContextLine = (trips: Trip[]): string => {
  if (trips.length === 0) return 'Ton prochain voyage t\'attend';

  const ongoing = trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');
  if (ongoing.length > 0) {
    const t = ongoing[0];
    const dest = t.isRoadtrip ? t.country : t.destination;
    return `En voyage · ${dest} · ${dayCounter(t.startDate, t.endDate)}`;
  }

  const upcoming = trips
    .filter((t) => tripStatus(t.startDate, t.endDate) === 'upcoming')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  if (upcoming.length > 0) {
    const t = upcoming[0];
    const dest = t.isRoadtrip ? t.country : t.destination;
    return `Prochain départ · ${dest} · ${dayCounter(t.startDate, t.endDate)}`;
  }

  const finished = trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'finished');
  if (finished.length > 0) {
    return `${finished.length} voyage${finished.length > 1 ? 's' : ''} terminé${finished.length > 1 ? 's' : ''} · Crée le prochain !`;
  }

  return 'Ton prochain voyage t\'attend';
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
    fontSize: '16px', lineHeight: '1', display: 'inline-block',
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

// ─── StatusPill ──────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: StatusType }) => {
  const info = STATUS_LABEL[status];
  return (
    <div
      className="pill px-2.5 py-1 flex items-center gap-1.5 backdrop-blur-xl"
      style={{
        background: status === 'upcoming' ? 'rgba(var(--accent-from-rgb), 0.18)' : `${info.color}26`,
        border: status === 'upcoming' ? '1px solid rgba(var(--accent-from-rgb), 0.38)' : `1px solid ${info.color}55`,
      }}
    >
      {status === 'ongoing' && <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: info.color }} />}
      <span className="text-[11px] font-semibold" style={{ color: status === 'upcoming' ? 'var(--accent-label)' : info.color }}>
        {info.label}
      </span>
    </div>
  );
};

// ─── Avatar (cohérent Dashboard — w-10 h-10) ────────────────────────────────

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

// ─── TripCard — h-52 compact, PAS de trait accent en bas ─────────────────────

const TripCard = ({
  trip, onLongPress, isPinned, onClick,
}: {
  trip: Trip;
  onLongPress: (trip: Trip) => void;
  isPinned: boolean;
  onClick: () => void;
}) => {
  const status = tripStatus(trip.startDate, trip.endDate) as StatusType;
  const counter = dayCounter(trip.startDate, trip.endDate);
  const returnText = status === 'ongoing' ? getReturnText(trip.endDate) : null;
  const destinationLabel = trip.isRoadtrip ? trip.country : trip.destination;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePointerDown = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      haptic([5, 20, 5]);
      onLongPress(trip);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onClick();
  };

  return (
    <div
      className="relative rounded-[24px] overflow-hidden cursor-pointer tap"
      style={{ height: CARD_HEIGHT, boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerMove={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => { e.preventDefault(); longPressTriggered.current = true; haptic([5, 20, 5]); onLongPress(trip); }}
      onClick={handleClick}
    >
      {/* Photo de fond */}
      {trip.photoUrl ? (
        <img src={trip.photoUrl} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,140,255,0.3), rgba(236,72,153,0.2))' }} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.55) 60%,rgba(0,0,0,0.85) 100%)' }} />

      {/* Terminé → assombrir */}
      {status === 'finished' && <div className="absolute inset-0 bg-black/30" />}

      {/* TOP : FlagBadge + badges */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <FlagBadge countryCode={trip.countryCode} countryName={trip.country} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPinned && (
            <div className="pill px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-xl" style={{ background: 'rgba(240,178,74,0.18)', border: '1px solid rgba(240,178,74,0.35)' }}>
              <PinIcon size={9} style={{ color: '#f0b24a' }} />
              <span className="text-[9px] font-semibold" style={{ color: '#f0b24a' }}>Épinglé</span>
            </div>
          )}
          {trip.isRoadtrip && (
            <div className="pill px-2 py-1 flex items-center gap-1 backdrop-blur-xl" style={{ background: 'rgba(var(--accent-from-rgb), 0.18)', border: '1px solid rgba(var(--accent-from-rgb), 0.38)' }}>
              <Map size={10} style={{ color: 'var(--accent-label)' }} />
              <span className="text-[9px] font-semibold" style={{ color: 'var(--accent-label)' }}>Roadtrip</span>
            </div>
          )}
          <StatusPill status={status} />
        </div>
      </div>

      {/* BOTTOM : Info voyage */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="text-xl font-bold font-display tracking-tighter leading-tight">
          {destinationLabel}
        </div>
        <div className="text-xs text-white/65 mt-0.5">
          {status === 'ongoing' && returnText
            ? `${counter} · ${returnText}`
            : status === 'upcoming'
              ? `${counter} · ${fmtRange(trip.startDate, trip.endDate)}`
              : fmtRange(trip.startDate, trip.endDate)
          }
        </div>
      </div>
    </div>
  );
};

// ─── TripStack — Apple Wallet sticky scroll ──────────────────────────────────
// Cartes s'empilent progressivement au scroll
// z-index DÉCROISSANT : carte 0 = dessus, carte N = dessous
// ═══════════════════════════════════════════════════════════════════════════════

const TripStack = ({
  trips, headerHeight, onNavigate, onLongPress, pinnedSet,
}: {
  trips: Trip[];
  headerHeight: number;
  onNavigate: (trip: Trip) => void;
  onLongPress: (trip: Trip) => void;
  pinnedSet: Set<string>;
}) => {
  return (
    <div>
      {trips.map((trip, i) => {
        // Chaque carte stick à headerHeight + i * peek
        // Plus i est petit, plus la carte est en haut du stack
        const stickyTop = headerHeight + i * STACK_PEEK;

        return (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, delay: i * 0.06 }}
            style={{
              position: 'sticky',
              top: stickyTop,
              // z-index DÉCROISSANT : carte 0 = le plus haut
              zIndex: trips.length - i,
            }}
          >
            <TripCard
              trip={trip}
              onLongPress={onLongPress}
              isPinned={pinnedSet.has(trip.id)}
              onClick={() => onNavigate(trip)}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Long Press Menu — iOS style + Annuler ───────────────────────────────────

const LongPressMenu = ({
  trip, isPinned, onClose, onAction,
}: {
  trip: Trip; isPinned: boolean; onClose: () => void;
  onAction: (action: string) => void;
}) => {
  const actions = [
    { id: 'details',   icon: FileText,  label: 'Détails du voyage' },
    { id: 'share',     icon: Share2,    label: 'Partager' },
    { id: 'calendar',  icon: Calendar,  label: 'Ajouter au calendrier' },
    { id: 'pin',       icon: PinIcon,   label: isPinned ? 'Désépingler' : 'Épingler' },
    { id: 'duplicate', icon: Copy,      label: 'Dupliquer' },
    { id: 'delete',    icon: Trash2,    label: 'Supprimer', danger: true },
  ];

  const destLabel = trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination;

  return (
    <motion.div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] overflow-hidden pb-safe"
        style={{ background: 'rgba(14,14,22,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} /></div>

        <div className="px-5 pb-3 pt-1">
          <div className="font-bold text-lg tracking-tight">{destLabel}</div>
          <div className="text-xs text-white/40 mt-0.5">{fmtRange(trip.startDate, trip.endDate)} · {fmtMoney(trip.budget, trip.currency)}</div>
        </div>

        <div className="px-3 pb-3 space-y-1">
          {actions.map((action) => (
            <div key={action.id}>
              {action.danger && <div className="h-px mx-4 my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />}
              <button
                onClick={() => { haptic(6); onAction(action.id); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl tap transition"
                style={{ background: action.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)' }}
              >
                <action.icon size={18} style={{ color: action.danger ? '#ef4444' : 'rgba(255,255,255,0.6)' }} />
                <span className="text-sm font-medium" style={{ color: action.danger ? '#ef4444' : 'rgba(255,255,255,0.85)' }}>{action.label}</span>
              </button>
            </div>
          ))}
        </div>

        <div className="px-3 pb-6 pt-1">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center py-3.5 rounded-2xl tap font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Trip Details Sheet ──────────────────────────────────────────────────────

const TripDetailsSheet = ({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) => {
  const status = tripStatus(trip.startDate, trip.endDate) as StatusType;
  const spent = getExpensesBudgetTotal(trip.expenses, trip.currency);
  const checklistDone = trip.checklist.filter((c) => c.done).length;
  const destLabel = trip.isRoadtrip ? trip.country : trip.destination;

  return (
    <BottomSheet open={open} onClose={onClose} title={`Détails · ${destLabel}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Durée', value: `${dayCounter(trip.startDate, trip.endDate).split('·')[0].trim()}`, color: '#7c8cff' },
            { label: 'Statut', value: STATUS_LABEL[status].label, color: STATUS_LABEL[status].color },
            { label: 'Budget', value: fmtMoney(trip.budget, trip.currency), color: '#f0b24a' },
            { label: 'Dépensé', value: fmtMoney(spent, trip.currency), color: '#ec4899' },
            { label: 'Étapes', value: `${trip.steps.length}`, color: '#a78bfa' },
            { label: 'Checklist', value: `${checklistDone}/${trip.checklist.length}`, color: '#56c5a4' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-4 text-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <div className="text-lg font-bold font-display tracking-tighter" style={{ color }}>{value}</div>
              <div className="text-xs text-white/55 mt-1">{label}</div>
            </div>
          ))}
        </div>
        {trip.isRoadtrip && trip.destinations && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Itinéraire</div>
            <div className="flex flex-wrap gap-2">
              {trip.destinations.map((d, index) => (
                <span key={`${d.city}-${d.fromDay}-${d.toDay}-${index}`} className="pill px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(124,140,255,0.15)', border: '1px solid rgba(124,140,255,0.25)', color: '#a5b4fc' }}>
                  {d.city} <span className="text-white/30 ml-1">J{d.fromDay}→J{d.toDay}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};


// ─── Duplicate Trip Sheet ───────────────────────────────────────────────────

const DuplicateTripSheet = ({
  trip,
  open,
  onClose,
  onDuplicate,
}: {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
  onDuplicate: (trip: Trip) => void;
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [keepSteps, setKeepSteps] = useState(true);
  const [keepChecklist, setKeepChecklist] = useState(true);
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!trip || !open) return;
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setBudget(String(trip.budget));
    setKeepSteps(true);
    setKeepChecklist(true);
  }, [trip, open]);

  if (!trip) return null;

  const destLabel = trip.isRoadtrip ? `${trip.country} · Roadtrip` : `${trip.destination} · ${trip.country}`;
  const originalDuration = Math.max(1, daysBetween(trip.startDate, trip.endDate));
  const maxRoadtripDay = trip.destinations?.reduce((max, dest) => Math.max(max, dest.toDay), 1) ?? 1;
  const minEndDate = addDaysISO(startDate || trip.startDate, Math.max(0, trip.isRoadtrip ? maxRoadtripDay - 1 : 0));
  const canSubmit = Boolean(startDate && endDate && Number(budget) > 0 && endDate >= minEndDate);

  const handleStartChange = (iso: string) => {
    const currentDuration = Math.max(1, daysBetween(startDate || trip.startDate, endDate || trip.endDate) || originalDuration);
    setStartDate(iso);
    setEndDate(addDaysISO(iso, currentDuration - 1));
  };

  const toggleButton = (
    active: boolean,
    label: string,
    sublabel: string,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-3 flex items-center gap-3 text-left tap"
      style={{
        background: active ? 'rgba(var(--accent-from-rgb),0.14)' : 'rgba(255,255,255,0.055)',
        border: active ? '1px solid rgba(var(--accent-from-rgb),0.32)' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: active ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' : 'rgba(255,255,255,0.08)',
          color: active ? '#fff' : 'rgba(255,255,255,0.35)',
        }}
      >
        {active && <Check size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold tracking-tight text-white/88">{label}</div>
        <div className="text-xs text-white/42 mt-0.5">{sublabel}</div>
      </div>
    </button>
  );

  const submit = () => {
    if (!canSubmit) return;
    const parsedBudget = Number(budget);
    const duplicatedSteps = keepSteps
      ? trip.steps.map((step) => ({ ...step, id: crypto.randomUUID() }))
      : [];
    const duplicatedChecklist = keepChecklist
      ? trip.checklist.map((item) => ({ ...item, id: crypto.randomUUID(), done: false }))
      : [];
    const duplicatedDestinations = trip.destinations?.map((dest) => ({
      ...dest,
      fromDate: addDaysISO(startDate, dest.fromDay - 1),
      toDate: addDaysISO(startDate, dest.toDay - 1),
    }));

    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      destination: trip.isRoadtrip ? trip.destination : `${trip.destination} (copie)`,
      startDate,
      endDate,
      budget: parsedBudget,
      createdAt: new Date().toISOString(),
      steps: duplicatedSteps,
      expenses: [],
      checklist: duplicatedChecklist,
      documents: [],
      memories: [],
      destinations: duplicatedDestinations,
    };

    onDuplicate(newTrip);
    onClose();
  };

  return (
    <>
      <DatePickerSheet
        open={datePicker === 'start'}
        onClose={() => setDatePicker(null)}
        value={startDate}
        title="Date de départ"
        onChange={(iso) => {
          handleStartChange(iso);
          setDatePicker(null);
        }}
      />
      <DatePickerSheet
        open={datePicker === 'end'}
        onClose={() => setDatePicker(null)}
        value={endDate}
        min={minEndDate}
        title="Date de retour"
        onChange={(iso) => {
          setEndDate(iso);
          setDatePicker(null);
        }}
      />

      <BottomSheet open={open} onClose={onClose} title="Dupliquer le voyage">
        <div className="space-y-4">
          <div
            className="rounded-[24px] p-4"
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-from-rgb),0.14)', border: '1px solid rgba(var(--accent-from-rgb),0.28)' }}
              >
                <Copy size={16} style={{ color: 'var(--accent-label)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold tracking-tight text-white/92">{destLabel}</div>
                <div className="text-xs text-white/45 mt-1">
                  {originalDuration} jour{originalDuration > 1 ? 's' : ''} · {fmtMoney(trip.budget, trip.currency)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DateTrigger value={startDate} label="Départ" onClick={() => setDatePicker('start')} variant="compact" />
            <DateTrigger value={endDate} label="Retour" onClick={() => setDatePicker('end')} variant="compact" />
          </div>

          <label className="block">
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">Budget ({trip.currency})</div>
            <input
              type="number"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium font-display text-lg"
              placeholder="0"
            />
          </label>

          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">À reprendre</div>
            <div className="space-y-2">
              {toggleButton(keepSteps, 'Parcours', `${trip.steps.length} étape${trip.steps.length > 1 ? 's' : ''}`, () => setKeepSteps((v) => !v))}
              {toggleButton(keepChecklist, 'Checklist', `${trip.checklist.length} élément${trip.checklist.length > 1 ? 's' : ''} remis à faire`, () => setKeepChecklist((v) => !v))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-35"
            style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)' }}
          >
            Créer la copie
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-3xl p-10 text-center mt-8">
    <div
      className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
      style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)' }}
    >
      <Plane size={28} className="text-white -rotate-12" />
    </div>
    <h3 className="font-display text-2xl font-bold tracking-tight mb-2">Votre prochaine aventure commence ici</h3>
    <p className="text-white/55 mb-8">Créez votre premier carnet de voyage en quelques secondes.</p>
    <motion.button whileTap={{ scale: 0.96 }} onClick={onCreate} className="h-14 px-8 rounded-2xl font-semibold text-white inline-flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)', boxShadow: '0 8px 32px rgba(var(--accent-from-rgb, 124,140,255), 0.4)' }}>
      <Plus size={20} /> Créer un voyage
    </motion.button>
  </motion.div>
);

const EmptyResults = ({
  searchQuery,
  filter,
  trips,
  onClearSearch,
  onShowAll,
  onCreate,
  onSetFilter,
}: {
  searchQuery: string;
  filter: Filter;
  trips: Trip[];
  onClearSearch: () => void;
  onShowAll: () => void;
  onCreate: () => void;
  onSetFilter: (filter: Filter) => void;
}) => {
  const hasSearch = searchQuery.trim().length > 0;
  const hasUpcoming = trips.some((trip) => tripStatus(trip.startDate, trip.endDate) === 'upcoming');

  const filterCopy: Record<Filter, { title: string; body: string; emoji: string }> = {
    all: {
      title: 'Aucun voyage trouvé',
      body: 'Essaie une autre recherche ou réinitialise les filtres.',
      emoji: '🔎',
    },
    upcoming: {
      title: 'Aucun voyage à venir',
      body: 'Tes prochains départs apparaîtront ici dès qu’un voyage sera planifié.',
      emoji: '🗓️',
    },
    ongoing: {
      title: 'Aucun voyage en cours',
      body: 'Quand un voyage sera dans ses dates, il apparaîtra ici automatiquement.',
      emoji: '🧭',
    },
    finished: {
      title: 'Aucun voyage terminé',
      body: 'Tes voyages passés seront regroupés ici après leur date de retour.',
      emoji: '🏁',
    },
  };

  const copy = hasSearch
    ? {
        title: 'Aucun résultat',
        body: filter === 'all'
          ? `Aucun voyage ne correspond à « ${searchQuery.trim()} ».`
          : `Aucun résultat pour « ${searchQuery.trim()} » dans ce filtre.`,
        emoji: '🔎',
      }
    : filterCopy[filter];

  const action = (() => {
    if (hasSearch) return { label: 'Effacer la recherche', icon: X, onClick: onClearSearch };
    if (filter === 'upcoming') return { label: 'Créer un voyage', icon: Plus, onClick: onCreate };
    if (filter === 'ongoing' && hasUpcoming) {
      return { label: 'Voir les voyages à venir', icon: Calendar, onClick: () => onSetFilter('upcoming') };
    }
    return { label: 'Voir tous les voyages', icon: X, onClick: onShowAll };
  })();

  const ActionIcon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl p-8 text-center mt-8"
    >
      <div
        className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4 text-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {copy.emoji}
      </div>
      <h3 className="font-display text-xl font-bold tracking-tight mb-2">{copy.title}</h3>
      <p className="text-sm text-white/50 leading-relaxed mb-5">
        {copy.body}
      </p>
      <button
        onClick={action.onClick}
        className="h-11 px-5 rounded-2xl font-semibold text-sm tap inline-flex items-center gap-2"
        style={{ background: 'rgba(var(--accent-from-rgb),0.14)', border: '1px solid rgba(var(--accent-from-rgb),0.28)', color: 'var(--accent-label)' }}
      >
        <ActionIcon size={14} /> {action.label}
      </button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPSHUB PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export const TripsHub = () => {
  const trips          = useTripStore((s) => s.trips);
  const removeTrip     = useTripStore((s) => s.removeTrip);
  const pinnedTripIds  = useTripStore((s) => s.pinnedTripIds);
  const pinTrip        = useTripStore((s) => s.pinTrip);
  const unpinTrip      = useTripStore((s) => s.unpinTrip);
  const addTrip        = useTripStore((s) => s.addTrip);
  const userName       = useTripStore((s) => s.userName);
  const userPhotoUrl   = useTripStore((s) => s.userPhotoUrl);
  const fabCreateTrip  = useTripStore((s) => s.fabCreateTrip);
  const consumeFabCreate = useTripStore((s) => s.consumeFabCreate);
  const { user }       = useClerk();

  const [filter, setFilter]             = useState<Filter>('all');
  const [creatorOpen, setCreatorOpen]   = useState(false);
  const [prepTrip, setPrepTrip]         = useState<Trip | null>(null);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [longPressTrip, setLongPressTrip] = useState<Trip | null>(null);
  const [detailsTrip, setDetailsTrip]   = useState<Trip | null>(null);
  const [deleteTrip, setDeleteTrip]     = useState<Trip | null>(null);
  const [duplicateTrip, setDuplicateTrip] = useState<Trip | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const pinnedSet = useMemo(() => new Set(pinnedTripIds), [pinnedTripIds]);
  const avatarUrl = userPhotoUrl ?? user?.imageUrl ?? null;

  // ── FAB trigger depuis NavTabBar ──
  useEffect(() => {
    if (fabCreateTrip) {
      setCreatorOpen(true);
      consumeFabCreate();
    }
  }, [fabCreateTrip, consumeFabCreate]);

  // ── Mesurer la hauteur du header pour le sticky des cartes ──
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(140);

  useEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [searchOpen, filter]);

  // ── Filtrer par statut ──
  const filtered = useMemo(() => {
    if (filter === 'all') return trips;
    return trips.filter((t) => tripStatus(t.startDate, t.endDate) === filter);
  }, [trips, filter]);

  // ── Recherche ──
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter((t) =>
      t.destination.toLowerCase().includes(q) ||
      t.country.toLowerCase().includes(q) ||
      (t.destinations?.some((d) => d.city.toLowerCase().includes(q)) ?? false)
    );
  }, [filtered, searchQuery]);

  // ── Smart ordering : En cours → Épinglé → À venir → Terminés ──
  const sorted = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      const statusA = tripStatus(a.startDate, a.endDate);
      const statusB = tripStatus(b.startDate, b.endDate);
      const pinA = pinnedSet.has(a.id) ? 0 : 1;
      const pinB = pinnedSet.has(b.id) ? 0 : 1;
      const priorityA = statusA === 'ongoing' ? 0 : (pinA === 0 && statusA !== 'finished') ? 1 : statusA === 'upcoming' ? 2 : 3;
      const priorityB = statusB === 'ongoing' ? 0 : (pinB === 0 && statusB !== 'finished') ? 1 : statusB === 'upcoming' ? 2 : 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [searchFiltered, pinnedSet]);

  // ── Stack mode : 3+ voyages, filtre "all", pas de recherche ──
  const useStackMode = sorted.length >= 3 && filter === 'all' && !searchQuery.trim();

  // ── Pulse dot sur filtre "En cours" ──
  const hasOngoing = trips.some((t) => tripStatus(t.startDate, t.endDate) === 'ongoing');

  // ── Context line ──
  const contextLine = useMemo(() => getContextLine(trips), [trips]);

  // ── Handlers ──
  const handleDelete = async (trip: Trip) => {
    // Nettoyer les fichiers locaux IndexedDB du voyage.
    // Documents et souvenirs sont stockés hors Zustand : il faut donc les purger explicitement.
    try { await DocStorage.clearTrip(trip.id); } catch { /* silencieux */ }
    try { await MemoryStorage.clearTrip(trip.id); } catch { /* silencieux */ }
    removeTrip(trip.id);
    toast(`${trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination} supprimé`, 'info');
  };

  const handleLongPressAction = (action: string) => {
    if (!longPressTrip) return;
    const trip = longPressTrip;
    setLongPressTrip(null);

    switch (action) {
      case 'details':
        setDetailsTrip(trip);
        break;
      case 'share': {
        const encoded = encodeTripForShare(trip);
        const url = `${window.location.origin}/share/${trip.id}?v=${encoded}`;
        navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success')).catch(() => toast('Lien prêt', 'info'));
        break;
      }
      case 'calendar':
        downloadICS(trip);
        toast('Calendrier téléchargé', 'success');
        break;
      case 'pin':
        if (pinnedSet.has(trip.id)) { unpinTrip(trip.id); toast('Désépinglé', 'info'); }
        else { pinTrip(trip.id); toast('Épinglé', 'success'); }
        break;
      case 'duplicate':
        setDuplicateTrip(trip);
        break;
      case 'delete':
        setDeleteTrip(trip);
        break;
    }
  };

  // ── Filtres labels ──
  const FILTER_ITEMS = [
    { k: 'all' as const, l: 'Tous' },
    { k: 'upcoming' as const, l: 'À venir' },
    { k: 'ongoing' as const, l: 'En cours' },
    { k: 'finished' as const, l: 'Terminés' },
  ] as const;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-[#07070b] pointer-events-none" style={{ zIndex: 0 }} />
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{
          zIndex:          1,
          backgroundImage: "url('/mytrip-ambient-bg.png')",
          filter:          'blur(18px) saturate(130%) brightness(1.05)',
          transform:       'scale(1.06)',
          opacity:         0.62,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'linear-gradient(180deg, rgba(7,7,11,0.24) 0%, rgba(7,7,11,0.58) 52%, rgba(7,7,11,0.88) 100%)',
        }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 3 }}>
        <div className="aurora opacity-5" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER STICKY — 2 lignes : titre + contexte
          MÊME taille/position que Dashboard (text-xl, pt-5, w-10 boutons)
          PAS de "Bonjour Amir" — remplacé par ligne contextuelle
          ══════════════════════════════════════════════════════════════════════ */}
      <header
        ref={headerRef}
        className="sticky top-0 z-20 px-5 pt-safe max-w-3xl mx-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(7,7,11,0.58) 0%, rgba(7,7,11,0.34) 100%)',
          backdropFilter: 'blur(30px) saturate(150%)',
          WebkitBackdropFilter: 'blur(30px) saturate(150%)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
        }}
      >
        <div className="flex items-start justify-between pt-5">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tighter flex items-center gap-2">
              <span
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.35)) drop-shadow(0 0 8px rgba(255,122,0,0.16))' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="-rotate-12"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="voyages-plane-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="52%" stopColor="#7C3AED" />
                      <stop offset="82%" stopColor="#C84AA6" />
                      <stop offset="100%" stopColor="#FF7A00" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 4 2 2 4 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"
                    stroke="url(#voyages-plane-gradient)"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Mes Voyages
            </h1>
            <div className="text-xs text-white/35 mt-0.5 capitalize">
              {contextLine}
            </div>
          </div>
          {/* Boutons — Search + Avatar far right, même taille w-10 h-10 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
              className="w-10 h-10 rounded-full glass flex items-center justify-center tap"
              aria-label="Rechercher"
            >
              <Search size={18} />
            </button>
            <Avatar name={userName} photoUrl={avatarUrl} onClick={() => navigate('/profil')} />
          </div>
        </div>

        {/* Accent line gradient */}
        <div className="mt-3 h-px rounded-full" style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #7C3AED 42%, #C84AA6 76%, #FF7A00 92%, transparent 100%)' }} />

        {/* Recherche extensible */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 pb-1">
                <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Search size={16} className="text-white/35 flex-shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un voyage..."
                    className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-white/30"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="tap"><X size={14} className="text-white/40" /></button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtres */}
        <div className="mt-5 flex gap-2 overflow-x-auto -mx-5 px-5 pb-2">
          {FILTER_ITEMS.map(({ k, l }) => {
            const isActive = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="relative flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap tap transition-all flex items-center gap-1.5"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.24) 0%, rgba(124,58,237,0.18) 48%, rgba(255,122,0,0.14) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  border: isActive ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.10)',
                  color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
                  boxShadow: isActive ? '0 8px 26px rgba(124,58,237,0.16), 0 0 14px rgba(255,122,0,0.08)' : undefined,
                  backdropFilter: isActive ? 'blur(20px)' : undefined,
                  WebkitBackdropFilter: isActive ? 'blur(20px)' : undefined,
                }}
              >
                {k === 'ongoing' && hasOngoing && !isActive && (
                  <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#56c5a4' }} />
                )}
                {l}
                {isActive && (
                  <motion.div layoutId="filterUnderline" className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full" style={{ width: '60%', background: 'linear-gradient(90deg, #7C3AED 0%, #C84AA6 72%, #FF7A00 100%)' }} transition={{ type: 'spring', damping: 26, stiffness: 320 }} />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Cartes voyages ── */}
      <main className="relative z-10 px-5 pb-40 max-w-3xl mx-auto mt-5">
        {sorted.length === 0 ? (
          trips.length === 0 ? (
            <EmptyState onCreate={() => setCreatorOpen(true)} />
          ) : (
            <EmptyResults
              searchQuery={searchQuery}
              filter={filter}
              trips={trips}
              onClearSearch={() => {
                haptic(4);
                setSearchQuery('');
                setSearchOpen(false);
              }}
              onShowAll={() => {
                haptic(4);
                setSearchQuery('');
                setSearchOpen(false);
                setFilter('all');
              }}
              onCreate={() => {
                haptic(8);
                setCreatorOpen(true);
              }}
              onSetFilter={(nextFilter) => {
                haptic(4);
                setSearchQuery('');
                setSearchOpen(false);
                setFilter(nextFilter);
              }}
            />
          )
        ) : useStackMode ? (
          <TripStack
            trips={sorted}
            headerHeight={headerHeight}
            onNavigate={(trip) => navigate(`/trip/${trip.id}/overview`)}
            onLongPress={(trip) => setLongPressTrip(trip)}
            pinnedSet={pinnedSet}
          />
        ) : (
          <div className="space-y-5">
            {sorted.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                onLongPress={(trip) => setLongPressTrip(trip)}
                isPinned={pinnedSet.has(t.id)}
                onClick={() => navigate(`/trip/${t.id}/overview`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* PAS de FAB flottant — intégré dans NavTabBar */}

      <AnimatePresence>
        {creatorOpen && (
          <TripCreator
            onClose={() => setCreatorOpen(false)}
            onCreatedTrip={(trip) => setPrepTrip(trip)}
          />
        )}
      </AnimatePresence>

      <TravelPrepSheet
        open={!!prepTrip}
        trip={prepTrip}
        onClose={() => setPrepTrip(null)}
        onOpenTrip={() => {
          if (!prepTrip) return;
          const tripId = prepTrip.id;
          setPrepTrip(null);
          navigate(`/trip/${tripId}/overview`);
        }}
      />

      {/* Long press menu */}
      <AnimatePresence>
        {longPressTrip && (
          <LongPressMenu
            trip={longPressTrip}
            isPinned={pinnedSet.has(longPressTrip.id)}
            onClose={() => setLongPressTrip(null)}
            onAction={handleLongPressAction}
          />
        )}
      </AnimatePresence>

      {/* Trip details bottom sheet */}
      {detailsTrip && (
        <TripDetailsSheet trip={detailsTrip} open={!!detailsTrip} onClose={() => setDetailsTrip(null)} />
      )}

      <DuplicateTripSheet
        trip={duplicateTrip}
        open={!!duplicateTrip}
        onClose={() => setDuplicateTrip(null)}
        onDuplicate={(newTrip) => {
          addTrip(newTrip);
          toast('Voyage dupliqué', 'success');
          setPrepTrip(newTrip);
        }}
      />

      {/* Confirm delete bottom sheet */}
      <BottomSheet
        open={!!deleteTrip}
        onClose={() => setDeleteTrip(null)}
        title="Supprimer le voyage ?"
      >
        {deleteTrip && (
          <div className="space-y-4">
            <div
              className="rounded-[24px] p-4"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border:     '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.13)', border: '1px solid rgba(239,68,68,0.24)' }}
                >
                  <Trash2 size={17} style={{ color: '#ef4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold tracking-tight text-white/92">
                    {deleteTrip.isRoadtrip ? `${deleteTrip.country} · Roadtrip` : deleteTrip.destination}
                  </div>
                  <div className="text-sm text-white/55 leading-relaxed mt-1">
                    Cette action supprimera le voyage de cet appareil, ainsi que ses documents et photos souvenirs stockés localement.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleteTrip(null)}
                className="h-12 rounded-2xl font-semibold text-sm tap"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  haptic([8, 30, 8]);
                  const tripToDelete = deleteTrip;
                  setDeleteTrip(null);
                  handleDelete(tripToDelete);
                }}
                className="h-12 rounded-2xl font-semibold text-sm tap"
                style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
