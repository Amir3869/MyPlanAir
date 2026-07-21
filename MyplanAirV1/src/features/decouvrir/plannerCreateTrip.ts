// src/features/decouvrir/plannerCreateTrip.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Création d'un Trip depuis une suggestion du Planificateur IA
// ═══════════════════════════════════════════════════════════════════════════════

import { fetchAssistant, fetchTripPhoto } from '../../api/cloud';
import { CAPITAL_COORDS } from '../../api/cloud/capitals';
import type { ChecklistItem, TravelStyle, Trip, TripDestination } from '../../store/tripStore';
import { addDaysISO } from '../../utils/dateHelpers';
import { buildItineraryPayload, fetchItinerary } from './itineraryApi';
import type { PlannerSuggestion } from './plannerTypes';

type CreatePlannerTripInput = {
  suggestion: PlannerSuggestion;
  startDate: string;
  homeCurrency: string;
  travelStyle: TravelStyle | null;
  withItinerary: boolean;
};

type CreatePlannerTripProgress = 'photo' | 'checklist' | 'itinerary' | 'saving';

type CreatePlannerTripOptions = {
  onProgress?: (step: CreatePlannerTripProgress) => void;
};

const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80';

const fallbackChecklist = (): ChecklistItem[] => [
  "Passeport / Carte d'identité",
  'Réservations transport',
  'Réservations hébergement',
  'Assurance voyage',
  'Moyens de paiement',
  'Adaptateur / chargeurs',
  'Médicaments essentiels',
  'Documents importants sauvegardés',
].map((label) => ({ id: crypto.randomUUID(), label, done: false }));

const buildRoadtripDestinations = (
  suggestion: PlannerSuggestion,
  startDate: string,
): TripDestination[] | undefined => {
  if (suggestion.type !== 'roadtrip' || !suggestion.stops || suggestion.stops.length === 0) {
    return undefined;
  }

  let offset = 0;
  return suggestion.stops.map((stop, index) => {
    const isLast = index === suggestion.stops!.length - 1;
    const days = Math.max(1, stop.days);
    const fromDay = offset + 1;
    const toDay = isLast ? suggestion.days : Math.min(suggestion.days, offset + days);
    const fromDate = addDaysISO(startDate, offset);
    const toDate = addDaysISO(startDate, toDay - 1);
    offset = toDay;

    return {
      city: stop.city,
      countryCode: stop.countryCode ?? suggestion.countryCode,
      lat: stop.lat,
      lon: stop.lon,
      fromDate,
      toDate,
      fromDay,
      toDay,
    };
  });
};

const getSuggestionCoords = (suggestion: PlannerSuggestion): { lat?: number; lon?: number } => {
  if (typeof suggestion.lat === 'number' && typeof suggestion.lon === 'number') {
    return { lat: suggestion.lat, lon: suggestion.lon };
  }
  const capital = CAPITAL_COORDS[suggestion.countryCode?.toUpperCase?.() ?? ''];
  if (capital) return { lat: capital.lat, lon: capital.lon };
  return {};
};

export const createPlannerTrip = async (
  input: CreatePlannerTripInput,
  options: CreatePlannerTripOptions = {},
): Promise<Trip> => {
  const { suggestion, startDate, homeCurrency, travelStyle, withItinerary } = input;
  const endDate = addDaysISO(startDate, Math.max(1, suggestion.days) - 1);
  const isRoadtrip = suggestion.type === 'roadtrip';
  const destinations = buildRoadtripDestinations(suggestion, startDate);
  const mainCity = isRoadtrip
    ? suggestion.stops?.[0]?.city ?? suggestion.destination
    : suggestion.destination;

  options.onProgress?.('photo');
  const photoResult = await fetchTripPhoto({
    city: mainCity,
    country: suggestion.country,
    countryCode: suggestion.countryCode,
    capital: suggestion.capital,
  });

  const photoUrl = photoResult.ok && photoResult.photoUrl
    ? photoResult.photoUrl
    : FALLBACK_PHOTO;

  options.onProgress?.('checklist');
  const assistantResult = await fetchAssistant({
    city: mainCity,
    country: suggestion.country,
    days: suggestion.days,
    budget: suggestion.estimatedBudget,
    currency: suggestion.currency,
    homeCurrency,
  });

  const checklist =
    assistantResult.ok && assistantResult.checklist.length > 0
      ? assistantResult.checklist.map((label) => ({
          id: crypto.randomUUID(),
          label,
          done: false,
        }))
      : fallbackChecklist();

  const coords = getSuggestionCoords(suggestion);

  let steps: Trip['steps'] = [];
  if (withItinerary) {
    options.onProgress?.('itinerary');
    const itinerary = await fetchItinerary(buildItineraryPayload(suggestion, destinations, travelStyle));
    if (itinerary.ok && itinerary.steps.length > 0) {
      steps = itinerary.steps;
    } else {
      console.warn('[plannerCreateTrip] Parcours IA indisponible, création sans étapes:', itinerary);
    }
  }

  options.onProgress?.('saving');

  return {
    id: crypto.randomUUID(),
    destination: isRoadtrip ? suggestion.country : suggestion.destination,
    country: suggestion.country,
    countryCode: suggestion.countryCode,
    capital: suggestion.capital,
    startDate,
    endDate,
    budget: suggestion.estimatedBudget,
    currency: suggestion.currency,
    homeCurrency,
    photoUrl,
    lat: coords.lat,
    lon: coords.lon,
    steps,
    expenses: [],
    checklist,
    documents: [],
    memories: [],
    notes: `Créé depuis le Planificateur IA MyTrip.\n\n${suggestion.description}`,
    createdAt: new Date().toISOString(),
    isRoadtrip,
    destinations,
  };
};
