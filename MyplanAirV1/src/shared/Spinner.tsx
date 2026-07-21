// src/shared/Spinner.tsx
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Spinner GRAND — pour chargement de page / section entière
// Usage : <Spinner label="Chargement..." />
// ─────────────────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?:      number;
  label?:     string;
  className?: string;
}

export const Spinner = ({ size = 32, label, className = '' }: SpinnerProps) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label={label ? undefined : 'Chargement'}
  >
    <motion.div
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        border:       `${Math.max(2, Math.floor(size / 14))}px solid rgba(255,255,255,0.12)`,
        borderTopColor: '#7c8cff',
      }}
    />
    {label && (
      <p className="text-sm text-white/45 animate-pulse">{label}</p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MiniSpinner — pour boutons, widgets, inline dans les cartes
// Usage : <MiniSpinner /> ou <MiniSpinner label="Chargement..." />
// ─────────────────────────────────────────────────────────────────────────────
interface MiniSpinnerProps {
  label?: string;
}

export const MiniSpinner = ({ label }: MiniSpinnerProps) => (
  <div
    className="flex items-center gap-2 py-1"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label={label ? undefined : 'Chargement'}
  >
    <motion.div
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      className="flex-shrink-0"
      style={{
        width:          16,
        height:         16,
        borderRadius:   '50%',
        border:         '2px solid rgba(255,255,255,0.15)',
        borderTopColor: '#7c8cff',
      }}
    />
    {label && (
      <span className="text-sm text-white/40">{label}</span>
    )}
  </div>
);
