// src/api/cloud/fallback.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Données de secours (offline) + fonction buildFallback
// Extrait de cloud.ts — données statiques pour les pays populaires
// ═══════════════════════════════════════════════════════════════════════════════

import type { AssistantPayload, AssistantResult } from './types';

// ─── Étapes suggérées par pays ──────────────────────────────────────────────

const COUNTRY_STEPS: Record<string, string[]> = {
  Japon: [
    '⛩️ Visite d\'un sanctuaire shinto',
    '♨️ Expérience onsen (bain thermal)',
    '🍶 Soirée izakaya authentique',
    '🐟 Marché aux poissons Tsukiji',
    '🌃 Exploration quartier Shibuya',
    '🍵 Cérémonie du thé traditionnelle',
    '🏯 Visite d\'un château historique',
    '🌸 Promenade dans un parc fleuri',
  ],
  France: [
    '🥖 Marché de producteurs local',
    '☕ Café terrasse parisien',
    '🎨 Visite d\'un musée d\'art',
    '🌿 Promenade dans les jardins',
    '🍷 Déjeuner dans un bistrot',
    '🗼 Monument emblématique',
    '🧀 Dégustation fromagerie locale',
    '🚴 Balade à vélo en ville',
  ],
  Italie: [
    '🍹 Aperitivo en terrasse',
    '🍝 Trattoria de quartier',
    '⛪ Visite d\'une église baroque',
    '🍦 Promenade gelato',
    '🏛️ Place historique au coucher du soleil',
    '🛶 Balade en gondole ou bateau',
    '🍕 Cours de cuisine locale',
    '🖼️ Musée d\'art renaissance',
  ],
  Espagne: [
    '🌅 Coucher de soleil sur la plage',
    '🥘 Dégustation tapas locales',
    '💃 Spectacle flamenco',
    '🏟️ Visite monument emblématique',
    '🌃 Soirée dans le quartier historique',
    '🍷 Cave à vin locale',
    '🚂 Excursion village voisin',
    '🏖️ Journée plage méditerranée',
  ],
  'États-Unis': [
    '🗽 Monument emblématique local',
    '🍔 Diner américain authentique',
    '🚗 Road trip panoramique',
    '🎵 Concert ou show live',
    '🏙️ Rooftop bar avec vue',
    '🛍️ Marché farmers market',
    '🎡 Quartier artistique local',
    '🌉 Balade waterfront',
  ],
  Thaïlande: [
    '💆 Massage thaï traditionnel',
    '🌃 Marché de nuit local',
    '🛕 Temple bouddhiste',
    '👨‍🍳 Cours de cuisine thaï',
    '🌅 Coucher de soleil sur la plage',
    '🚤 Excursion en bateau longtail',
    '🥭 Dégustation fruits tropicaux',
    '🐘 Sanctuaire éléphants éthique',
  ],
  Maroc: [
    '🏺 Balade dans la médina',
    '🛒 Souk des épices',
    '🍵 Thé à la menthe en terrasse',
    '🐪 Excursion désert ou dunes',
    '🔨 Atelier artisanat local',
    '🌅 Coucher de soleil depuis remparts',
    '🍲 Dîner tajine en riad',
    '🏰 Palais historique',
  ],
  'Royaume-Uni': [
    '🍺 Pub traditionnel local',
    '🎭 Spectacle théâtre ou comédie',
    '🏰 Château ou palais historique',
    '🌿 Promenade parc royal',
    '🎨 Galerie d\'art gratuite',
    '🚇 Exploration quartiers tendance',
    '🐟 Fish & chips authentique',
    '🏛️ Musée national',
  ],
  Allemagne: [
    '🍺 Biergarten local',
    '🏰 Château romantique',
    '🌲 Randonnée forêt noire',
    '🎡 Marché local ou festival',
    '🚲 Balade vélo en ville',
    '🏛️ Musée d\'histoire',
    '🥨 Petit-déjeuner bavarois',
    '⛪ Cathédrale gothique',
  ],
  Portugal: [
    '🎵 Concert Fado authentique',
    '🍷 Dégustation vins Douro',
    '🚃 Balade en tram historique',
    '🐟 Sardines grillées au port',
    '🏰 Château mauresque',
    '🌊 Plage Atlantique',
    '🎨 Quartier azulejos',
    '☕ Pastel de nata en boulangerie',
  ],
  Grèce: [
    '🏛️ Site archéologique antique',
    '🌅 Coucher de soleil sur la mer Égée',
    '🐙 Mezze au bord de l\'eau',
    '⛵ Excursion île voisine',
    '🫒 Dégustation huile d\'olive locale',
    '🏖️ Plage aux eaux cristallines',
    '⛪ Monastère orthodoxe',
    '🍷 Vin local en terrasse',
  ],
};

// ─── Conseils par pays ──────────────────────────────────────────────────────

