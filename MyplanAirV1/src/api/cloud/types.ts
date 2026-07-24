// src/api/cloud/types.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Types partagés pour les API Cloud (Photo, Assistant, Chat)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Photo ───────────────────────────────────────────────────────────────────

export type PhotoResult =
  | {
      ok: true;
      photoUrl: string;
      query: string;
      credit?: { name?: string; username?: string; link?: string };
    }
  | { ok: false; photoUrl: null; reason?: string };

// ─── Assistant ───────────────────────────────────────────────────────────────

export type AssistantPayload = {
  city: string;
  country: string;
  days?: number | null;
  budget?: number | null;
  currency?: string;
  style?: string;
  homeCurrency?: string;
};

export type AssistantAdviceFamily = 'auto' | 'money' | 'docs' | 'bagage' | 'weather' | 'memory' | 'transport';

export type AssistantAdviceItem = {
  title: string;
  body: string;
  checklistLabel?: string;
};

export type AssistantAdvice = Partial<Record<AssistantAdviceFamily, AssistantAdviceItem>>;

export type AssistantStepSuggestionDetail = {
  title: string;
  place?: string;
  info?: string;
  type?: 'sight' | 'food' | 'transport' | 'lodging' | 'other';
  emoji?: string;
};

export type AssistantResult =
  | {
      ok: true;
      checklist: string[];
      tips: { title: string; body: string }[];
      // Compatibilité historique : toujours une liste de strings.
      stepSuggestions: string[];
      // Nouveau format enrichi optionnel, utilisé par l'Overview si présent.
      stepSuggestionDetails?: AssistantStepSuggestionDetail[];
      advice?: AssistantAdvice;
    }
  | { ok: false; error: string; status?: number; details?: string };

// ─── Chat ARIA ───────────────────────────────────────────────────────────────

export type ChatPayload = {
  question:     string;
  destination:  string;
  country:      string;
  days:         number;
  budget:       number;
  currency:     string;
  isRoadtrip:   boolean;
  destinations: Array<{ city: string; countryCode: string }>;
  locationContext?: {
    mode: 'gps' | 'city';
    label?: string;
    lat?: number;
    lon?: number;
    radiusKm?: number;
    family?: string;
  };
  history:      Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type ChatResult =
  | { ok: true;  answer: string; source: 'groq' | 'mistral'; model: string }
  | { ok: false; error: string;  answer: null };
