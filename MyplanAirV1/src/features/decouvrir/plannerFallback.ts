// src/features/decouvrir/plannerFallback.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Données de démonstration online-only pour valider l'UX du Planificateur.
// Ce n'est PAS un mode IA hors-ligne : le vrai branchement viendra via Worker.
// ═══════════════════════════════════════════════════════════════════════════════

import { haversineKm } from '../../utils/geo';
import type {
  PlannerBudgetBreakdown,
  PlannerBudgetFeedback,
  PlannerMood,
  PlannerRequest,
  PlannerSuggestion,
} from './plannerTypes';

const sumBreakdown = (b: PlannerBudgetBreakdown): number =>
  b.route + b.lodging + b.food + b.activities + b.localTransport + b.safety;

const estimateRouteCost = (distanceKm: number): number => {
  if (distanceKm <= 120) return 30;
  if (distanceKm <= 300) return 70;
  if (distanceKm <= 650) return 120;
  if (distanceKm <= 1200) return 190;
  if (distanceKm <= 2500) return 320;
  if (distanceKm <= 5000) return 520;
  if (distanceKm <= 9000) return 720;
  return 920;
};

const getCostProfile = (countryCode?: string) => {
  const cc = (countryCode ?? '').toUpperCase();
  if (['MY', 'TH', 'VN', 'ID', 'PH', 'KH', 'LA'].includes(cc)) {
    return { lodgingDay: 55, foodDay: 28, activitiesDay: 24, localDay: 18, safetyDay: 10 };
  }
  if (['JP', 'KR', 'SG'].includes(cc)) {
    return { lodgingDay: 95, foodDay: 42, activitiesDay: 34, localDay: 22, safetyDay: 14 };
  }
  if (['FR', 'ES', 'IT', 'DE', 'NL', 'BE', 'CH', 'AT', 'GB', 'IE', 'DK', 'SE', 'NO', 'FI'].includes(cc)) {
    return { lodgingDay: 115, foodDay: 55, activitiesDay: 38, localDay: 24, safetyDay: 18 };
  }
  if (['PL', 'CZ', 'HU', 'AL', 'BA', 'RS', 'RO', 'BG', 'PT'].includes(cc)) {
    return { lodgingDay: 70, foodDay: 34, activitiesDay: 25, localDay: 16, safetyDay: 12 };
  }
  return { lodgingDay: 80, foodDay: 38, activitiesDay: 30, localDay: 20, safetyDay: 14 };
};

const travelStyleMultiplier = (style: string): number => ({
  solo: 1,
  couple: 1.65,
  family: 2.35,
  business: 1.55,
}[style] ?? 1);

const scaleBreakdown = (
  base: PlannerBudgetBreakdown,
  days: number,
  routeOverride?: number,
  countryCode?: string,
  travelStyle = 'solo',
): PlannerBudgetBreakdown => {
  const ratio = Math.max(0.75, days / 7);
  const profile = getCostProfile(countryCode);
  const mult = travelStyleMultiplier(travelStyle);
  const caps = {
    lodging: Math.round(profile.lodgingDay * days * mult),
    food: Math.round(profile.foodDay * days * mult),
    activities: Math.round(profile.activitiesDay * days * mult),
    localTransport: Math.round(profile.localDay * days * mult),
    safety: Math.round(profile.safetyDay * days * mult),
  };

  return {
    route: Math.round(routeOverride ?? base.route),
    lodging: Math.min(Math.round(base.lodging * ratio), caps.lodging),
    food: Math.min(Math.round(base.food * ratio), caps.food),
    activities: Math.min(Math.round(base.activities * ratio), caps.activities),
    localTransport: Math.min(Math.round(base.localTransport * ratio), caps.localTransport),
    safety: Math.min(Math.round(base.safety * ratio), caps.safety),
  };
};