const COUNTRY_TIPS: Record<string, { title: string; body: string }[]> = {
  Japon: [
    { title: '🍣 Étiquette à table', body: 'Ne plantez jamais vos baguettes verticalement dans le riz. Slurper les nouilles est un compliment du chef.' },
    { title: '🚇 JR Pass', body: 'Achetez le JR Pass avant de partir depuis la France — il n\'est pas vendu au Japon. Prenez aussi une carte Suica pour les métros.' },
    { title: '💴 Cash uniquement', body: 'Beaucoup de petits restaurants n\'acceptent que les espèces. Retirez aux ATM des 7-Eleven, les seuls fiables pour cartes étrangères.' },
    { title: '🙇 Respect', body: 'Ne mangez pas en marchant dans la rue. Baissez la voix dans les transports. Les pourboires sont considérés insultants.' },
    { title: '📱 Pocket WiFi', body: 'Louez un Pocket WiFi à l\'aéroport (9€/jour). Indispensable — les eSIM étrangères fonctionnent mal sur certains réseaux.' },
  ],
  France: [
    { title: '🥖 Horaires repas', body: 'Le déjeuner est servi entre 12h et 14h strictement. Le dîner après 19h30. Hors de ces créneaux, seuls les touristes sont servis.' },
    { title: '🚄 TGV malin', body: 'Les billets non-échangeables sont 50% moins chers. Réservez sur Ouigo ou SNCF Connect 3 mois à l\'avance pour les meilleurs tarifs.' },
    { title: '💳 Paiement', body: 'Les marchés et petits bistrots acceptent peu la carte. Gardez toujours 30-50€ en espèces.' },
    { title: '🗣️ Politesse', body: 'Dites toujours "Bonjour" en entrant dans un commerce. L\'absence de salutation est perçue comme de la grossièreté.' },
    { title: '🏛️ Musées gratuits', body: 'Les musées nationaux (Louvre, Orsay...) sont gratuits le premier dimanche du mois et pour les moins de 26 ans UE.' },
  ],
  Italie: [
    { title: '☕ Code café', body: 'Un cappuccino après 11h est un impair culturel. Commandez un espresso après repas, jamais un "café au lait".' },
    { title: '🍝 Coperto', body: 'Le "coperto" (couvert) de 2-4€/personne est légal et obligatoire. En revanche, le pourboire n\'est pas attendu.' },
    { title: '🏛️ Files d\'attente', body: 'Réservez le Colisée, la Chapelle Sixtine et les Offices MINIMUM 3 semaines à l\'avance en ligne. Les files durent 3h sans réservation.' },
    { title: '🚌 Transport urbain', body: 'Achetez vos tickets de bus/tram AVANT de monter (tabac, distributeur). Contrôles fréquents, amendes élevées.' },
    { title: '👗 Dress code', body: 'Épaules et genoux couverts obligatoires dans toutes les églises. Gardez un foulard dans votre sac.' },
  ],
  Thaïlande: [
    { title: '🙏 Le Wai', body: 'Salut mains jointes, tête baissée. Ne touchez jamais la tête d\'une personne — c\'est sacré. Ne pointez pas les pieds vers un Bouddha.' },
    { title: '🌶️ Commander épicé', body: 'Dites "mai phet" (pas épicé) ou "phet nit noi" (un peu épicé). Sans précision, les plats sont souvent imbuvables pour les européens.' },
    { title: '👑 Respect monarchie', body: 'Toute critique de la famille royale est un crime passible de prison. Évitez absolument ces sujets.' },
    { title: '💊 Santé', body: 'Anti-moustiques DEET 30%+ obligatoire le soir. Eau en bouteille uniquement, même pour se brosser les dents dans les zones rurales.' },
    { title: '💵 Négociation', body: 'Négociez au marché et pour les tuk-tuks (divisez par 3 le prix annoncé). Jamais dans les magasins avec prix affichés.' },
  ],
  Maroc: [
    { title: '🧭 Médina', body: 'Engagez un guide officiel pour votre première médina — impossible à apprivoiser seul. Évitez les "guides" non officiels qui vous demanderont commission.' },
    { title: '💰 Négociation', body: 'Au souk, le prix annoncé est x3-5 le prix réel. Négociez fermement mais souriez toujours. Partir est la meilleure négociation.' },
    { title: '🌡️ Chaleur', body: 'Evitez de marcher entre 12h et 16h en été. Portez des vêtements couvrants légers — respect culturel ET protection solaire.' },
    { title: '🍽️ Manger local', body: 'Mangez dans les restaurants fréquentés par les locaux, jamais face aux places touristiques. Budget : 5-8€ pour un repas complet.' },
    { title: '📸 Photos', body: 'Demandez toujours avant de photographier des personnes. Certains demandent un dirham symbolique — c\'est normal.' },
  ],
};

const GENERIC_STEPS = [
  '🗺️ Découverte du centre historique',
  '🍽️ Dégustation gastronomie locale',
  '🏛️ Visite monument emblématique',
  '🌅 Coucher de soleil panoramique',
  '🛒 Marché local authentique',
  '🚶 Balade dans les quartiers typiques',
  '📸 Spot photo incontournable',
  '☕ Café local en terrasse',
];

