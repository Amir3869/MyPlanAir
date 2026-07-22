// src/features/decouvrir/itineraryApi.ts
// ═══════════════════════════════════════════════════════════════════════════════
// API Itinerary — génération de parcours jour par jour via Worker `/itinerary`
// ═══════════════════════════════════════════════════════════════════════════════

import type { Step, StepPeriod, TravelStyle, TripDestination } from '../../store/types';
import { recordLocalUsage, recordWorkerUsage, type WorkerUsageMeta } from '../../utils/usageTelemetry';
import type { PlannerSuggestion } from './plannerTypes';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE = (env.VITE_MYTRIP_API_BASE ?? 'https://mytrip-api.amirsfr38.workers.dev').replace(/\/$/, '');

export type ItineraryPayload = {
  trip: {
    destination: string;
    country: string;
    countryCode: string;
    days: number;
    budget: number;
    currency: string;
    isRoadtrip: boolean;
    destinations?: Pick<TripDestination, 'city' | 'fromDay' | 'toDay'>[];
  };
  style: TravelStyle | null;
  preferences?: {
    scope?: 'full' | 'day' | 'period';
    activityFamilies?: string[];
    avoid?: string;
    targetPeriods?: StepPeriod[];
    targetDays?: number[];
  };
};

export type ItineraryDebug = {
  status?: number;
  workerError?: string;
  workerDetails?: string;
  raw?: unknown;
};

export type ItineraryResult =
  | { ok: true; source: 'ai'; steps: Step[] }
  | { ok: false; reason: string; message: string; steps: []; debug?: ItineraryDebug };

type ItineraryWorkerResponse = {
  ok?: boolean;
  steps?: unknown;
  error?: unknown;
  reason?: unknown;
  message?: unknown;
  details?: unknown;
  debug?: unknown;
  source?: unknown;
  model?: unknown;
  repaired?: unknown;
  usage?: WorkerUsageMeta;
};

type ItineraryWorkerObject = Record<string, unknown>;

const getWorkerString = (obj: ItineraryWorkerObject | null, key: string): string | undefined => (
  typeof obj?.[key] === 'string' ? obj[key] as string : undefined
);

const buildItineraryUsageDetails = (
  payload: ItineraryPayload,
  workerObj?: ItineraryWorkerObject | null,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  action: 'itinerary_generation',
  context: {
    destination: payload.trip.destination,
    country: payload.trip.country,
    countryCode: payload.trip.countryCode,
    days: payload.trip.days,
    budget: payload.trip.budget,
    currency: payload.trip.currency,
    isRoadtrip: payload.trip.isRoadtrip,
    destinations: payload.trip.destinations,
    preferences: payload.preferences,
    style: payload.style,
  },
  worker: workerObj ? {
    ok: workerObj.ok,
    error: workerObj.error,
    reason: workerObj.reason,
    message: workerObj.message,
    details: workerObj.details,
    debug: workerObj.debug,
    source: workerObj.source,
    model: workerObj.model,
    repaired: workerObj.repaired,
  } : undefined,
  ...extra,
});

const sanitizePeriod = (value: unknown): Step['period'] => {
  if (value === 'morning' || value === 'afternoon' || value === 'night') return value;
  return 'morning';
};

const sanitizeType = (value: unknown): Step['type'] => {
  if (value === 'sight' || value === 'food' || value === 'transport' || value === 'lodging' || value === 'other') return value;
  return 'other';
};

const sanitizeSteps = (value: unknown, maxDay: number): Step[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw): Step | null => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const day = Math.min(maxDay, Math.max(1, Math.round(Number(item.day) || 1)));
      const title = String(item.title ?? '').trim();
      const place = String(item.place ?? '').trim();
      if (!title || !place) return null;

      return {
        id: crypto.randomUUID(),
        day,
        period: sanitizePeriod(item.period),
        type: sanitizeType(item.type),
        title,
        place,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
        done: false,
      };
    })
    .filter((step): step is Step => step !== null)
    .slice(0, Math.min(60, maxDay * 3));
};

export const buildItineraryPayload = (
  suggestion: PlannerSuggestion,
  destinations: TripDestination[] | undefined,
  style: TravelStyle | null,
): ItineraryPayload => ({
  trip: {
    destination: suggestion.destination,
    country: suggestion.country,
    countryCode: suggestion.countryCode,
    days: suggestion.days,
    budget: suggestion.estimatedBudget,
    currency: suggestion.currency,
    isRoadtrip: suggestion.type === 'roadtrip',
    destinations: destinations?.map((dest) => ({
      city: dest.city,
      fromDay: dest.fromDay,
      toDay: dest.toDay,
    })),
  },
  style,
});