export const getBudgetFeedback = (budget: number, estimate: number): PlannerBudgetFeedback => {
  const ratio = budget / Math.max(estimate, 1);

  if (ratio >= 1.8) {
    return {
      level: 'comfortable',
      label: 'Budget très confortable',
      emoji: '👑',
      color: '#56c5a4',
      message: 'Ton budget est largement au-dessus de l’estimation : tu peux viser un voyage très confortable, voire premium, tout en gardant une marge.',
    };
  }

  if (ratio >= 1.15) {
    return {
      level: 'comfortable',
      label: 'Budget confortable',
      emoji: '✅',
      color: '#56c5a4',
      message: 'Tu as une marge confortable pour profiter sans trop serrer les dépenses.',
    };
  }

  if (ratio >= 0.95) {
    return {
      level: 'good',
      label: 'Budget faisable',
      emoji: '👍',
      color: '#7c8cff',
      message: 'Ton budget colle bien à cette idée, avec quelques arbitrages raisonnables.',
    };
  }

  if (ratio >= 0.72) {
    return {
      level: 'tight',
      label: 'Budget serré',
      emoji: '⚠️',
      color: '#f0b24a',
      message: 'Possible, mais il faudra réduire hébergement, activités ou période de départ.',
    };
  }

  return {
    level: 'too_low',
    label: 'Trop juste',
    emoji: '❌',
    color: '#ef4444',
    message: 'My Plan’Air te conseille une destination moins coûteuse ou une durée plus courte.',
  };
};

