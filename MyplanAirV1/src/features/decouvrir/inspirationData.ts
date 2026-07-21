// src/features/decouvrir/inspirationData.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Inspirations rapides pour Découvrir V2
// Pool local qualitatif : pas une IA hors-ligne, juste une source d'inspiration.
// ═══════════════════════════════════════════════════════════════════════════════

export type InspirationFamily =
  | 'soleil'
  | 'city'
  | 'nature'
  | 'roadtrip'
  | 'neige'
  | 'budget'
  | 'culture'
  | 'surprise';

export type InspirationDestination = {
  name: string;
  emoji: string;
  family: InspirationFamily;
  prompt: string;
};

export const INSPIRATION_POOL: InspirationDestination[] = [
  // Soleil
  { name: 'Marrakech', emoji: '☀️', family: 'soleil', prompt: 'Marrakech, soleil, culture, budget maîtrisé' },
  { name: 'Bali', emoji: '🌴', family: 'soleil', prompt: 'Bali, plage, nature, temples et voyage dépaysant' },
  { name: 'Valence', emoji: '☀️', family: 'soleil', prompt: 'Valence, soleil, mer, city trip et budget raisonnable' },
  { name: 'Crète', emoji: '🏝️', family: 'soleil', prompt: 'Crète, plages, villages, cuisine locale et soleil' },
  { name: 'Djerba', emoji: '🌊', family: 'soleil', prompt: 'Djerba, soleil, repos, plage et budget doux' },

  // City
  { name: 'Istanbul', emoji: '🕌', family: 'city', prompt: 'Istanbul, city trip, culture, food et quartiers vivants' },
  { name: 'Prague', emoji: '🏰', family: 'city', prompt: 'Prague, architecture, week-end, culture et budget maîtrisé' },
  { name: 'Lisbonne', emoji: '🚋', family: 'city', prompt: 'Lisbonne, soleil, ville, océan, food et viewpoints' },
  { name: 'Rome', emoji: '🏛️', family: 'city', prompt: 'Rome, histoire, gastronomie, balades et monuments' },
  { name: 'Tokyo', emoji: '🏯', family: 'city', prompt: 'Tokyo, grande ville, culture, nourriture et expérience unique' },

  // Nature
  { name: 'Madère', emoji: '🌿', family: 'nature', prompt: 'Madère, nature, randonnée, océan et paysages spectaculaires' },
  { name: 'Slovénie', emoji: '🏞️', family: 'nature', prompt: 'Slovénie, lacs, montagnes, nature et roadtrip facile' },
  { name: 'Écosse', emoji: '⛰️', family: 'nature', prompt: 'Écosse, paysages bruts, route, nature et ambiance' },
  { name: 'Costa Rica', emoji: '🦜', family: 'nature', prompt: 'Costa Rica, jungle, plages, nature et aventure' },
  { name: 'Norvège', emoji: '🏔️', family: 'nature', prompt: 'Norvège, fjords, nature, route et paysages grandioses' },

  // Roadtrip
  { name: 'Malaisie', emoji: '🎒', family: 'roadtrip', prompt: 'Malaisie, roadtrip, villes, îles, budget intelligent' },
  { name: 'Jordanie', emoji: '🏜️', family: 'roadtrip', prompt: 'Jordanie, roadtrip, Pétra, désert, mer Morte et culture' },
  { name: 'Andalousie', emoji: '🚗', family: 'roadtrip', prompt: 'Andalousie, roadtrip, soleil, Séville, Cordoue et Grenade' },
  { name: 'Albanie', emoji: '🛣️', family: 'roadtrip', prompt: 'Albanie, roadtrip, mer, montagnes et budget accessible' },
  { name: 'Islande', emoji: '🌋', family: 'roadtrip', prompt: 'Islande, roadtrip, nature spectaculaire, cascades et volcans' },

  // Neige
  { name: 'Laponie', emoji: '❄️', family: 'neige', prompt: 'Laponie, neige, aurores boréales, nature et expérience unique' },
  { name: 'Tromsø', emoji: '🌌', family: 'neige', prompt: 'Tromsø, neige, aurores boréales, fjords et hiver magique' },
  { name: 'Reykjavik', emoji: '🧊', family: 'neige', prompt: 'Reykjavik, Islande, hiver, sources chaudes et paysages' },
  { name: 'Québec', emoji: '⛄', family: 'neige', prompt: 'Québec, hiver, ville, neige, culture et nature' },

  // Budget
  { name: 'Cracovie', emoji: '💸', family: 'budget', prompt: 'Cracovie, culture, petit budget, week-end et histoire' },
  { name: 'Budapest', emoji: '♨️', family: 'budget', prompt: 'Budapest, budget maîtrisé, bains, ville et architecture' },
  { name: 'Tbilissi', emoji: '🍷', family: 'budget', prompt: 'Tbilissi, destination originale, food, culture et budget doux' },
  { name: 'Porto', emoji: '🌉', family: 'budget', prompt: 'Porto, city trip, gastronomie, budget raisonnable et océan' },

  // Culture / surprise
  { name: 'Athènes', emoji: '🏛️', family: 'culture', prompt: 'Athènes, culture, soleil, histoire et gastronomie' },
  { name: 'Ouzbékistan', emoji: '🕌', family: 'culture', prompt: 'Ouzbékistan, culture, Samarcande, Boukhara et route mythique' },
  { name: 'Séoul', emoji: '🎧', family: 'surprise', prompt: 'Séoul, culture moderne, food, quartiers créatifs et city trip' },
  { name: 'Mexico', emoji: '🌮', family: 'surprise', prompt: 'Mexico, culture, food, musées, quartiers et énergie' },
];

const FAMILIES: InspirationFamily[] = ['soleil', 'city', 'nature', 'roadtrip', 'neige', 'budget', 'culture', 'surprise'];

export const pickInspirations = (seed = 0, count = 6): InspirationDestination[] => {
  const selected: InspirationDestination[] = [];

  for (let i = 0; i < FAMILIES.length && selected.length < count; i++) {
    const family = FAMILIES[(i + seed) % FAMILIES.length];
    const options = INSPIRATION_POOL.filter((item) => item.family === family);
    if (options.length === 0) continue;
    selected.push(options[(seed + i * 2) % options.length]);
  }

  let fallbackIndex = seed;
  while (selected.length < count && fallbackIndex < seed + INSPIRATION_POOL.length * 2) {
    const item = INSPIRATION_POOL[fallbackIndex % INSPIRATION_POOL.length];
    if (!selected.some((existing) => existing.name === item.name)) selected.push(item);
    fallbackIndex++;
  }

  return selected;
};