export const fetchItinerary = async (payload: ItineraryPayload): Promise<ItineraryResult> => {
  if (!navigator.onLine) {
    recordLocalUsage({
      service: 'itinerary',
      category: 'worker',
      endpoint: '/itinerary',
      method: 'POST',
      status: 'error',
      errorReason: 'offline',
      details: buildItineraryUsageDetails(payload, null, { reason: 'offline' }),
    });
    return { ok: false, reason: 'offline', message: 'Connexion requise pour générer un parcours.', steps: [] };
  }

  try {
    const res = await fetch(`${API_BASE}/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(22000),
    });

    if (!res.ok) {
      let workerBody: unknown = null;
      try {
        workerBody = await res.json();
      } catch {
        try { workerBody = await res.text(); } catch { workerBody = null; }
      }

      const workerObj = workerBody && typeof workerBody === 'object'
        ? workerBody as Record<string, unknown>
        : null;
      const workerError = getWorkerString(workerObj, 'error');
      const workerReason = getWorkerString(workerObj, 'reason');
      const workerMessage = getWorkerString(workerObj, 'message');
      const workerDetails = typeof workerObj?.details === 'string'
        ? workerObj.details
        : undefined;

      recordWorkerUsage((workerObj as ItineraryWorkerResponse | null)?.usage, {
        service: 'itinerary',
        endpoint: '/itinerary',
        method: 'POST',
        status: 'error',
        errorReason: workerReason ?? workerError ?? `http_${res.status}`,
        details: buildItineraryUsageDetails(payload, workerObj, {
          httpStatus: res.status,
          workerError,
          workerReason,
          workerMessage,
          workerDetails,
        }),
      });

      console.warn('[fetchItinerary] Worker error', {
        status: res.status,
        workerError,
        workerDetails,
        workerBody,
        payload,
      });

      return {
        ok: false,
        reason: workerReason ?? workerError ?? (res.status === 404 ? 'itinerary_unavailable' : 'http_error'),
        message: res.status === 404
          ? 'Le générateur de parcours n’est pas encore disponible.'
          : workerMessage ?? workerReason ?? workerError
          ? `Erreur parcours IA : ${workerMessage ?? workerReason ?? workerError}`
          : `Erreur génération parcours (${res.status}).`, 
        steps: [],
        debug: {
          status: res.status,
          workerError,
          workerDetails,
          raw: workerBody,
        },
      };
    }

    const data = await res.json() as ItineraryWorkerResponse;
    const dataObj = data as ItineraryWorkerObject;
    recordWorkerUsage(data.usage, {
      service: 'itinerary',
      endpoint: '/itinerary',
      method: 'POST',
      status: data.ok === true ? 'success' : 'error',
      errorReason: data.ok === true
        ? undefined
        : getWorkerString(dataObj, 'reason') ?? getWorkerString(dataObj, 'error') ?? 'invalid_response',
      details: data.ok === true
        ? buildItineraryUsageDetails(payload, dataObj, { stepsCount: Array.isArray(data.steps) ? data.steps.length : undefined })
        : buildItineraryUsageDetails(payload, dataObj),
    });

    if (data.ok !== true) {
      const workerError = typeof data.error === 'string' ? data.error : 'invalid_response';
      const workerReason = typeof data.reason === 'string' ? data.reason : undefined;
      const workerMessage = typeof data.message === 'string' ? data.message : undefined;
      const workerDetails = typeof data.details === 'string' ? data.details : undefined;

      console.warn('[fetchItinerary] Invalid success payload', {
        workerError,
        workerReason,
        workerDetails,
        data,
        payload,
      });

      return {
        ok: false,
        reason: workerReason ?? workerError,
        message: `Réponse parcours invalide : ${workerMessage ?? workerReason ?? workerError}`, 
        steps: [],
        debug: {
          workerError,
          workerDetails,
          raw: data,
        },
      };
    }

    const steps = sanitizeSteps(data.steps, payload.trip.days);
    return { ok: true, source: 'ai', steps };
  } catch (err) {
    const error = err as Error;
    recordLocalUsage({
      service: 'itinerary',
      category: 'worker',
      endpoint: '/itinerary',
      method: 'POST',
      status: 'error',
      errorReason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      details: buildItineraryUsageDetails(payload, null, {
        reason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
        message: error.message,
      }),
    });
    return {
      ok: false,
      reason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      message: error.name === 'TimeoutError'
        ? 'La génération du parcours met trop de temps.'
        : 'Impossible de joindre le générateur de parcours.',
      steps: [],
    };
  }
};