const baseIdeas: Record<PlannerMood, Omit<PlannerSuggestion, 'id' | 'days' | 'estimatedBudget' | 'currency' | 'feedback'>[]> = {
  sun: [
    {
      destination: 'Marrakech', country: 'Maroc', countryCode: 'MA', type: 'city',
      bestFor: 'Soleil · Culture · Budget doux',
      description: 'Une valeur sûre pour soleil, riads, cuisine et dépaysement sans exploser le budget.',
      breakdown: { route: 220, lodging: 350, food: 180, activities: 120, localTransport: 80, safety: 90 },
    },
    {
      destination: 'Valence', country: 'Espagne', countryCode: 'ES', type: 'city',
      bestFor: 'Soleil · Mer · City trip',
      description: 'Moins chère que Barcelone, très agréable à pied et parfaite pour quelques jours au soleil.',
      breakdown: { route: 160, lodging: 430, food: 210, activities: 120, localTransport: 70, safety: 80 },
    },
    {
      destination: 'Sicile', country: 'Italie', countryCode: 'IT', type: 'roadtrip',
      bestFor: 'Soleil · Route · Gastronomie',
      description: 'Un mini-roadtrip entre villes historiques, plages et villages avec une vraie âme méditerranéenne.',
      breakdown: { route: 190, lodging: 520, food: 240, activities: 160, localTransport: 220, safety: 110 },
      stops: [{ city: 'Palerme', days: 3 }, { city: 'Cefalù', days: 2 }, { city: 'Catane', days: 2 }],
    },
  ],
  city: [
    {
      destination: 'Istanbul', country: 'Turquie', countryCode: 'TR', type: 'city',
      bestFor: 'City trip · Culture · Food',
      description: 'Très forte identité, excellente nourriture, quartiers variés et budget souvent plus doux que l’Europe de l’Ouest.',
      breakdown: { route: 230, lodging: 360, food: 170, activities: 130, localTransport: 60, safety: 90 },
    },
    {
      destination: 'Prague', country: 'Tchéquie', countryCode: 'CZ', type: 'city',
      bestFor: 'Architecture · Week-end · Budget maîtrisé',
      description: 'Compacte, très belle, facile à organiser et idéale pour un premier city trip premium sans stress.',
      breakdown: { route: 140, lodging: 400, food: 180, activities: 110, localTransport: 55, safety: 80 },
    },
    {
      destination: 'Lisbonne', country: 'Portugal', countryCode: 'PT', type: 'city',
      bestFor: 'Soleil · Ville · Océan',
      description: 'Une ville lumineuse, vivante et très photogénique, parfaite pour mélanger balade, food et viewpoints.',
      breakdown: { route: 180, lodging: 470, food: 220, activities: 120, localTransport: 60, safety: 90 },
    },
  ],
  nature: [
    {
      destination: 'Madère', country: 'Portugal', countryCode: 'PT', type: 'roadtrip',
      bestFor: 'Randonnée · Nature · Océan',
      description: 'Une destination spectaculaire pour marcher, conduire, respirer et voir des paysages très forts.',
      breakdown: { route: 240, lodging: 470, food: 210, activities: 110, localTransport: 240, safety: 100 },
      stops: [{ city: 'Funchal', days: 3 }, { city: 'Seixal', days: 2 }, { city: 'Ponta do Sol', days: 2 }],
    },
    {
      destination: 'Slovénie', country: 'Slovénie', countryCode: 'SI', type: 'roadtrip',
      bestFor: 'Lacs · Montagnes · Route',
      description: 'Très bon équilibre entre nature, sécurité, beauté et distances courtes entre étapes.',
      breakdown: { route: 190, lodging: 500, food: 220, activities: 130, localTransport: 260, safety: 110 },
      stops: [{ city: 'Ljubljana', days: 2 }, { city: 'Bled', days: 3 }, { city: 'Piran', days: 2 }],
    },
    {
      destination: 'Écosse', country: 'Royaume-Uni', countryCode: 'GB', type: 'roadtrip',
      bestFor: 'Nature brute · Route · Ambiance',
      description: 'Un voyage visuel très fort, parfait si tu veux de grands paysages et une vraie sensation d’aventure.',
      breakdown: { route: 180, lodging: 620, food: 260, activities: 120, localTransport: 330, safety: 130 },
      stops: [{ city: 'Édimbourg', days: 2 }, { city: 'Glencoe', days: 2 }, { city: 'Skye', days: 3 }],
    },
  ],
  roadtrip: [
    {
      destination: 'Malaisie', country: 'Malaisie', countryCode: 'MY', type: 'roadtrip',
      bestFor: 'Roadtrip · Plages · Budget intelligent',
      description: 'Un très bon mix entre ville, îles, nature et nourriture, avec un budget souvent très intéressant.',
      breakdown: { route: 620, lodging: 360, food: 190, activities: 150, localTransport: 230, safety: 120 },
      stops: [{ city: 'Kuala Lumpur', days: 3 }, { city: 'Penang', days: 3 }, { city: 'Langkawi', days: 4 }],
    },
    {
      destination: 'Andalousie', country: 'Espagne', countryCode: 'ES', type: 'roadtrip',
      bestFor: 'Route · Soleil · Culture',
      description: 'Très accessible, très riche visuellement, et facile à organiser en plusieurs étapes.',
      breakdown: { route: 170, lodging: 520, food: 230, activities: 150, localTransport: 260, safety: 110 },
      stops: [{ city: 'Séville', days: 3 }, { city: 'Cordoue', days: 2 }, { city: 'Grenade', days: 3 }],
    },
    {
      destination: 'Jordanie', country: 'Jordanie', countryCode: 'JO', type: 'roadtrip',
      bestFor: 'Désert · Culture · Aventure',
      description: 'Un itinéraire très fort entre Amman, Pétra, Wadi Rum et mer Morte, parfait pour un voyage marquant.',
      breakdown: { route: 360, lodging: 430, food: 210, activities: 230, localTransport: 260, safety: 130 },
      stops: [{ city: 'Amman', days: 2 }, { city: 'Pétra', days: 2 }, { city: 'Wadi Rum', days: 2 }, { city: 'Mer Morte', days: 1 }],
    },
  ],
  culture: [
    {
      destination: 'Rome', country: 'Italie', countryCode: 'IT', type: 'city',
      bestFor: 'Histoire · Food · Balades',
      description: 'Un classique puissant, très dense culturellement, parfait si tu veux un voyage beau et simple à organiser.',
      breakdown: { route: 150, lodging: 520, food: 260, activities: 180, localTransport: 60, safety: 100 },
    },
    {
      destination: 'Athènes', country: 'Grèce', countryCode: 'GR', type: 'city',
      bestFor: 'Culture · Soleil · Budget correct',
      description: 'Histoire forte, quartiers vivants et possibilité de combiner avec une île si le budget le permet.',
      breakdown: { route: 210, lodging: 460, food: 220, activities: 150, localTransport: 70, safety: 95 },
    },
    {
      destination: 'Cracovie', country: 'Pologne', countryCode: 'PL', type: 'city',
      bestFor: 'Culture · Budget · Week-end',
      description: 'Une option très intéressante si tu veux un voyage riche, joli et raisonnable côté budget.',
      breakdown: { route: 130, lodging: 330, food: 150, activities: 110, localTransport: 50, safety: 70 },
    },
  ],
  surprise: [
    {
      destination: 'Tbilissi', country: 'Géorgie', countryCode: 'GE', type: 'city',
      bestFor: 'Original · Food · Culture',
      description: 'Une destination moins évidente, très attachante, avec une vraie identité et un excellent rapport expérience/prix.',
      breakdown: { route: 300, lodging: 280, food: 130, activities: 100, localTransport: 70, safety: 90 },
    },
    {
      destination: 'Ouzbékistan', country: 'Ouzbékistan', countryCode: 'UZ', type: 'roadtrip',
      bestFor: 'Culture · Route · Dépaysement',
      description: 'Un voyage très marquant entre cités mythiques, parfait si tu veux quelque chose de différent.',
      breakdown: { route: 520, lodging: 320, food: 150, activities: 120, localTransport: 180, safety: 110 },
      stops: [{ city: 'Tachkent', days: 2 }, { city: 'Samarcande', days: 3 }, { city: 'Boukhara', days: 2 }],
    },
    {
      destination: 'Albanie', country: 'Albanie', countryCode: 'AL', type: 'roadtrip',
      bestFor: 'Mer · Route · Budget',
      description: 'Encore abordable, très belle en roadtrip, avec un mix mer, montagne et villages.',
      breakdown: { route: 170, lodging: 360, food: 150, activities: 100, localTransport: 220, safety: 90 },
      stops: [{ city: 'Tirana', days: 2 }, { city: 'Berat', days: 2 }, { city: 'Saranda', days: 3 }],
    },
  ],
};

