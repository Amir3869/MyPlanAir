// src/features/decouvrir/PlannerResults.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Liste de résultats du Planificateur IA — accordéon une idée ouverte à la fois
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlannerSuggestion } from './plannerTypes';
import { PlannerCard } from './PlannerCard';

type Props = {
  suggestions: PlannerSuggestion[];
  userBudget: number;
  onPrepare: (suggestion: PlannerSuggestion) => void;
  onClear: () => void;
};

export const PlannerResults = ({ suggestions, userBudget, onPrepare, onClear }: Props) => {
  const [openId, setOpenId] = useState<string | null>(suggestions[0]?.id ?? null);

  useEffect(() => {
    setOpenId(suggestions[0]?.id ?? null);
  }, [suggestions]);

  if (suggestions.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="text-sm font-bold tracking-tight flex items-center gap-1.5">
            <span>✨</span> Idées générées
          </div>
          <div className="text-[11px] text-white/28 mt-0.5">
            Ouvre une idée à la fois · estimation indicative
          </div>
        </div>
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-full text-[10px] font-semibold tap"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.24)' }}
        >
          Effacer
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion) => (
          <PlannerCard
            key={suggestion.id}
            suggestion={suggestion}
            userBudget={userBudget}
            open={openId === suggestion.id}
            onToggle={() => setOpenId((current) => current === suggestion.id ? null : suggestion.id)}
            onPrepare={onPrepare}
          />
        ))}
      </AnimatePresence>
    </motion.section>
  );
};
