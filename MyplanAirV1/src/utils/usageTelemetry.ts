// src/utils/usageTelemetry.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Télémétrie locale de test — appels API / IA MyTrip
// Données stockées uniquement dans le navigateur, pour la phase de test.
// ═══════════════════════════════════════════════════════════════════════════════

export type UsageCategory = 'ai' | 'worker' | 'external' | 'local';
export type UsageStatus = 'success' | 'error' | 'fallback' | 'cache';
export type UsageService =
  | 'assistant'
  | 'chat'
  | 'planner'
  | 'itinerary'
  | 'photo'
  | 'currency'
  | 'weather'
  | 'geocode'
  | 'worldmap'
  | 'unknown';

export type UsageTokens = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type WorkerUsageMeta = {
  schemaVersion?: number;
  workerVersion?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  category?: UsageCategory;
  ok?: boolean;
  status?: number;
  durationMs?: number;
  provider?: string;
  model?: string;
  maxTokens?: number;
  tokens?: UsageTokens;
  fallbackUsed?: boolean;
  details?: Record<string, unknown>;
};

export type UsageEvent = {
  id: string;
  at: string;
  service: UsageService;
  category: UsageCategory;
  endpoint: string;
  method: string;
  status: UsageStatus;
  durationMs?: number;
  httpStatus?: number;
  provider?: string;
  model?: string;
  workerVersion?: string;
  requestId?: string;
  maxTokens?: number;
  tokens?: UsageTokens;
  errorReason?: string;
  details?: Record<string, unknown>;
};

export type UsageLimit = {
  daily?: number;
  weekly?: number;
  dailyTokens?: number;
  weeklyTokens?: number;
};

export const USAGE_TEST_LIMITS: Partial<Record<UsageService | 'aiTokens', UsageLimit>> = {
  assistant: { daily: 100, weekly: 500 },
  chat:      { daily: 50,  weekly: 250 },
  planner:   { daily: 30,  weekly: 120 },
  itinerary: { daily: 30,  weekly: 120 },
  photo:     { daily: 100, weekly: 500 },
  currency:  { daily: 200, weekly: 1000 },
  weather:   { daily: 300, weekly: 1500 },
  geocode:   { daily: 300, weekly: 1500 },
  worldmap:  { daily: 50,  weekly: 200 },
  aiTokens:  { dailyTokens: 100_000, weeklyTokens: 500_000 },
};