const selectIdeas = (mood: PlannerMood, prompt: string): Omit<PlannerSuggestion, 'id' | 'days' | 'estimatedBudget' | 'currency' | 'feedback'>[] => {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('plage') || normalized.includes('soleil') || normalized.includes('mer')) return baseIdeas.sun;
  if (normalized.includes('road') || normalized.includes('route') || normalized.includes('plusieurs')) return baseIdeas.roadtrip;
  if (normalized.includes('nature') || normalized.includes('rando') || normalized.includes('montagne')) return baseIdeas.nature;
  if (normalized.includes('culture') || normalized.includes('histoire') || normalized.includes('musée')) return baseIdeas.culture;
  if (normalized.includes('ville') || normalized.includes('city') || normalized.includes('weekend')) return baseIdeas.city;
  return baseIdeas[mood] ?? baseIdeas.surprise;
};

const ROADTRIP_PRESETS: Record<string, string[][]> = {
  MY: [
    ['Kuala Lumpur', 'Penang', 'Langkawi'],
    ['Kuala Lumpur', 'Cameron Highlands', 'Penang', 'Langkawi'],
    ['Kuala Lumpur', 'Malacca', 'Îles Perhentian', 'Langkawi'],
  ],
  JP: [
    ['Tokyo', 'Kyoto', 'Osaka'],
    ['Tokyo', 'Hakone', 'Kyoto', 'Osaka'],
    ['Tokyo', 'Kyoto', 'Nara', 'Osaka'],
  ],
  JO: [
    ['Amman', 'Pétra', 'Wadi Rum', 'Mer Morte'],
    ['Amman', 'Jerash', 'Pétra', 'Aqaba'],
    ['Amman', 'Pétra', 'Wadi Rum'],
  ],
  ES: [
    ['Séville', 'Cordoue', 'Grenade'],
    ['Barcelone', 'Valence', 'Madrid'],
    ['Malaga', 'Grenade', 'Séville', 'Cordoue'],
  ],
  IT: [
    ['Rome', 'Florence', 'Venise'],
    ['Palerme', 'Cefalù', 'Catane'],
    ['Naples', 'Amalfi', 'Rome'],
  ],
  PT: [
    ['Lisbonne', 'Porto', 'Coimbra'],
    ['Funchal', 'Seixal', 'Ponta do Sol'],
    ['Lisbonne', 'Sintra', 'Porto'],
  ],
  AL: [
    ['Tirana', 'Berat', 'Saranda'],
    ['Tirana', 'Gjirokastër', 'Ksamil'],
    ['Shkodër', 'Tirana', 'Berat', 'Vlora'],
  ],
};

