// src/store/types.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Tous les types partagés de l'application MyTrip V5
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Préférences & Énumérations ─────────────────────────────────────────────

export type StepPeriod  = 'morning' | 'afternoon' | 'night';
export type StepType    = 'sight' | 'food' | 'transport' | 'lodging' | 'other';
export type AppTheme    = 'dark' | 'myplanair' | 'ocean' | 'sunset' | 'forest' | 'minimal';
export type TravelStyle = 'solo' | 'couple' | 'family' | 'business';

/** Statut calculé d'un voyage (déduit des dates, pas stocké) */
export type TripStatus = 'upcoming' | 'ongoing' | 'finished';

/** Catégories de dépense */
export type ExpenseCategory = 'transport' | 'food' | 'lodging' | 'leisure' | 'shopping' | 'other';

/** Rôle d'un participant dans un voyage */
export type ParticipantRole = 'owner' | 'editor' | 'viewer';

/** Catégories de document — V5 Documents page */
export type DocCategory = 'ticket' | 'reservation' | 'visa' | 'papiers' | 'other';

/** Type de fichier détecté — V5 Documents page */
export type DocFileType = 'pdf' | 'image' | 'spreadsheet' | 'document' | 'other';

// ─── Step (Étape de parcours) ───────────────────────────────────────────────

export type Step = {
  id:      string;
  day:     number;
  period:  StepPeriod;
  type:    StepType;
  title:   string;
  place:   string;
  notes?:  string;
  done?:   boolean;
};

// ─── Expense (Dépense — multi-devises V5) ───────────────────────────────────

export type Expense = {
  id:          string;
  category:    ExpenseCategory;
  label:       string;
  amount:      number;           // Montant saisi localement (ex: 50)
  currency:    string;           // Devise saisie (ex: 'MYR')
  amountHome:  number;           // Montant converti en devise utilisateur (ex: 10.30)
  homeCurrency: string;          // Devise utilisateur (ex: 'EUR')
  exchangeRate: number;          // Taux au moment de la dépense (ex: 4.85)
  date:        string;
  private?:    boolean;
};

// ─── ChecklistItem ──────────────────────────────────────────────────────────

export type ChecklistItem = {
  id:    string;
  label: string;
  done:  boolean;
};

// ─── TripDestination (pour roadtrips multi-étapes) ─────────────────────────

export type TripDestination = {
  city:        string;
  countryCode: string;
  lat?:        number;
  lon?:        number;
  fromDate:    string;
  toDate:      string;
  fromDay:     number;
  toDay:       number;
};

// ─── Document (V5 — localStorage, enrichi) ─────────────────────────────────

export type TripDocument = {
  id:        string;
  name:      string;
  url?:      string;          // ⚠️ LEGACY — base64 migré vers IndexedDB, conservé pour compatibilité
  category:  DocCategory;     // ✅ V5 — catégorisation
  size:      number;          // ✅ V5 — taille en octets
  fileType:  DocFileType;     // ✅ V5 — type détecté
  createdAt: string;          // ✅ V5 — ISO date d'ajout
};

// ─── Souvenir photo (Carnet souvenir local) ────────────────────────────────

export type TripMemory = {
  id:        string;
  day?:      number;
  stepId?:   string;
  title?:    string;
  caption?:  string;
  photoIds:  string[];
  createdAt: string;
};

// ─── Participant (Collaboration V1 — préparatoire) ─────────────────────────

export type Participant = {
  id:         string;
  name:       string;
  initials:   string;            // 2 lettres max
  gradientHue: number;           // 0–360 (hash du name → HSL)
  role:        ParticipantRole;
  clerkId?:    string;           // Lien Clerk (V2)
};

// ─── Trip ───────────────────────────────────────────────────────────────────

export type Trip = {
  id:           string;
  destination:  string;
  country:      string;
  countryCode:  string;
  capital?:     string;
  startDate:    string;
  endDate:      string;
  budget:       number;
  currency:     string;
  homeCurrency: string;
  photoUrl:     string;
  lat?:         number;
  lon?:         number;
  steps:        Step[];
  expenses:     Expense[];
  checklist:    ChecklistItem[];
  documents:    TripDocument[];     // ✅ V5 — Documents du voyage
  memories?:    TripMemory[];       // ✅ Souvenirs photo locaux (IndexedDB)
  notes:        string;
  createdAt:    string;
  isRoadtrip?:   boolean;
  destinations?: TripDestination[];
};

