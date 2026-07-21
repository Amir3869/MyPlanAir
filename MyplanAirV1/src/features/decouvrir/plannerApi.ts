// src/features/decouvrir/plannerApi.ts
// ═══════════════════════════════════════════════════════════════════════════════
// API Planificateur IA — Cloudflare Worker `/planner`
// En cas d’indisponibilité temporaire, l'appel retourne une erreur structurée.
// Le mode aperçu de démonstration reste géré explicitement dans Decouvrir.tsx.
// ═══════════════════════════════════════════════════════════════════════════════

import { recordLocalUsage, recordWorkerUsage, type WorkerUsageMeta } from '../../utils/usageTelemetry';
import type { PlannerRequest, PlannerSuggestion } from './plannerTypes';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE = (env.VITE_MYTRIP_API_BASE ?? 'https://mytrip-api.amirsfr38.workers.dev').replace(/\/$/, '');

export type PlannerApiSuccess = {
  ok: true;
  source: 'ai';
  disclaimer: string;
  suggestions: PlannerSuggestion[];
};

type PlannerWorkerResponse = {
  ok?: boolean;
  disclaimer?: unknown;
  suggestions?: unknown;
  error?: unknown;
  details?: unknown;
  usage?: WorkerUsageMeta;
};

export type PlannerApiFailureReason =
  | 'offline'
  | 'timeout'
  | 'http_error'
  | 'invalid_response'
  | 'planner_unavailable'
  | 'network_error';

export type PlannerApiFailure = {
  ok: false;
  reason: PlannerApiFailureReason;
  status?: number;
  message: string;
};

export type PlannerApiResult = PlannerApiSuccess | PlannerApiFailure;

const isPlannerSuggestionArray = (value: unknown): value is PlannerSuggestion[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;
    return (
      typeof obj.destination === 'string' &&
      typeof obj.country === 'string' &&
      typeof obj.countryCode === 'string' &&
      (obj.type === 'city' || obj.type === 'roadtrip') &&
      typeof obj.estimatedBudget === 'number' &&
      typeof obj.currency === 'string' &&
      typeof obj.breakdown === 'object' &&
      typeof obj.feedback === 'object'
    );
  });

export const fetchPlanner = async (payload: PlannerRequest): Promise<PlannerApiResult> => {
  if (!navigator.onLine) {
    recordLocalUsage({
      service: 'planner',
      category: 'worker',
      endpoint: '/planner',
      method: 'POST',
      status: 'error',
      errorReason: 'offline',
    });
    return {
      ok: false,
      reason: 'offline',
      message: 'Connexion requise pour utiliser le planificateur IA.',
    };
  }

  try {
    const res = await fetch(`${API_BASE}/planner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000),
    });

    const data = await res.json().catch(() => null) as PlannerWorkerResponse | null;
    recordWorkerUsage(data?.usage, {
      service: 'planner',
      endpoint: '/planner',
      method: 'POST',
      status: res.ok && data?.ok === true ? 'success' : 'error',
      errorReason: res.ok ? undefined : `http_${res.status}`,
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: res.status === 404 ? 'planner_unavailable' : 'http_error',
        status: res.status,
        message: res.status === 404
          ? 'Le planificateur IA est temporairement indisponible.'
          : `Le planificateur IA a répondu avec une erreur (${res.status}).`,
      };
    }

    const obj = data as PlannerWorkerResponse | null;

    if (obj?.ok !== true || !isPlannerSuggestionArray(obj.suggestions)) {
      return {
        ok: false,
        reason: 'invalid_response',
        message: 'La réponse du planificateur IA est invalide.',
      };
    }

    return {
      ok: true,
      source: 'ai',
      disclaimer: typeof obj.disclaimer === 'string'
        ? obj.disclaimer
        : 'Estimation indicative : les prix varient selon dates, saison et disponibilité.',
      suggestions: obj.suggestions,
    };
  } catch (err) {
    const error = err as Error;
    recordLocalUsage({
      service: 'planner',
      category: 'worker',
      endpoint: '/planner',
      method: 'POST',
      status: 'error',
      errorReason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
    });
    return {
      ok: false,
      reason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      message: error.name === 'TimeoutError'
        ? 'Le planificateur IA met trop de temps à répondre.'
        : 'Impossible de joindre le planificateur IA pour le moment.',
    };
  }
};