const recommendedStopCount = (days: number): number => {
  if (days <= 7) return 2;
  if (days <= 12) return 3;
  if (days <= 18) return 4;
  return 5;
};

const distributeStopDays = (cities: string[], totalDays: number) => {
  const count = Math.max(1, cities.length);
  const base = Math.floor(totalDays / count);
  let rest = totalDays - base * count;
  return cities.map((city) => {
    const extra = rest > 0 ? 1 : 0;
    rest -= extra;
    return { city, days: Math.max(1, base + extra) };
  });
};

const buildRoadtripVariants = (countryCode: string, capital: string, preferredCities: string[], days: number): string[][] => {
  const preset = ROADTRIP_PRESETS[countryCode.toUpperCase()] ?? [
    [capital, 'Ville culturelle', 'Étape nature'],
    [capital, 'Ville secondaire', 'Étape détente'],
    [capital, 'Étape locale', 'Ville finale'],
  ];

  const targetCount = recommendedStopCount(days);

  if (preferredCities.length > 0) {
    const base = [...preferredCities];
    const fillers = preset.flat().filter((city) =>
      !base.some((chosen) => chosen.toLowerCase() === city.toLowerCase()),
    );
    const completed = [...base, ...fillers].slice(0, Math.max(base.length, targetCount));
    return [
      completed,
      [...base, ...fillers.slice().reverse()].slice(0, Math.max(base.length, targetCount)),
      [...new Set([...base, ...preset[0]])].slice(0, Math.max(base.length, targetCount)),
    ];
  }

  return preset.map((variant) => variant.slice(0, Math.min(targetCount, variant.length)));
};

const routeFromRequest = (request: PlannerRequest): number | undefined => {
  const dest = request.destination;
  if (typeof dest?.lat !== 'number' || typeof dest?.lon !== 'number') return undefined;
  if (dest.lat === 0 && dest.lon === 0) return undefined;
  return estimateRouteCost(haversineKm(request.origin.lat, request.origin.lon, dest.lat, dest.lon));
};

const destinationBaseBreakdown = (route: number | undefined): PlannerBudgetBreakdown => ({
  route: route ?? 260,
  lodging: 420,
  food: 210,
  activities: 150,
  localTransport: 90,
  safety: 100,
});

