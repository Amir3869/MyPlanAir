// src/features/share/ShareView.tsx
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Wallet, ListChecks, Lock, MapPin, Plane } from 'lucide-react';
import { useTrip } from '../../store/tripStore';
import type { Trip } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { GlassCard } from '../../shared/GlassCard';
import { fmtMoney } from '../../utils/formatters';
import { fmtRange, daysBetween } from '../../utils/dateHelpers';

const PERIOD_LABEL: Record<string, string> = {
  morning:   '🌅 Matin',
  afternoon: '☀️ Après-midi',
  night:     '🌙 Soir',
};

const TYPE_ICON: Record<string, string> = {
  sight:     '🏛️',
  food:      '🍽️',
  transport: '🚆',
  lodging:   '🏨',
  other:     '📍',
};

// ── Décodage base64 → Trip ─────────────────────────────────────────────────
const decodeTripFromUrl = (encoded: string): Trip | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as Trip;
  } catch {
    return null;
  }
};

export const ShareView = () => {
  const { id }       = useParams<{ id: string }>();
  const location     = useLocation();
  const tripFromStore = useTrip(id);

  // ── Résolution du voyage ───────────────────────────────────────────────
  // Priorité 1 : paramètre ?v= encodé base64 (vrai partage cross-device)
  // Priorité 2 : localStorage via useTrip(id) (même device)
  const searchParams = new URLSearchParams(location.search);
  const encoded      = searchParams.get('v');
  const tripFromUrl  = encoded ? decodeTripFromUrl(encoded) : null;
  const trip         = tripFromUrl ?? tripFromStore;

  // ── Voyage introuvable ─────────────────────────────────────────────────
  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-8 max-w-sm w-full text-center"
          style={{
            background:    'rgba(255,255,255,0.06)',
            border:        '1px solid rgba(255,255,255,0.12)',
            backdropFilter:'blur(24px)',
          }}
        >
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-xl font-bold mb-2">Voyage introuvable</h2>
          <p className="text-sm text-white/50 leading-relaxed">
            Ce lien a expiré ou le voyage n'est plus disponible.
            Demandez un nouveau lien à son auteur.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Données calculées ─────────────────────────────────────────────────
  const publicExpenses = trip.expenses.filter((e) => !e.private);
  const spent          = publicExpenses.reduce((s, e) => s + e.amount, 0);
  const days           = daysBetween(trip.startDate, trip.endDate);
  const doneChecklist  = trip.checklist.filter((c) => c.done).length;
  const budgetPct      = trip.budget > 0
    ? Math.min(100, Math.round((spent / trip.budget) * 100))
    : 0;

  // Grouper les étapes par jour, triées par période
  const PERIOD_ORDER: Record<string, number> = {
    morning: 0, afternoon: 1, night: 2,
  };

  const stepsByDay = trip.steps.reduce<Record<number, typeof trip.steps>>(
    (acc, step) => {
      if (!acc[step.day]) acc[step.day] = [];
      acc[step.day].push(step);
      return acc;
    },
    {},
  );

  // Trier chaque jour par période
  Object.keys(stepsByDay).forEach((day) => {
    stepsByDay[Number(day)].sort(
      (a, b) => (PERIOD_ORDER[a.period] ?? 0) - (PERIOD_ORDER[b.period] ?? 0),
    );
  });

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen relative"
    >
      {/* Background photo */}
      {trip.photoUrl && (
        <>
          <div
            className="fixed inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${trip.photoUrl})`,
              opacity:         0.2,
              filter:          'blur(2px)',
              transform:       'scale(1.05)',
            }}
          />
          <div
            className="fixed inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(7,7,11,0.93) 50%, rgba(7,7,11,0.98) 100%)',
            }}
          />
        </>
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10 pb-28 space-y-5">

        {/* Badge lecture seule */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(124,140,255,0.15)',
            color:      '#7c8cff',
            border:     '1px solid rgba(124,140,255,0.3)',
          }}
        >
          <Lock size={11} />
          Mode lecture seule · Partagé via MyTrip
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Flag code={trip.countryCode} size={20} />
            <span className="text-sm text-white/65">{trip.country}</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tighter">
            {trip.destination}
          </h1>
          <p className="text-white/55 mt-1 flex items-center gap-2 text-sm">
            <Calendar size={13} />
            {fmtRange(trip.startDate, trip.endDate)}
            <span className="text-white/30">·</span>
            {days} jour{days > 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Stats rapides */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold font-display">{trip.steps.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Étapes</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold font-display">{days}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Jours</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold font-display">
              {doneChecklist}/{trip.checklist.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Prêts</div>
          </GlassCard>
        </motion.div>

        {/* Parcours */}
        {trip.steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={15} style={{ color: '#7c8cff' }} />
                <h2 className="font-semibold tracking-tight">Parcours</h2>
              </div>
              <div className="space-y-5">
                {Object.entries(stepsByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, steps]) => (
                    <div key={day}>
                      <div className="text-xs uppercase tracking-widest text-white/40 mb-2 font-semibold">
                        Jour {day}
                      </div>
                      <div className="space-y-2">
                        {steps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-start gap-3 p-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                              {TYPE_ICON[step.type] ?? '📍'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {step.title}
                              </div>
                              <div className="text-xs text-white/45 mt-0.5">
                                {step.place} · {PERIOD_LABEL[step.period] ?? step.period}
                              </div>
                              {step.notes && (
                                <div className="text-xs text-white/35 mt-1 italic">
                                  {step.notes}
                                </div>
                              )}
                            </div>
                            {step.done && (
                              <span
                                className="text-xs font-bold flex-shrink-0 mt-0.5"
                                style={{ color: '#56c5a4' }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Budget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={15} style={{ color: '#f0b24a' }} />
              <h2 className="font-semibold tracking-tight">Budget</h2>
            </div>
            <div className="flex justify-between items-end mb-3">
              <div>
                <div className="text-xs text-white/45 uppercase tracking-wider">Dépensé</div>
                <div className="text-2xl font-bold font-display">
                  {fmtMoney(spent, trip.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/45 uppercase tracking-wider">Budget total</div>
                <div className="text-lg font-semibold text-white/75">
                  {fmtMoney(trip.budget, trip.currency)}
                </div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPct}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-full rounded-full"
                style={{
                  background:
                    budgetPct > 90
                      ? 'linear-gradient(90deg, #f0b24a, #ef4444)'
                      : 'linear-gradient(90deg, #f0b24a, #ec4899)',
                }}
              />
            </div>
            {trip.expenses.some((e) => e.private) && (
              <p className="text-xs text-white/35 mt-3 flex items-center gap-1.5">
                <Lock size={10} />
                Certaines dépenses sont masquées par leur auteur.
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* Checklist */}
        {trip.checklist.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks size={15} style={{ color: '#56c5a4' }} />
                <h2 className="font-semibold tracking-tight">Préparation</h2>
              </div>
              <div className="space-y-2">
                {trip.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background: item.done
                          ? 'rgba(86,197,164,0.2)'
                          : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${
                          item.done
                            ? 'rgba(86,197,164,0.4)'
                            : 'rgba(255,255,255,0.12)'
                        }`,
                        color: '#56c5a4',
                      }}
                    >
                      {item.done ? '✓' : ''}
                    </div>
                    <span
                      className={
                        item.done ? 'line-through text-white/40' : 'text-white/80'
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Notes — non affichées (trop personnel) */}

        {/* CTA Download */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(124,140,255,0.15) 0%, rgba(236,72,153,0.10) 100%)',
            border:     '1px solid rgba(124,140,255,0.25)',
          }}
        >
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            }}
          >
            <Plane size={22} className="text-white -rotate-12" />
          </div>
          <h3 className="font-display text-xl font-bold tracking-tight mb-1">
            Planifié avec MyTrip
          </h3>
          <p className="text-sm text-white/55 mb-4">
            Crée ton propre carnet de voyage gratuitement.
            Assistant IA, budget, checklist et plus encore.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            }}
          >
            <Plane size={15} className="-rotate-12" />
            Essayer MyTrip — Gratuit
          </a>
        </motion.div>

      </div>
    </motion.div>
  );
};