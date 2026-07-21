// src/api/cloud.ts
// ═══════════════════════════════════════════════════════════════════════════════
// API Cloud — Barrel file (re-exporte tout depuis les sous-modules)
// TOUS les imports existants (fetchTripPhoto, fetchAssistant, CAPITAL_COORDS, etc.)
// continuent de fonctionner SANS MODIFICATION.
// ═══════════════════════════════════════════════════════════════════════════════

import { getCountryNameEn } from './countries';
import type { PhotoResult, AssistantPayload, AssistantResult, ChatPayload, ChatResult } from './cloud/types';
import { buildFallback } from './cloud/fallback';
import { recordLocalUsage, recordWorkerUsage, type WorkerUsageMeta } from '../utils/usageTelemetry';

// Re-export types + données pour compatibilité descendante
export type { PhotoResult, AssistantPayload, AssistantResult, AssistantStepSuggestionDetail, ChatPayload, ChatResult } from './cloud/types';
export { CAPITAL_COORDS, CITY_COORDS, findCityCoords } from './cloud/capitals';
export { buildFallback } from './cloud/fallback';

const env = (import.meta as any).env as Record<string, string | undefined>;
const API_BASE = (
  env.VITE_MYTRIP_API_BASE ?? 'https://mytrip-api.amirsfr38.workers.dev'
).replace(/\/$/, '');

type WorkerPayload<T> = T & { usage?: WorkerUsageMeta };

// ─────────────────────────────────────────────────────────────────────────────
// 📸 PHOTO
// ─────────────────────────────────────────────────────────────────────────────
export const fetchTripPhoto = async (params: {
  city?: string;
  country?: string;
  countryCode?: string;
  capital?: string;
}): Promise<PhotoResult> => {
  try {
    const url = new URL(API_BASE + '/photo');

    const countryEn = params.countryCode
      ? getCountryNameEn(params.countryCode)
      : (params.country ?? '');

    const capitalEn = params.capital ?? '';

    if (params.city)  url.searchParams.set('city', params.city);
    if (countryEn)    url.searchParams.set('country', countryEn);
    if (capitalEn)    url.searchParams.set('capital', capitalEn);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(12000),
    });

    const data = await res.json().catch(() => null) as WorkerPayload<PhotoResult> | null;
    recordWorkerUsage(data?.usage, {
      service: 'photo',
      endpoint: '/photo',
      method: 'GET',
      status: res.ok && data?.ok !== false ? 'success' : 'error',
      errorReason: res.ok ? undefined : `http_${res.status}`,
    });

    if (!res.ok) return { ok: false, photoUrl: null, reason: `http_${res.status}` };
    return data ?? { ok: false, photoUrl: null, reason: 'invalid_response' };
  } catch (err) {
    console.error('[fetchTripPhoto] Error:', err);
    recordLocalUsage({
      service: 'photo',
      category: 'worker',
      endpoint: '/photo',
      method: 'GET',
      status: 'error',
      errorReason: 'network_error',
    });
    return { ok: false, photoUrl: null, reason: 'network_error' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 💬 FETCH CHAT
// ─────────────────────────────────────────────────────────────────────────────
export const fetchChat = async (
  payload: ChatPayload,
  _tripId: string,
): Promise<ChatResult> => {
  try {
    const res = await fetch(API_BASE + '/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(20000),
    });

    const data = await res.json().catch(() => null) as WorkerPayload<ChatResult> | null;
    recordWorkerUsage(data?.usage, {
      service: 'chat',
      endpoint: '/chat',
      method: 'POST',
      status: res.ok && data?.ok !== false ? 'success' : 'error',
      errorReason: res.ok ? undefined : `http_${res.status}`,
    });

    if (!res.ok) {
      console.warn(`⚠️ [fetchChat] HTTP ${res.status}`);
      return { ok: false, error: `http_${res.status}`, answer: null };
    }

    return data ?? { ok: false, error: 'invalid_response', answer: null };
  } catch (err) {
    console.warn('⚠️ [fetchChat] Network error:', err);
    recordLocalUsage({
      service: 'chat',
      category: 'worker',
      endpoint: '/chat',
      method: 'POST',
      status: 'error',
      errorReason: 'network_error',
    });
    return { ok: false, error: 'network_error', answer: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️ VIDER LE CACHE CHAT
// ─────────────────────────────────────────────────────────────────────────────
// Conservé pour compatibilité avec les appels existants. Le chat ne met plus en
// cache les réponses OK afin d’éviter les réponses anciennes à une même question.
export const clearChatCache = (_tripId?: string): void => {};

// ─────────────────────────────────────────────────────────────────────────────
// 📦 CACHE ASSISTANT
// ─────────────────────────────────────────────────────────────────────────────
const assistantCache = new Map<string, AssistantResult>();

const makeCacheKey = (p: AssistantPayload): string =>
  [p.city, p.country, p.days ?? 0, p.budget ?? 0, p.currency ?? 'EUR'].join('|');

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 FETCH ASSISTANT
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAssistant = async (
  payload: AssistantPayload,
): Promise<AssistantResult> => {
  const cacheKey = makeCacheKey(payload);

  if (assistantCache.has(cacheKey)) {
    console.log('📦 [fetchAssistant] Cache hit:', cacheKey);
    recordLocalUsage({
      service: 'assistant',
      category: 'local',
      endpoint: '/assistant',
      method: 'POST',
      status: 'cache',
      details: { cacheKey },
    });
    return assistantCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(API_BASE + '/assistant', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(16000),
    });

    const data = await res.json().catch(() => null) as WorkerPayload<AssistantResult> | null;
    recordWorkerUsage(data?.usage, {
      service: 'assistant',
      endpoint: '/assistant',
      method: 'POST',
      status: res.ok && data?.ok !== false ? 'success' : 'fallback',
      errorReason: res.ok ? undefined : `http_${res.status}`,
    });

    if (!res.ok) {
      console.warn(`⚠️ [fetchAssistant] HTTP ${res.status} → fallback`);
      return buildFallback(payload);
    }

    if (!data) {
      recordLocalUsage({
        service: 'assistant',
        category: 'worker',
        endpoint: '/assistant',
        method: 'POST',
        status: 'fallback',
        errorReason: 'invalid_response',
      });
      return buildFallback(payload);
    }

    if (data.ok) {
      assistantCache.set(cacheKey, data);
    }

    return data;
  } catch (err) {
    console.warn('⚠️ [fetchAssistant] Network error → fallback:', err);
    recordLocalUsage({
      service: 'assistant',
      category: 'worker',
      endpoint: '/assistant',
      method: 'POST',
      status: 'fallback',
      errorReason: 'network_error',
    });
    if (assistantCache.has(cacheKey)) return assistantCache.get(cacheKey)!;
    return buildFallback(payload);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️ VIDER LE CACHE ASSISTANT
// ─────────────────────────────────────────────────────────────────────────────
export const clearAssistantCache = (payload?: AssistantPayload): void => {
  if (payload) {
    const key = makeCacheKey(payload);
    assistantCache.delete(key);

    // Sécurité : les appels roadtrip peuvent fournir city/country sans les mêmes
    // days/budget/currency que la clé exacte. On purge donc toutes les variantes
    // de cette destination pour forcer un vrai nouvel appel Worker.
    const prefix = `${payload.city}|${payload.country}|`;
    for (const cacheKey of assistantCache.keys()) {
      if (cacheKey.startsWith(prefix)) assistantCache.delete(cacheKey);
    }
  } else {
    assistantCache.clear();
  }
};