export const generatePlannerDemoSuggestions = (request: PlannerRequest): PlannerSuggestion[] => {
  const destination = request.destination;
  const routeOverride = routeFromRequest(request);

  // Cas A — Ville sélectionnée : une seule card, uniquement cette ville.
  if (destination?.type === 'city' || destination?.type === 'free') {
    const base = destinationBaseBreakdown(routeOverride);
    const breakdown = scaleBreakdown(base, request.days, routeOverride, destination.countryCode, request.travelStyle);
    const estimate = sumBreakdown(breakdown);
    const feedback = getBudgetFeedback(request.budget, estimate);

    const label = destination.label;
    return [{
      id: `${destination.countryCode ?? 'XX'}-${label}-target`,
      destination: label,
      country: destination.country ?? label,
      countryCode: destination.countryCode ?? 'XX',
      lat: destination.lat,
      lon: destination.lon,
      capital: destination.capital,
      type: 'city',
      days: request.days,
      estimatedBudget: estimate,
      currency: request.currency,
      bestFor: 'Destination ciblée · estimation selon ton profil',
      description: `Estimation structurée pour ${label} depuis ${request.origin.city}. Le Worker IA affinera ensuite selon les dates, la saison et les prix réels.`,
      breakdown,
      feedback,
    }];
  }

  // Cas B — Pays sélectionné : séjour simple OU roadtrip IA.
  if (destination?.type === 'country') {
    const country = destination.country ?? destination.label;
    const code = destination.countryCode ?? 'XX';
    const capital = destination.capital ?? destination.label;
    const route = routeOverride ?? 320;

    if (request.tripMode === 'roadtrip') {
      const wished = request.preferredCities.filter((city) => city.trim().length > 0).slice(0, 5);
      const variants = buildRoadtripVariants(code, capital, wished, request.days).slice(0, 3);

      return variants.map((cities, index) => {
        const stops = distributeStopDays(cities, request.days);
        const idea: Omit<PlannerSuggestion, 'id' | 'days' | 'estimatedBudget' | 'currency' | 'feedback'> = {
          destination: `${country} · Roadtrip`,
          country,
          countryCode: code,
          capital,
          type: 'roadtrip',
          bestFor: wished.length > 0
            ? `Roadtrip · option ${index + 1} avec tes villes`
            : `Roadtrip IA · option ${index + 1}`,
          description: wished.length > 0
            ? `Un parcours construit autour de tes villes souhaitées, avec une répartition cohérente sur ${request.days} jours.`
            : `Un parcours roadtrip logique dans ${country}, pensé pour ${request.days} jours avec un rythme faisable.`,
          breakdown: { route, lodging: 520, food: 240, activities: 180, localTransport: 260, safety: 130 },
          stops,
        };

        const breakdown = scaleBreakdown(idea.breakdown, request.days, route, code, request.travelStyle);
        const estimate = sumBreakdown(breakdown);
        const feedback = getBudgetFeedback(request.budget, estimate);

        return {
          ...idea,
          id: `${code}-${country}-roadtrip-${index}`,
          days: request.days,
          estimatedBudget: estimate,
          currency: request.currency,
          feedback,
        };
      });
    }


    const idea: Omit<PlannerSuggestion, 'id' | 'days' | 'estimatedBudget' | 'currency' | 'feedback'> = {
      destination: capital,
      country,
      countryCode: code,
      capital,
      type: 'city',
      bestFor: 'Séjour simple · première découverte',
      description: `Une première approche centrée sur ${capital}, plus simple à organiser pour découvrir ${country}.`,
      breakdown: { route, lodging: 430, food: 210, activities: 140, localTransport: 80, safety: 100 },
    };

    const breakdown = scaleBreakdown(idea.breakdown, request.days, route, code, request.travelStyle);
    const estimate = sumBreakdown(breakdown);
    const feedback = getBudgetFeedback(request.budget, estimate);

    return [{
      ...idea,
      id: `${code}-${capital}-city`,
      days: request.days,
      estimatedBudget: estimate,
      currency: request.currency,
      feedback,
    }];
  }

  // Cas C — Pas de destination ciblée : inspiration générale.
  const ideas = selectIdeas(request.mood, request.prompt).slice(0, 3);
  return ideas.map((idea, index) => {
    const breakdown = scaleBreakdown(idea.breakdown, request.days, undefined, idea.countryCode, request.travelStyle);
    const estimate = sumBreakdown(breakdown);
    const feedback = getBudgetFeedback(request.budget, estimate);

    return {
      ...idea,
      id: `${idea.countryCode}-${idea.destination}-${index}`,
      days: request.days,
      estimatedBudget: estimate,
      currency: request.currency,
      feedback,
    };
  });
};
