// src/features/decouvrir/PlannerCreateSheet.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Bottom sheet de création directe depuis une suggestion Planner
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { DatePickerSheet, DateTrigger } from '../../shared/DatePickerSheet';
import { addDaysISO, fmtRange, todayISO } from '../../utils/dateHelpers';
import type { PlannerSuggestion } from './plannerTypes';

type CreationStep = 'idle' | 'photo' | 'checklist' | 'itinerary' | 'saving' | 'done';
type PreparationMode = 'essential' | 'itinerary';

type Props = {
  open: boolean;
  suggestion: PlannerSuggestion | null;
  creating: boolean;
  creationStep: CreationStep;
  onClose: () => void;
  onCreate: (startDate: string, withItinerary: boolean) => void;
};

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

const getCreationSteps = (withItinerary: boolean): {
  key: CreationStep;
  title: string;
  body: string;
}[] => [
  { key: 'photo', title: 'Photo destination', body: 'Image premium via Unsplash' },
  { key: 'checklist', title: 'Checklist IA', body: 'Préparation adaptée au voyage' },
  ...(withItinerary ? [{ key: 'itinerary' as const, title: 'Parcours suggéré', body: 'Idées par jour et moment' }] : []),
  { key: 'saving', title: 'Sauvegarde', body: 'Création dans My Plan’Air' },
];

const getStepState = (current: CreationStep, key: CreationStep, withItinerary: boolean): 'done' | 'current' | 'pending' => {
  const order: CreationStep[] = withItinerary
    ? ['photo', 'checklist', 'itinerary', 'saving']
    : ['photo', 'checklist', 'saving'];
  const currentIndex = order.indexOf(current);
  const keyIndex = order.indexOf(key);

  if (current === 'done') return 'done';
  if (current === 'idle') return 'pending';
  if (keyIndex < currentIndex) return 'done';
  if (keyIndex === currentIndex) return 'current';
  return 'pending';
};

export const PlannerCreateSheet = ({
  open,
  suggestion,
  creating,
  creationStep,
  onClose,
  onCreate,
}: Props) => {
  const [startDate, setStartDate] = useState(todayISO());
  const [dateOpen, setDateOpen] = useState(false);
  const [mode, setMode] = useState<PreparationMode>('essential');

  if (!suggestion) return null;

  const endDate = addDaysISO(startDate, Math.max(1, suggestion.days) - 1);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={creating ? () => {} : onClose}
        title="Préparer ce voyage"
        maxWidth={520}
      >
        <div className="space-y-5">
          <div
            className="rounded-[24px] p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.045))',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(var(--accent-from-rgb),0.16)', border: '1px solid rgba(var(--accent-from-rgb),0.24)' }}>
                {flagEmoji(suggestion.countryCode)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold tracking-tight">
                  {suggestion.destination}
                </div>
                <div className="text-xs text-white/45 mt-0.5">
                  {suggestion.country} · {suggestion.days} jours · {suggestion.estimatedBudget.toLocaleString('fr-FR')} {suggestion.currency}
                </div>
                {suggestion.type === 'roadtrip' && suggestion.stops && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {suggestion.stops.map((stop) => (
                      <span
                        key={`${stop.city}-${stop.days}`}
                        className="text-[10px] px-2 py-1 rounded-full"
                        style={{ background: 'rgba(124,140,255,0.14)', border: '1px solid rgba(124,140,255,0.22)', color: '#a5b4fc' }}
                      >
                        {stop.city} · {stop.days}j
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DateTrigger
            value={startDate}
            label="Date de départ"
            onClick={() => !creating && setDateOpen(true)}
          />

          <div>
            <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Niveau de préparation</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'essential' as PreparationMode, title: 'Essentiel', body: 'Crée le voyage' },
                { key: 'itinerary' as PreparationMode, title: 'Parcours suggéré', body: 'Ajoute des idées par jour' },
              ].map((item) => {
                const active = mode === item.key;
                return (
                  <button
                    key={item.key}
                    disabled={creating}
                    onClick={() => setMode(item.key)}
                    className="rounded-2xl p-3 text-left tap disabled:opacity-50"
                    style={{
                      background: active ? 'rgba(var(--accent-from-rgb),0.17)' : 'rgba(255,255,255,0.045)',
                      border: active ? '1px solid rgba(var(--accent-from-rgb),0.32)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-[10px] text-white/35 mt-1">{item.body}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar size={15} className="text-white/45" />
              {fmtRange(startDate, endDate)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/45">
              <div className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Photo destination</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Checklist IA</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Budget estimé</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={13} /> {suggestion.type === 'roadtrip' ? 'Roadtrip' : 'Voyage'}</div>
            </div>
          </div>

          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(var(--accent-from-rgb),0.10)', border: '1px solid rgba(var(--accent-from-rgb),0.20)' }}
              >
                <div className="text-sm font-semibold">Création premium…</div>
                <div className="space-y-2">
                  {getCreationSteps(mode === 'itinerary').map((step) => {
                    const state = getStepState(creationStep, step.key, mode === 'itinerary');
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: state === 'done'
                              ? 'rgba(86,197,164,0.22)'
                              : state === 'current'
                                ? 'rgba(var(--accent-from-rgb),0.18)'
                                : 'rgba(255,255,255,0.06)',
                            border: state === 'done'
                              ? '1px solid rgba(86,197,164,0.42)'
                              : '1px solid rgba(255,255,255,0.10)',
                          }}
                        >
                          {state === 'done' ? (
                            <Check size={14} style={{ color: '#56c5a4' }} />
                          ) : state === 'current' ? (
                            <span className="block w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/75 animate-spin" />
                          ) : (
                            <Circle size={13} className="text-white/20" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{step.title}</div>
                          <div className="text-[10px] text-white/32">{step.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => onCreate(startDate, mode === 'itinerary')}
            disabled={creating}
            className="w-full h-[52px] rounded-2xl font-bold tap disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              boxShadow: '0 14px 40px rgba(var(--accent-from-rgb),0.32)',
            }}
          >
            <Sparkles size={16} />
            {creating ? 'Création en cours…' : 'Créer dans My Plan’Air'}
          </button>
        </div>
      </BottomSheet>

      <DatePickerSheet
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        value={startDate}
        title="Date de départ"
        onChange={(iso) => {
          setStartDate(iso);
          setDateOpen(false);
        }}
      />
    </>
  );
};
