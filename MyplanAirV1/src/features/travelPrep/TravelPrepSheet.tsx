// src/features/travelPrep/TravelPrepSheet.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Bottom sheet post-création — préparation intelligente, pas catalogue partenaire
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import type { Trip } from '../../store/types';
import { fmtRange } from '../../utils/dateHelpers';
import { PARTNER_ACTIONS, type PartnerAction, type PartnerActionCategory } from './partnerLinks';

type Props = {
  open: boolean;
  trip: Trip | null;
  onClose: () => void;
  onOpenTrip: () => void;
};

type PrepItem = {
  id: string;
  category: PartnerActionCategory;
  emoji: string;
  title: string;
  question: string;
  skipLabel: string;
  actionLabel: string;
  color: string;
  action?: PartnerAction;
};

const findAction = (category: PartnerActionCategory, preferredId?: string): PartnerAction | undefined => {
  if (preferredId) {
    const preferred = PARTNER_ACTIONS.find((action) => action.id === preferredId);
    if (preferred) return preferred;
  }
  return PARTNER_ACTIONS.find((action) => action.category === category);
};

const buildPrepItems = (trip: Trip): PrepItem[] => {
  const items: PrepItem[] = [
    {
      id: 'transport',
      category: 'flights',
      emoji: '✈️',
      title: 'Transport',
      question: 'Tu as déjà ton billet aller-retour ?',
      skipLabel: 'J’ai déjà',
      actionLabel: 'Chercher',
      color: '#0770e3',
      action: findAction('flights', 'flights-skyscanner'),
    },
    {
      id: 'hotel',
      category: 'hotels',
      emoji: '🏨',
      title: 'Hébergement',
      question: 'Tu as déjà réservé où dormir ?',
      skipLabel: 'J’ai déjà',
      actionLabel: 'Chercher',
      color: '#003580',
      action: findAction('hotels', 'hotels-booking'),
    },
    {
      id: 'esim',
      category: 'esim',
      emoji: '📶',
      title: 'eSIM',
      question: 'Internet sur place pour rester connecté.',
      skipLabel: 'Plus tard',
      actionLabel: 'Voir offres',
      color: '#3b82f6',
      action: findAction('esim', 'esim-airalo'),
    },
  ];

  if (trip.isRoadtrip) {
    items.push({
      id: 'car',
      category: 'cars',
      emoji: '🚗',
      title: 'Voiture',
      question: 'Utile pour organiser ton roadtrip sans galère.',
      skipLabel: 'Pas besoin',
      actionLabel: 'Comparer',
      color: '#2ecc71',
      action: findAction('cars', 'cars-discovercars'),
    });
  }

  return items;
};

export const TravelPrepSheet = ({ open, trip, onClose, onOpenTrip }: Props) => {
  const [handledItems, setHandledItems] = useState<Record<string, boolean>>({});

  const items = useMemo(() => trip ? buildPrepItems(trip) : [], [trip]);

  if (!trip) return null;

  const openPartner = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const markHandled = (id: string) => {
    setHandledItems((state) => ({ ...state, [id]: true }));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Préparer ton voyage" maxWidth={540}>
      <div className="space-y-5">
        <div
          className="rounded-[24px] p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.52)), url(${trip.photoUrl}) center/cover`,
            border: '1px solid rgba(255,255,255,0.12)',
            minHeight: 104,
          }}
        >
          <div className="relative">
            <div className="text-lg font-bold tracking-tight">
              {trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination}
            </div>
            <div className="text-xs text-white/58 mt-1">
              {fmtRange(trip.startDate, trip.endDate)} · {trip.budget.toLocaleString('fr-FR')} {trip.currency}
            </div>
          </div>
        </div>

        <div>
          <div className="px-1 mb-3">
            <div className="text-xs uppercase tracking-wider text-white/35">Les essentiels maintenant</div>
            <div className="text-[11px] text-white/25 mt-0.5">
              On te propose seulement ce qui est utile juste après la création.
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const handled = handledItems[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-[22px] p-3"
                  style={{
                    background: handled ? 'rgba(86,197,164,0.075)' : 'rgba(255,255,255,0.055)',
                    border: handled ? '1px solid rgba(86,197,164,0.22)' : '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: `${item.color}1f`, border: `1px solid ${item.color}36` }}
                    >
                      {handled ? <Check size={17} style={{ color: '#56c5a4' }} /> : item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold tracking-tight">{item.title}</div>
                      <div className="text-xs text-white/38 mt-0.5 leading-relaxed">{item.question}</div>
                    </div>
                  </div>

                  {!handled && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => markHandled(item.id)}
                        className="h-10 rounded-2xl text-xs font-semibold tap"
                        style={{ background: 'rgba(255,255,255,0.065)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.58)' }}
                      >
                        {item.skipLabel}
                      </button>
                      <button
                        onClick={() => {
                          if (item.action) openPartner(item.action.buildUrl(trip));
                          markHandled(item.id);
                        }}
                        className="h-10 rounded-2xl text-xs font-bold tap flex items-center justify-center gap-1.5"
                        style={{
                          background: `linear-gradient(180deg, ${item.color}18, rgba(255,255,255,0.055))`,
                          border: `1px solid ${item.color}42`,
                          color: 'rgba(255,255,255,0.88)',
                          boxShadow: `0 8px 24px ${item.color}10`,
                        }}
                      >
                        {item.actionLabel}
                        <ExternalLink size={12} style={{ color: item.color }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-2xl p-3 text-[11px] text-white/30 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Les liens sont génériques pour l’instant. Les liens affiliés seront branchés dans <code>partnerLinks.ts</code>.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="h-12 rounded-2xl font-semibold tap"
            style={{ background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            Fermer
          </button>
          <button
            onClick={onOpenTrip}
            className="h-12 rounded-2xl font-bold tap flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              boxShadow: '0 12px 34px rgba(var(--accent-from-rgb), 0.28)',
            }}
          >
            Voir le voyage <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
