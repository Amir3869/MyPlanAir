// src/features/decouvrir/PlannerCard.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Card suggestion du Planificateur IA
// ═══════════════════════════════════════════════════════════════════════════════

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Map } from 'lucide-react';
import type { PlannerBudgetBreakdown, PlannerSuggestion } from './plannerTypes';

const flagEmoji = (code: string): string => {
  const cc = code.toUpperCase();
  const A = 0x1f1e6;
  try {
    return String.fromCodePoint(A + cc.charCodeAt(0) - 65) +
      String.fromCodePoint(A + cc.charCodeAt(1) - 65);
  } catch {
    return '🌍';
  }
};

const BREAKDOWN_ROWS: {
  key: keyof PlannerBudgetBreakdown;
  emoji: string;
  label: string;
}[] = [
  { key: 'route',          emoji: '🚆', label: 'Trajet' },
  { key: 'lodging',        emoji: '🏨', label: 'Hébergement' },
  { key: 'food',           emoji: '🍜', label: 'Repas' },
  { key: 'activities',     emoji: '🎟️', label: 'Activités' },
  { key: 'localTransport', emoji: '🚇', label: 'Local' },
  { key: 'safety',         emoji: '🛟', label: 'Imprévus' },
];

type Props = {
  suggestion: PlannerSuggestion;
  userBudget: number;
  open: boolean;
  onToggle: () => void;
  onPrepare: (suggestion: PlannerSuggestion) => void;
};

export const PlannerCard = ({ suggestion, userBudget, open, onToggle, onPrepare }: Props) => {
  const max = Math.max(...BREAKDOWN_ROWS.map((row) => suggestion.breakdown[row.key]), 1);
  const feedback = suggestion.feedback;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24 }}
      className="rounded-[24px] p-4 overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.045) 100%)',
        border: '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(24px) saturate(160%)',
        boxShadow: '0 18px 54px rgba(0,0,0,0.30)',
      }}
    >
      <div
        className="absolute inset-x-4 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${feedback.color}aa, transparent)` }}
      />

      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left tap"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${feedback.color}18`, border: `1px solid ${feedback.color}30` }}
        >
          {flagEmoji(suggestion.countryCode)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold tracking-tight truncate">
              {suggestion.destination}
            </h3>
            {suggestion.type === 'roadtrip' && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(124,140,255,0.16)', color: '#a5b4fc' }}
              >
                <Map size={10} /> Roadtrip
              </span>
            )}
          </div>
          <div className="text-xs text-white/45 mt-0.5 truncate">
            {suggestion.country} · {suggestion.days} jours · {suggestion.estimatedBudget.toLocaleString('fr-FR')} {suggestion.currency}
          </div>
          {!open && (
            <div className="text-[10px] mt-1 font-semibold" style={{ color: feedback.color }}>
              {feedback.emoji} {feedback.label}
            </div>
          )}
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ChevronDown size={15} className="text-white/45" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-white/45 leading-relaxed mt-3">
              {suggestion.description}
            </p>

      {suggestion.stops && suggestion.stops.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.stops.map((stop, index) => (
            <span
              key={`${stop.city}-${index}`}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
            >
              {stop.city} · {stop.days}j
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/30">Budget estimé</div>
            <div className="text-xl font-bold tracking-tighter font-display">
              {suggestion.estimatedBudget.toLocaleString('fr-FR')} {suggestion.currency}
            </div>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: `${feedback.color}18`, color: feedback.color, border: `1px solid ${feedback.color}30` }}
          >
            {feedback.emoji} {feedback.label}
          </div>
        </div>

        <div className="space-y-2">
          {BREAKDOWN_ROWS.map((row) => {
            const value = suggestion.breakdown[row.key];
            const pct = Math.max(8, Math.round((value / max) * 100));
            return (
              <div key={row.key} className="grid grid-cols-[82px_1fr_58px] items-center gap-2 text-[10px]">
                <div className="text-white/45 truncate">{row.emoji} {row.label}</div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${feedback.color}, rgba(255,255,255,0.55))` }}
                  />
                </div>
                <div className="text-right text-white/55 font-semibold">{value} {suggestion.currency}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-3 rounded-2xl p-3 text-xs leading-relaxed"
        style={{ background: `${feedback.color}10`, border: `1px solid ${feedback.color}24`, color: 'rgba(255,255,255,0.62)' }}
      >
        <span className="font-semibold" style={{ color: feedback.color }}>{feedback.emoji} {feedback.label}</span>
        <br />
        {feedback.message}
        <div className="mt-2 text-[10px] text-white/30">
          Estimation indicative : les prix varient selon dates, saison et disponibilité.
          Budget saisi : {userBudget.toLocaleString('fr-FR')} {suggestion.currency}.
        </div>
      </div>

            <button
              onClick={() => onPrepare(suggestion)}
              className="mt-4 w-full h-[46px] rounded-2xl font-bold text-sm tap flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                boxShadow: '0 12px 34px rgba(var(--accent-from-rgb), 0.28)',
              }}
            >
              Préparer ce voyage <ArrowRight size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
