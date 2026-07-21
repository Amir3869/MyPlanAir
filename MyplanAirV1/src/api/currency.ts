// src/api/currency.ts
// Taux de change — Via Cloudflare Worker (proxy Frankfurter) + fallback offline

import { recordLocalUsage, recordWorkerUsage, type WorkerUsageMeta } from '../utils/usageTelemetry';

// ─────────────────────────────────────────────────────────────────────────────
// URL du Worker (même base que cloud.ts)
// ─────────────────────────────────────────────────────────────────────────────
const env = (import.meta as any).env as Record<string, string | undefined>;
const API_BASE = (
  env.VITE_MYTRIP_API_BASE ?? 'https://mytrip-api.amirsfr38.workers.dev'
).replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────────────────────
// Taux offline de référence (base EUR)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_RATES_EUR: Record<string, number> = {
  EUR: 1,      USD: 1.08,   GBP: 0.85,   JPY: 162,    CHF: 0.96,
  CAD: 1.47,   AUD: 1.62,   NZD: 1.78,   CNY: 7.82,   KRW: 1450,
  THB: 38.5,   IDR: 17000,  SGD: 1.46,   HKD: 8.45,   VND: 27000,
  AED: 3.97,   TRY: 35,     MAD: 10.8,   EGP: 53,     MXN: 21.5,
  BRL: 6.4,    ARS: 1100,   PEN: 4.05,   ZAR: 20,     KES: 140,
  DKK: 7.46,   SEK: 11.4,   NOK: 11.7,   ISK: 150,    PLN: 4.25,
  HUF: 390,    CZK: 25.2,   RON: 4.97,   HRK: 7.53,   BGN: 1.96,
  GEL: 2.92,   AMD: 420,    UZS: 13600,  KZT: 510,    INR: 90,
  PKR: 300,    BDT: 118,    LKR: 320,    NPR: 144,    MYR: 5.05,
  PHP: 62,     TWD: 35,     MMK: 2270,   KHR: 4380,   QAR: 3.93,
  SAR: 4.05,   ILS: 3.98,   UAH: 44.5,   RUB: 99,     COP: 4500,
  CLP: 1020,   PYG: 8100,   UYU: 43,     BOB: 7.5,    DZD: 145,
  TND: 3.35,   XOF: 655,    XAF: 655,    GHS: 16.5,
  NGN: 1750,   TZS: 2850,   JOD: 0.77,   KWD: 0.33,   BHD: 0.41,
  OMR: 0.42,
};

// ─────────────────────────────────────────────────────────────────────────────
// Conversion offline via EUR comme devise pivot
// ─────────────────────────────────────────────────────────────────────────────
export const convertOffline = (from: string, to: string, amount: number): number => {
  if (from === to) return amount;
  const fr = FALLBACK_RATES_EUR[from] ?? 1;
  const tr = FALLBACK_RATES_EUR[to]   ?? 1;
  return (amount / fr) * tr;
};

// ─────────────────────────────────────────────────────────────────────────────
// Type résultat
// ─────────────────────────────────────────────────────────────────────────────
export type RateResult = {
  rate:      number;
  source:    'live' | 'offline';
  updatedAt: string;
};

type CurrencyWorkerResponse = {
  ok: boolean;
  rate?: number;
  source?: string;
  error?: string;
  usage?: WorkerUsageMeta;
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache mémoire — TTL 15 minutes
// ─────────────────────────────────────────────────────────────────────────────
type CacheEntry = { rate: number; ts: number };
const rateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000;

const getCacheKey = (from: string, to: string): string => `${from}_${to}`;

// ─────────────────────────────────────────────────────────────────────────────
// fetchRate — Via Worker Cloudflare (proxy Frankfurter sans CORS)
//
// POURQUOI LE WORKER ?
// api.frankfurter.app bloque les appels directs depuis le navigateur (CORS).
// Le Worker Cloudflare n'a pas cette restriction (appel serveur→serveur).
// On appelle donc GET /currency?from=EUR&to=JPY sur notre Worker,
// qui lui appelle Frankfurter et nous retourne le taux.
//
// Fallback : taux hardcodés via EUR comme pivot (toujours disponibles offline)
// ─────────────────────────────────────────────────────────────────────────────
export const fetchRate = async (from: string, to: string): Promise<RateResult> => {
  if (from === to) {
    recordLocalUsage({
      service: 'currency',
      category: 'local',
      endpoint: '/currency',
      method: 'GET',
      status: 'cache',
      details: { reason: 'same_currency', from, to },
    });
    return { rate: 1, source: 'live', updatedAt: new Date().toISOString() };
  }

  const cacheKey = getCacheKey(from, to);

  // ── Cache mémoire ─────────────────────────────────────────────────────────
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    recordLocalUsage({
      service: 'currency',
      category: 'local',
      endpoint: '/currency',
      method: 'GET',
      status: 'cache',
      details: { from, to, cacheKey },
    });
    return {
      rate:      cached.rate,
      source:    'live',
      updatedAt: new Date(cached.ts).toISOString(),
    };
  }

  // ── Appel via Worker (proxy sans CORS) ────────────────────────────────────
  try {
    const workerUrl = `${API_BASE}/currency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(workerUrl, {
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => null) as CurrencyWorkerResponse | null;
    recordWorkerUsage(data?.usage, {
      service: 'currency',
      endpoint: '/currency',
      method: 'GET',
      status: res.ok && data?.ok ? 'success' : 'fallback',
      errorReason: res.ok ? data?.error : `http_${res.status}`,
      details: { from, to },
    });

    if (res.ok && data?.ok && typeof data.rate === 'number' && data.rate > 0) {
      // ✅ Succès — mise en cache
      rateCache.set(cacheKey, { rate: data.rate, ts: Date.now() });
      return {
        rate:      data.rate,
        source:    'live',
        updatedAt: new Date().toISOString(),
      };
    }
    // Réponse Worker OK mais taux invalide ou devise non supportée → fallback
  } catch {
    recordLocalUsage({
      service: 'currency',
      category: 'worker',
      endpoint: '/currency',
      method: 'GET',
      status: 'fallback',
      errorReason: 'network_or_timeout',
      details: { from, to },
    });
    // Timeout ou Worker indisponible → fallback offline
  }

  // ── Fallback offline ──────────────────────────────────────────────────────
  const offlineRate = convertOffline(from, to, 1);
  return {
    rate:      offlineRate,
    source:    'offline',
    updatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Vider le cache
// ─────────────────────────────────────────────────────────────────────────────
export const clearRateCache = (): void => {
  rateCache.clear();
};