// src/features/decouvrir/plannerTypes.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Types du Planificateur IA Découvrir V2
// ═══════════════════════════════════════════════════════════════════════════════

import type { TravelStyle } from '../../store/types';

export type PlannerMood = 'sun' | 'city' | 'nature' | 'roadtrip' | 'culture' | 'surprise';

export type PlannerDestination = {
  label: string;
  country?: string;
  countryCode?: string;
  currency?: string;
  capital?: string;
  lat?: number;
  lon?: number;
  type: 'city' | 'country' | 'free';
};

export type PlannerTripMode = 'auto' | 'city' | 'roadtrip';

export type PlannerRequest = {
  mood: PlannerMood;
  prompt: string;
  destination?: PlannerDestination;
  tripMode: PlannerTripMode;
  preferredCities: string[];
  origin: {
    city: string;
    lat: number;
    lon: number;
  };
  budget: number;
  days: number;
  travelStyle: TravelStyle;
  currency: string;
};

export type PlannerBudgetBreakdown = {
  route: number;
  lodging: number;
  food: number;
  activities: number;
  localTransport: number;
  safety: number;
};

export type PlannerBudgetFeedback = {
  level: 'comfortable' | 'good' | 'tight' | 'too_low';
  label: string;
  emoji: string;
  color: string;
  message: string;
};

export type PlannerStop = {
  city: string;
  days: number;
  countryCode?: string;
  lat?: number;
  lon?: number;
};

export type PlannerSuggestion = {
  id: string;
  destination: string;
  country: string;
  countryCode: string;
  lat?: number;
  lon?: number;
  capital?: string;
  type: 'city' | 'roadtrip';
  days: number;
  estimatedBudget: number;
  currency: string;
  bestFor: string;
  description: string;
  breakdown: PlannerBudgetBreakdown;
  feedback: PlannerBudgetFeedback;
  stops?: PlannerStop[];
};

export const PLANNER_MOODS: {
  key: PlannerMood;
  emoji: string;
  label: string;
}[] = [
  { key: 'sun',      emoji: '☀️', label: 'Soleil' },
  { key: 'city',     emoji: '🏙️', label: 'City' },
  { key: 'nature',   emoji: '🌿', label: 'Nature' },
  { key: 'roadtrip', emoji: '🎒', label: 'Aventures' },
  { key: 'culture',  emoji: '🏛️', label: 'Culture' },
  { key: 'surprise', emoji: '✨', label: 'Surprise' },
];

export const PLANNER_DURATIONS = [5, 7, 10, 14];