const STORAGE_KEY = 'mytrip-usage-events-v1';
const MAX_EVENTS = 1000;

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const createId = (): string => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `usage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const safeNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const inferService = (endpoint?: string): UsageService => {
  const value = (endpoint ?? '').toLowerCase();
  if (value.includes('/assistant')) return 'assistant';
  if (value.includes('/chat')) return 'chat';
  if (value.includes('/planner')) return 'planner';
  if (value.includes('/itinerary')) return 'itinerary';
  if (value.includes('/photo')) return 'photo';
  if (value.includes('/currency')) return 'currency';
  if (value.includes('weather') || value.includes('open-meteo')) return 'weather';
  if (value.includes('geocode') || value.includes('photon')) return 'geocode';
  if (value.includes('geojson') || value.includes('world')) return 'worldmap';
  return 'unknown';
};

const normalizeStatus = (event: Pick<UsageEvent, 'status'>): UsageStatus => event.status;

export const getUsageEvents = (): UsageEvent[] => {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) as UsageEvent[] : [];
  } catch {
    return [];
  }
};

const saveUsageEvents = (events: UsageEvent[]) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Télémétrie de test : ne jamais casser l'app si localStorage est plein/indisponible.
  }
};

export const recordUsageEvent = (input: Omit<UsageEvent, 'id' | 'at'> & { id?: string; at?: string }): UsageEvent => {
  const event: UsageEvent = {
    id: input.id ?? createId(),
    at: input.at ?? new Date().toISOString(),
    service: input.service,
    category: input.category,
    endpoint: input.endpoint,
    method: input.method,
    status: normalizeStatus(input),
    durationMs: safeNumber(input.durationMs),
    httpStatus: safeNumber(input.httpStatus),
    provider: input.provider,
    model: input.model,
    workerVersion: input.workerVersion,
    requestId: input.requestId,
    maxTokens: safeNumber(input.maxTokens),
    tokens: input.tokens,
    errorReason: input.errorReason,
    details: input.details,
  };

  const events = getUsageEvents();
  saveUsageEvents([...events, event]);
  return event;
};

export const recordWorkerUsage = (
  usage: WorkerUsageMeta | undefined,
  fallback?: Partial<Pick<UsageEvent, 'service' | 'endpoint' | 'method' | 'status' | 'errorReason' | 'details'>>,
): UsageEvent | null => {
  if (!usage && !fallback) return null;

  const endpoint = usage?.endpoint ?? fallback?.endpoint ?? 'unknown';
  const service = fallback?.service ?? inferService(endpoint);
  const status: UsageStatus = fallback?.status
    ?? (usage?.fallbackUsed ? 'fallback' : usage?.ok ? 'success' : 'error');

  return recordUsageEvent({
    service,
    category: usage?.category ?? 'worker',
    endpoint,
    method: usage?.method ?? fallback?.method ?? 'GET',
    status,
    durationMs: usage?.durationMs,
    httpStatus: usage?.status,
    provider: usage?.provider,
    model: usage?.model,
    workerVersion: usage?.workerVersion,
    requestId: usage?.requestId,
    maxTokens: usage?.maxTokens,
    tokens: usage?.tokens,
    errorReason: fallback?.errorReason,
    details: {
      ...(usage?.details ?? {}),
      ...(fallback?.details ?? {}),
    },
  });
};

export const recordLocalUsage = (input: {
  service: UsageService;
  category?: UsageCategory;
  endpoint: string;
  method?: string;
  status: UsageStatus;
  durationMs?: number;
  errorReason?: string;
  details?: Record<string, unknown>;
}): UsageEvent => recordUsageEvent({
  service: input.service,
  category: input.category ?? 'local',
  endpoint: input.endpoint,
  method: input.method ?? 'GET',
  status: input.status,
  durationMs: input.durationMs,
  errorReason: input.errorReason,
  details: input.details,
});

export const clearUsageEvents = (): void => {
  if (!hasStorage()) return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const startOfLocalWeek = (date: Date) => {
  const day = date.getDay() === 0 ? 6 : date.getDay() - 1;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - day);
  return start.getTime();
};

export const getUsageWindowEvents = (window: 'day' | 'week', events = getUsageEvents()): UsageEvent[] => {
  const now = new Date();
  const start = window === 'day' ? startOfLocalDay(now) : startOfLocalWeek(now);
  return events.filter((event) => {
    const time = new Date(event.at).getTime();
    return Number.isFinite(time) && time >= start;
  });
};

export const getUsageTotals = (events = getUsageEvents()) => {
  const totals = {
    calls: events.length,
    aiCalls: 0,
    workerCalls: 0,
    externalCalls: 0,
    localEvents: 0,
    success: 0,
    errors: 0,
    fallbacks: 0,
    cache: 0,
    totalTokens: 0,
    avgDurationMs: 0,
    byService: {} as Record<UsageService, { calls: number; errors: number; fallbacks: number; cache: number; tokens: number; avgDurationMs: number }>,
  };

  let durationTotal = 0;
  let durationCount = 0;
  const serviceDurations: Partial<Record<UsageService, { total: number; count: number }>> = {};

  for (const event of events) {
    if (event.category === 'ai') totals.aiCalls++;
    else if (event.category === 'worker') totals.workerCalls++;
    else if (event.category === 'external') totals.externalCalls++;
    else totals.localEvents++;

    if (event.status === 'success') totals.success++;
    if (event.status === 'error') totals.errors++;
    if (event.status === 'fallback') totals.fallbacks++;
    if (event.status === 'cache') totals.cache++;

    const tokens = safeNumber(event.tokens?.totalTokens) ?? 0;
    totals.totalTokens += tokens;

    if (!totals.byService[event.service]) {
      totals.byService[event.service] = { calls: 0, errors: 0, fallbacks: 0, cache: 0, tokens: 0, avgDurationMs: 0 };
    }
    const item = totals.byService[event.service];
    item.calls++;
    item.tokens += tokens;
    if (event.status === 'error') item.errors++;
    if (event.status === 'fallback') item.fallbacks++;
    if (event.status === 'cache') item.cache++;

    const duration = safeNumber(event.durationMs);
    if (duration !== undefined) {
      durationTotal += duration;
      durationCount++;
      const current = serviceDurations[event.service] ?? { total: 0, count: 0 };
      current.total += duration;
      current.count++;
      serviceDurations[event.service] = current;
    }
  }

  totals.avgDurationMs = durationCount > 0 ? Math.round(durationTotal / durationCount) : 0;
  for (const [service, duration] of Object.entries(serviceDurations) as Array<[UsageService, { total: number; count: number }]>) {
    if (totals.byService[service] && duration.count > 0) {
      totals.byService[service].avgDurationMs = Math.round(duration.total / duration.count);
    }
  }

  return totals;
};
