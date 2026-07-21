// src/shared/RoadtripDots.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Mini timeline horizontale pour les voyages roadtrip
// 3 états : ● done (visité) / ◉ current (en cours, pulse) / ○ upcoming (à venir)
// Connecteurs : ligne fine entre les dots
// Max 6 dots visibles (truncate au centre si + de destinations)
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import type { TripDestination } from '../store/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type DotState = 'done' | 'current' | 'upcoming';

// ─── Calcul de l'état de chaque destination ─────────────────────────────────

const getDestinationStates = (
  destinations: TripDestination[],
  status: 'upcoming' | 'ongoing' | 'finished',
): DotState[] => {
  // Voyage terminé → tout visité
  if (status === 'finished') {
    return destinations.map(() => 'done');
  }

  // Voyage à venir → tout en attente
  if (status === 'upcoming') {
    return destinations.map(() => 'upcoming');
  }

  // Voyage en cours → calcul basé sur les dates
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return destinations.map((d) => {
    const from = new Date(d.fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(d.toDate);
    to.setHours(0, 0, 0, 0);

    if (now > to) return 'done';         // Date de fin passée → visité
    if (now >= from && now <= to) return 'current'; // En cours
    return 'upcoming';                    // Pas encore commencé
  });
};

// ─── Troncature si trop de destinations ─────────────────────────────────────

const MAX_VISIBLE = 6;

const truncateDots = (
  destinations: TripDestination[],
  states: DotState[],
): { cities: string[]; dotStates: DotState[] } => {
  if (destinations.length <= MAX_VISIBLE) {
    return {
      cities: destinations.map((d) => d.city),
      dotStates: states,
    };
  }

  // Stratégie : garder les 2 premiers + … + les 2 derniers + current si pas déjà inclus
  const hasCurrent = states.includes('current');
  const currentIdx = states.indexOf('current');

  if (hasCurrent && currentIdx >= 2 && currentIdx < destinations.length - 2) {
    // 1er + current + dernier
    const cities = [
      destinations[0].city,
      '…',
      destinations[currentIdx].city,
      '…',
      destinations[destinations.length - 1].city,
    ];
    const dotStates: DotState[] = [
      states[0],
      'upcoming', // le "…" est un séparateur
      states[currentIdx],
      'upcoming',
      states[destinations.length - 1],
    ];
    return { cities, dotStates };
  }

  // Fallback : 2 premiers + … + 2 derniers
  const cities = [
    destinations[0].city,
    destinations[1].city,
    '…',
    destinations[destinations.length - 2].city,
    destinations[destinations.length - 1].city,
  ];
  const dotStates: DotState[] = [
    states[0],
    states[1],
    'upcoming',
    states[destinations.length - 2],
    states[destinations.length - 1],
  ];
  return { cities, dotStates };
};

// ─── Composant Dot ──────────────────────────────────────────────────────────

const Dot = ({ state, index }: { state: DotState; index: number }) => {
  // Styles par état
  const dotStyles: Record<DotState, React.CSSProperties> = {
    done: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.7)',
    },
    current: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: '#56c5a4',
      boxShadow: '0 0 8px rgba(86,197,164,0.5)',
    },
    upcoming: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'transparent',
      border: '1.5px solid rgba(255,255,255,0.3)',
    },
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 10, height: 10 }}
    >
      <div
        style={dotStyles[state]}
        className={state === 'current' ? 'pulse-dot' : ''}
      />
    </motion.div>
  );
};

// ─── Connecteur entre 2 dots ────────────────────────────────────────────────

const Connector = ({ fromState, index }: { fromState: DotState; index: number }) => {
  // Si le dot précédent est "done" → ligne pleine accent
  // Sinon → ligne discrète
  const isActive = fromState === 'done' || fromState === 'current';

  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: index * 0.05 + 0.03, duration: 0.3 }}
      className="flex-1 h-px origin-left"
      style={{
        background: isActive
          ? 'linear-gradient(90deg, var(--accent-from), var(--accent-to))'
          : 'rgba(255,255,255,0.15)',
        minWidth: 8,
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT EXPORTÉ
// ═══════════════════════════════════════════════════════════════════════════════

type RoadtripDotsProps = {
  destinations: TripDestination[];
  status: 'upcoming' | 'ongoing' | 'finished';
  className?: string;
};

export const RoadtripDots = ({ destinations, status, className = '' }: RoadtripDotsProps) => {
  if (!destinations || destinations.length < 2) return null;

  const states = getDestinationStates(destinations, status);
  const { dotStates } = truncateDots(destinations, states);

  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {dotStates.map((state, i) => (
        <span key={i} className="contents">
          <Dot state={state} index={i} />
          {i < dotStates.length - 1 && <Connector fromState={state} index={i} />}
        </span>
      ))}
    </div>
  );
};

// ─── Helper : ligne itinéraire texte ────────────────────────────────────────

export const ItineraryLine = ({
  destinations,
  className = '',
}: {
  destinations: TripDestination[];
  className?: string;
}) => {
  if (!destinations || destinations.length < 2) return null;

  const cities = destinations.map((d) => d.city);

  // Tronquer si trop de villes
  let display: string[];
  if (cities.length <= 5) {
    display = cities;
  } else {
    display = [cities[0], '…', cities[cities.length - 1]];
  }

  return (
    <div className={`text-xs text-white/50 truncate ${className}`}>
      {display.join(' → ')}
    </div>
  );
};