const GENERIC_TIPS = [
  { title: '🛡️ Sécurité documents', body: 'Photographiez votre passeport et envoyez-le à un proche. Stockez une copie dans le cloud (Google Drive, iCloud).' },
  { title: '🔌 Connectivité', body: 'Une eSIM (Airalo, Holafly) est souvent plus rentable que le roaming. Configurez-la avant le départ.' },
  { title: '💳 Banque malin', body: 'Les cartes Revolut et Wise sont sans frais à l\'étranger. Prévenez votre banque habituelle du voyage pour éviter le blocage.' },
  { title: '📱 Apps indispensables', body: 'Téléchargez Maps.me en mode hors-ligne avant le départ. Google Translate en mode photo fonctionne sans internet.' },
  { title: '💊 Santé basique', body: 'Emportez : anti-douleurs, anti-diarrhéiques, désinfectant, pansements. Vérifiez les vaccins recommandés sur le site du MAE français.' },
];

// ─── Checklist par pays ─────────────────────────────────────────────────────

const COUNTRY_CHECKLIST: Record<string, string[]> = {
  Japon: [
    'Passeport valide 6 mois minimum',
    'JR Pass (à acheter avant départ)',
    'Yens en espèces (min 500¥/jour)',
    'Adaptateur prise Type A',
    'Pocket WiFi réservé',
    'Vaccins à jour vérifiés',
    'Assurance voyage',
    'Carte Suica chargée',
  ],
  'États-Unis': [
    'ESTA (e-visa) approuvé',
    'Passeport valide 6 mois minimum',
    'Carte SIM US ou eSIM',
    'Adaptateur prise Type A/B',
    'Assurance santé internationale',
    'Réservations voiture confirmées',
    'Carte bancaire internationale',
    'Billets avion imprimés',
  ],
  Thaïlande: [
    'Vaccin hépatite A conseillé',
    'Anti-moustiques DEET 30%+',
    'Visa électronique (si requis)',
    'Passeport valide 6 mois minimum',
    'Assurance rapatriement',
    'Vêtements couvrants (temples)',
    'Médicaments anti-diarrhéiques',
    'Crème solaire SPF 50+',
  ],
  Maroc: [
    'Vêtements couvrants légers',
    'Crème solaire haute protection',
    'Passeport ou CNI française',
    'Dirhams en espèces (pas partout carte)',
    'Assurance voyage',
    'Médicaments intestinaux',
    'Adaptateur prise (Type C/E)',
    'Numéros urgence notés',
  ],
  Indonésie: [
    'Visa à l\'arrivée (VOA) ou e-VOA',
    'Anti-moustiques DEET',
    'Crème solaire',
    'Passeport valide 6 mois',
    'Vaccins fièvre typhoïde conseillés',
    'Assurance rapatriement',
    'Roupies indonésiennes en espèces',
    'Vêtements couvrants (temples)',
  ],
};

const GENERIC_CHECKLIST = [
  'Passeport ou carte d\'identité valide',
  'Billets d\'avion / train confirmés',
  'Réservations hôtel imprimées',
  'Assurance voyage souscrite',
  'Devises locales en espèces',
  'Chargeur et adaptateur prise',
  'Médicaments habituels',
  'Carte bancaire internationale',
];

// ─── buildFallback ───────────────────────────────────────────────────────────

export function buildFallback(p: AssistantPayload): AssistantResult {
  const countryKey = Object.keys(COUNTRY_STEPS).find(
    (k) => k.toLowerCase() === p.country.toLowerCase(),
  ) ?? Object.keys(COUNTRY_STEPS).find(
    (k) => p.country.toLowerCase().includes(k.toLowerCase()),
  );

  const steps = countryKey ? COUNTRY_STEPS[countryKey] : GENERIC_STEPS.map((s) => s);

  const tipsKey = Object.keys(COUNTRY_TIPS).find(
    (k) => k.toLowerCase() === p.country.toLowerCase(),
  ) ?? Object.keys(COUNTRY_TIPS).find(
    (k) => p.country.toLowerCase().includes(k.toLowerCase()),
  );

  const tips = tipsKey
    ? COUNTRY_TIPS[tipsKey]
    : [
        { title: '📋 Documents essentiels', body: `Scannez tous vos documents et envoyez-les par email avant de partir pour ${p.city}.` },
        { title: '💰 Budget malin',          body: `Prévoyez 20% de marge sur votre budget pour les imprévus à ${p.city}.` },
        ...GENERIC_TIPS.slice(0, 3),
      ];

  const checklistKey = Object.keys(COUNTRY_CHECKLIST).find(
    (k) => k.toLowerCase() === p.country.toLowerCase(),
  );

  const checklist = checklistKey
    ? COUNTRY_CHECKLIST[checklistKey]
    : GENERIC_CHECKLIST;

  return {
    ok: true,
    checklist,
    tips: tips.slice(0, 5),
    stepSuggestions: steps,
  };
}