// ─── ChatMessage ────────────────────────────────────────────────────────────

export type ChatMessage = {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  createdAt: string;
};

// ─── AppNotification ────────────────────────────────────────────────────────

export type AppNotification = {
  id:        string;
  type:      'countdown' | 'checklist' | 'rate' | 'tip' | 'documents' | 'weather';
  tripId?:   string;
  dedupeKey?: string;
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: string;
  startDate?: string;
  endDate?:   string;
  tripName?:  string;
};

// ─── PlannerSuggestion (Découvrir — Planificateur) ─────────────────────────

export type PlannerSuggestion = {
  destination:   string;
  countryCode:   string;
  type:          'city' | 'country';
  cities:        string[];         // Pour country = liste des villes à visiter
  budgetEstimate: BudgetEstimate;
  bestPeriod:    string;           // ex: "Mars — Juin"
  description:   string;          // Résumé IA en 2-3 phrases
  accessories:   string[];        // Liens partenaires pertinents
};

// ─── BudgetEstimate (Estimation IA pour le Planificateur) ──────────────────

export type BudgetEstimate = {
  flight:        number;
  accommodation: number;
  esim:          number;
  activities:    number;
  food?:         number;
  transport?:    number;
  total:         number;
  currency:      string;          // Toujours = homeCurrency de l'utilisateur
};

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Emojis disponibles pour le picker utilisateur (compatibilité V4) */
export const USER_EMOJIS = [
  // Voyage
  '✈️', '🌍', '🏔️', '🏖️', '🗺️', '🎒', '🧳', '🛸', '🚀', '🏕️',
  // Lifestyle
  '☕', '📸', '🎵', '🍜', '🏄', '🎨', '📚', '🌿', '🍷', '🎭',
  // Ambiance
  '🌙', '⭐', '🔥', '💎', '🦋', '🌊', '🏆', '🎯', '✨', '🦅',
] as const;

// ─── Documents — Constantes & Helpers ───────────────────────────────────────

/** Catégories de documents avec emoji, label et couleur */
export const DOC_CATEGORIES: readonly {
  key:   DocCategory;
  emoji: string;
  label: string;
  color: string;
}[] = [
  { key: 'ticket',      emoji: '✈️', label: 'Billets',       color: '#0770e3' },
  { key: 'reservation', emoji: '🏨', label: 'Réservations',  color: '#4a90d9' },
  { key: 'visa',        emoji: '🛂', label: 'Visas',         color: '#f0b24a' },
  { key: 'papiers',     emoji: '🪪', label: 'Papiers',       color: '#a855f7' },
  { key: 'other',       emoji: '📎', label: 'Autres',        color: 'rgba(255,255,255,0.45)' },
];

/** Icône et fond par type de fichier */
export const FILE_ICONS: Record<DocFileType, { emoji: string; bg: string }> = {
  pdf:         { emoji: '📕', bg: 'rgba(239,68,68,0.12)'  },
  image:       { emoji: '🖼️', bg: 'rgba(168,85,247,0.12)' },
  spreadsheet: { emoji: '📊', bg: 'rgba(34,197,94,0.12)'  },
  document:    { emoji: '📝', bg: 'rgba(59,130,246,0.12)' },
  other:       { emoji: '📄', bg: 'rgba(255,255,255,0.06)' },
};

/** Détecte le type de fichier depuis l'extension du nom */
export const detectFileType = (fileName: string): DocFileType => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif', 'avif'].includes(ext)) return 'image';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'document';
  return 'other';
};

/** Formate la taille d'un fichier en KB/MB */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Taille maximale par fichier (10 MB) */
export const MAX_DOC_SIZE = 10 * 1024 * 1024;

/** Limite temporaire de documents par voyage pendant la phase de test */
export const FREE_DOC_LIMIT = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Calcule la teinte (hue 0–360) d'un gradient à partir d'un nom.
 * Utilisé pour les avatars initiales et les participants.
 * Algorithme : hash simple du string → HSL hue
 */
export const nameToHue = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

/**
 * Extrait les initiales d'un nom (2 caractères max).
 * "Jean-Pierre Dupont" → "JD"
 * "Amir" → "AM"
 */
export const nameToInitials = (name: string): string => {
  const parts = name
    .split(/[\s-]+/)
    .filter((p) => p.length > 0)
    .map((p) => p[0].toUpperCase());
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0] + parts[0]; // "A" → "AA"
  return parts[0] + parts[parts.length - 1]; // "Jean Pierre" → "JP"
};
