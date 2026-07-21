// src/features/travelPrep/partnerLinks.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Liens partenaires centralisés — E1 générique, E2 liens affiliés.
// Remplacer les URLs par les liens trackés dès que les comptes sont validés.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Trip } from '../../store/types';

export type PartnerActionCategory =
  | 'flights'
  | 'hotels'
  | 'esim'
  | 'insurance'
  | 'activities'
  | 'cars'
  | 'shopping'
  | 'banking';

export type PartnerAction = {
  id: string;
  category: PartnerActionCategory;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  partner: string;
  buildUrl: (trip: Trip) => string;
};

const q = (value: string) => encodeURIComponent(value);

export const PARTNER_ACTIONS: PartnerAction[] = [
  {
    id: 'flights-skyscanner',
    category: 'flights',
    title: 'Comparer les vols',
    subtitle: 'Skyscanner · prix et itinéraires',
    emoji: '✈️',
    color: '#0770e3',
    partner: 'Skyscanner',
    buildUrl: (trip) => `https://www.skyscanner.com/transport/flights/?q=${q(trip.destination)}`,
  },
  {
    id: 'hotels-booking',
    category: 'hotels',
    title: 'Trouver un hébergement',
    subtitle: 'Booking.com · hôtels et appartements',
    emoji: '🏨',
    color: '#003580',
    partner: 'Booking',
    buildUrl: (trip) => `https://www.booking.com/searchresults.html?ss=${q(trip.destination)}&checkin=${trip.startDate}&checkout=${trip.endDate}`,
  },
  {
    id: 'esim-airalo',
    category: 'esim',
    title: 'Préparer une eSIM',
    subtitle: 'Airalo · internet sur place',
    emoji: '📶',
    color: '#3b82f6',
    partner: 'Airalo',
    buildUrl: (trip) => `https://www.airalo.com/search?search=${q(trip.country)}`,
  },
  {
    id: 'insurance-safetywing',
    category: 'insurance',
    title: 'Assurance voyage',
    subtitle: 'SafetyWing · couverture nomade',
    emoji: '🛡️',
    color: '#4ade80',
    partner: 'SafetyWing',
    buildUrl: () => 'https://safetywing.com/',
  },
  {
    id: 'activities-viator',
    category: 'activities',
    title: 'Réserver des activités',
    subtitle: 'Viator · visites et expériences',
    emoji: '🎟️',
    color: '#d4000e',
    partner: 'Viator',
    buildUrl: (trip) => `https://www.viator.com/searchResults/all?text=${q(trip.destination)}`,
  },
  {
    id: 'activities-gyg',
    category: 'activities',
    title: 'Explorer les expériences',
    subtitle: 'GetYourGuide · activités locales',
    emoji: '🧭',
    color: '#ff6600',
    partner: 'GetYourGuide',
    buildUrl: (trip) => `https://www.getyourguide.com/s/?q=${q(trip.destination)}`,
  },
  {
    id: 'cars-discovercars',
    category: 'cars',
    title: 'Louer une voiture',
    subtitle: 'DiscoverCars · utile roadtrip',
    emoji: '🚗',
    color: '#2ecc71',
    partner: 'DiscoverCars',
    buildUrl: (trip) => `https://www.discovercars.com/search?location=${q(trip.destination)}`,
  },
  {
    id: 'shopping-amazon',
    category: 'shopping',
    title: 'Accessoires voyage',
    subtitle: 'Amazon · adaptateurs, bagages',
    emoji: '🧳',
    color: '#ff9900',
    partner: 'Amazon',
    buildUrl: () => 'https://www.amazon.fr/s?k=accessoires+voyage',
  },
  {
    id: 'banking-wise',
    category: 'banking',
    title: 'Paiements à l’étranger',
    subtitle: 'Wise · multi-devises',
    emoji: '💳',
    color: '#9fe870',
    partner: 'Wise',
    buildUrl: () => 'https://wise.com/',
  },
];

export const getSuggestedPartnerActions = (trip: Trip): PartnerAction[] => {
  const base = PARTNER_ACTIONS.filter((action) =>
    ['flights', 'hotels', 'esim', 'insurance', 'activities'].includes(action.category),
  );

  if (trip.isRoadtrip) {
    return [
      ...base,
      ...PARTNER_ACTIONS.filter((action) => action.category === 'cars'),
      ...PARTNER_ACTIONS.filter((action) => action.category === 'shopping').slice(0, 1),
    ];
  }

  return [
    ...base,
    ...PARTNER_ACTIONS.filter((action) => action.category === 'shopping').slice(0, 1),
  ];
};
