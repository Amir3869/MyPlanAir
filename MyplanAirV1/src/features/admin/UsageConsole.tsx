// src/features/admin/UsageConsole.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Console test locale — suivi API / IA pendant la phase de test MyTrip
// Données locales uniquement, non envoyées au cloud.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  ChevronDown,
  Clock3,
  Download,
  HardDrive,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import {
  clearUsageEvents,
  getUsageEvents,
  getUsageTotals,
  getUsageWindowEvents,
  USAGE_TEST_LIMITS,
  type UsageEvent,
  type UsageService,
} from '../../utils/usageTelemetry';

const SERVICE_LABELS: Record<UsageService, { label: string; short: string; emoji: string; color: string }> = {
  assistant: { label: 'Assistant ARIA', short: 'Assistant', emoji: '🤖', color: '#7c8cff' },
  chat:      { label: 'Chat ARIA',      short: 'Chat',      emoji: '💬', color: '#ec4899' },
  planner:   { label: 'Planner IA',     short: 'Planner',   emoji: '🧭', color: '#56c5a4' },
  itinerary: { label: 'Parcours IA',    short: 'Parcours',  emoji: '🗺️', color: '#f0b24a' },
  photo:     { label: 'Photos voyage',  short: 'Photos',    emoji: '📸', color: '#38bdf8' },
  currency:  { label: 'Change devises', short: 'Change',    emoji: '💱', color: '#a5b4fc' },
  weather:   { label: 'Météo',          short: 'Météo',     emoji: '☀️', color: '#fb7185' },
  geocode:   { label: 'Géocodage',      short: 'Geo',       emoji: '📍', color: '#34d399' },
  worldmap:  { label: 'Carte monde',    short: 'Carte',     emoji: '🌍', color: '#60a5fa' },
  unknown:   { label: 'Inconnu',        short: 'Autre',     emoji: '✨', color: '#94a3b8' },
};

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(Math.round(value));

const AI_MODEL_LIMITS = {
  'openai/gpt-oss-120b': {
    provider: 'Groq',
    label: 'GPT OSS 120B',
    rpm: 30,
    rpd: 1_000,
    tpm: 8_000,
    tpd: 200_000,
    source: 'Limite Groq Free officielle',
  },
  'openai/gpt-oss-20b': {
    provider: 'Groq',
    label: 'GPT OSS 20B',
    rpm: 30,
    rpd: 1_000,
    tpm: 8_000,
    tpd: 200_000,
    source: 'Limite Groq Free officielle',
  },
  'mistral-small-latest': {
    provider: 'Mistral',
    label: 'Mistral Small latest',
    rps: 0.03,
    rpm: 0.03 * 60,
    rpd: Math.floor(0.03 * 60 * 60 * 24),
    tpm: 25_000,
    tpd: 25_000 * 60 * 24,
    source: 'Limite lue sur ton dashboard Mistral — à confirmer si le modèle exact change',
  },
} as const;

type AiModelId = keyof typeof AI_MODEL_LIMITS;

const TRACKED_AI_MODELS = Object.keys(AI_MODEL_LIMITS) as AiModelId[];

const AI_DAILY_TOKEN_LIMIT = TRACKED_AI_MODELS.reduce((sum, model) => sum + (AI_MODEL_LIMITS[model].tpd ?? 0), 0);
const AI_WEEKLY_TOKEN_LIMIT = AI_DAILY_TOKEN_LIMIT * 7;

const formatCompactNumber = (value?: number) => {
  if (!value || value <= 0) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return formatNumber(value);
};

const formatRate = (value?: number, unit = '/min') => {
  if (!value || value <= 0) return '—';
  return `${value < 1 ? value.toFixed(2) : value.toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`;
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDuration = (ms?: number) => {
  if (!ms || ms <= 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatJson = (value: unknown) => {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const humanReason = (reason?: string) => {
  if (!reason) return 'Raison non précisée.';
  const map: Record<string, string> = {
    no_valid_steps_for_target_periods: 'L’IA a répondu, mais aucune étape ne correspondait aux moments demandés.',
    invalid_ai_response: 'Le Worker n’a pas réussi à transformer la réponse IA en parcours valide.',
    all_ai_providers_failed: 'Tous les providers IA disponibles ont échoué ou n’ont pas répondu correctement.',
    timeout: 'La requête a pris trop de temps.',
    network_error: 'La requête n’a pas pu joindre le service.',
    offline: 'L’appareil était hors connexion.',
    invalid_rate: 'Le provider a répondu sans taux exploitable.',
    provider_http_error: 'Le provider externe a renvoyé une erreur HTTP.',
  };
  return map[reason] ?? reason;
};

const formatListValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const percent = (used: number, limit?: number) => {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

const Donut = ({
  label,
  value,
  limit,
  color,
  caption,
  onClick,
}: {
  label: string;
  value: number;
  limit?: number;
  color: string;
  caption?: string;
  onClick?: () => void;
}) => {
  const pct = percent(value, limit);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (pct / 100);

  return (
    <GlassCard
      className={`p-4 relative overflow-hidden ${onClick ? 'cursor-pointer tap' : ''}`}
      onClick={onClick}
    >
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-20"
        style={{ background: color }}
      />
      <div className="flex items-center gap-3">
        <div className="relative w-[86px] h-[86px] flex-shrink-0">
          <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
            <motion.circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-base font-bold tracking-tight">{pct}%</div>
            <div className="text-[9px] text-white/35 uppercase tracking-wider">utilisé</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight">{label}</div>
          <div className="mt-1 text-lg font-bold font-display tracking-tight">
            {formatNumber(value)}
            {limit ? <span className="text-xs text-white/35 font-medium"> / {formatNumber(limit)}</span> : null}
          </div>
          <div className="text-[11px] text-white/35 mt-1">{caption ?? 'Quota local de test'}</div>
        </div>
      </div>
    </GlassCard>
  );
};

const MiniProgressRing = ({ value, color, size = 48, stroke = 5 }: { value: number; color: string; size?: number; stroke?: number }) => {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{Math.round(value)}%</div>
    </div>
  );
};

const CompactQuotaCard = ({
  service,
  calls,
  limit,
  tokens,
  avgDurationMs,
}: {
  service: UsageService;
  calls: number;
  limit?: number;
  tokens?: number;
  avgDurationMs?: number;
}) => {
  const meta = SERVICE_LABELS[service];
  const pct = percent(calls, limit);

  return (
    <GlassCard className="p-3 relative overflow-hidden min-h-[118px]">
      <div className="absolute -right-8 -top-8 w-20 h-20 rounded-full blur-2xl opacity-18" style={{ background: meta.color }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base">{meta.emoji}</span>
            <span className="text-sm font-semibold truncate">{meta.short}</span>
          </div>
          <div className="mt-2 text-lg font-bold font-display tracking-tight">
            {formatNumber(calls)}
            {limit ? <span className="text-[11px] text-white/35 font-medium"> / {formatNumber(limit)}</span> : null}
          </div>
        </div>
        <MiniProgressRing value={pct} color={meta.color} />
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2 text-[10px] text-white/35">
        <span>{tokens ? `${formatNumber(tokens)} tokens` : 'Quota local'}</span>
        <span>{formatDuration(avgDurationMs)}</span>
      </div>
    </GlassCard>
  );
};

type HealthStatus = {
  score: number;
  label: 'Excellent' | 'Stable' | 'À surveiller' | 'Fragile';
  emoji: string;
  color: string;
  line: string;
};

const calculateHealthStatus = ({
  events,
  totalTokens,
  avgDurationMs,
}: {
  events: UsageEvent[];
  totalTokens: number;
  avgDurationMs: number;
}): HealthStatus => {
  let score = 100;
  const errors = events.filter((event) => event.status === 'error');
  const fallbacks = events.filter((event) => event.status === 'fallback');
  const networkOrTimeout = events.filter((event) => {
    const reason = `${event.errorReason ?? ''}`.toLowerCase();
    return reason.includes('network') || reason.includes('timeout') || reason.includes('offline');
  });
  const rateLimits = events.filter((event) => getErrorKey(event) === '429');
  const slowEvents = events.filter((event) => (event.durationMs ?? 0) > 8000);

  score -= errors.length * 8;
  score -= fallbacks.length * 4;
  score -= networkOrTimeout.length * 6;
  score -= rateLimits.length * 12;
  score -= slowEvents.length * 3;
  if (avgDurationMs > 10000) score -= 10;
  else if (avgDurationMs > 5000) score -= 5;

  const dailyTokenLimit = AI_DAILY_TOKEN_LIMIT;
  if (dailyTokenLimit > 0 && totalTokens / dailyTokenLimit >= 0.8) score -= 8;

  const servicesOverLimit = (Object.keys(SERVICE_LABELS) as UsageService[]).filter((service) => {
    const limit = USAGE_TEST_LIMITS[service]?.daily;
    if (!limit) return false;
    const calls = events.filter((event) => event.service === service).length;
    return calls / limit >= 0.8;
  });
  score -= servicesOverLimit.length * 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const line = errors.length === 0 && fallbacks.length === 0
    ? 'Aucune alerte critique'
    : `${errors.length} erreur${errors.length > 1 ? 's' : ''} · ${fallbacks.length} fallback${fallbacks.length > 1 ? 's' : ''}`;

  if (score >= 95) return { score, label: 'Excellent', emoji: '💎', color: '#56c5a4', line };
  if (score >= 80) return { score, label: 'Stable', emoji: '✨', color: '#7c8cff', line };
  if (score >= 60) return { score, label: 'À surveiller', emoji: '⚠️', color: '#f0b24a', line };
  return { score, label: 'Fragile', emoji: '🚨', color: '#ef4444', line };
};

const HealthCard = ({
  health,
  totalTokens,
  avgDurationMs,
  activeServices,
  alertCount,
}: {
  health: HealthStatus;
  totalTokens: number;
  avgDurationMs: number;
  activeServices: number;
  alertCount: number;
}) => (
  <GlassCard className="p-4 relative overflow-hidden mb-4">
    <div className="absolute -right-14 -top-16 w-44 h-44 rounded-full blur-3xl opacity-24" style={{ background: health.color }} />
    <div className="absolute -left-12 bottom-0 w-36 h-36 rounded-full blur-3xl opacity-12" style={{ background: '#ec4899' }} />
    <div className="relative flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{health.emoji}</span>
          <div>
            <div className="text-sm font-semibold tracking-tight">Santé app</div>
            <div className="text-[11px] text-white/35">Calcul local aujourd’hui</div>
          </div>
        </div>
        <div className="mt-4 text-3xl font-bold font-display tracking-tight" style={{ color: health.color }}>{health.label}</div>
        <div className="text-sm text-white/48 mt-1">{health.line}</div>
      </div>
      <MiniProgressRing value={health.score} color={health.color} size={82} stroke={8} />
    </div>

    <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
      {[
        { label: 'Tokens IA', value: `${formatNumber(totalTokens)} / ${formatCompactNumber(AI_DAILY_TOKEN_LIMIT)}` },
        { label: 'Temps moyen', value: formatDuration(avgDurationMs) },
        { label: 'Services actifs', value: `${activeServices} / 9` },
        { label: 'Alertes', value: alertCount === 0 ? 'Aucune' : String(alertCount) },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-2xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-[10px] uppercase tracking-wider text-white/30">{item.label}</div>
          <div className="text-xs font-semibold text-white/75 mt-0.5 truncate">{item.value}</div>
        </div>
      ))}
    </div>
  </GlassCard>
);

type StorageEstimateState = {
  supported: boolean;
  usage?: number;
  quota?: number;
};

const StorageCard = ({ storage }: { storage: StorageEstimateState }) => {
  const usage = storage.usage ?? 0;
  const quota = storage.quota ?? 0;
  const remaining = Math.max(0, quota - usage);
  const pct = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
  const color = pct >= 85 ? '#ef4444' : pct >= 65 ? '#f0b24a' : '#56c5a4';

  return (
    <GlassCard className="p-4 relative overflow-hidden mb-4">
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: color }} />
      <div className="relative flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
          <HardDrive size={19} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Stockage appareil / PWA</div>
              <div className="text-[11px] text-white/35">Estimation navigateur pour ce domaine</div>
            </div>
            <div className="text-xl font-bold font-display" style={{ color }}>{storage.supported ? `${pct}%` : '—'}</div>
          </div>

          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}, #a5b4fc)` }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Utilisé', value: storage.supported ? formatBytes(usage) : 'Non dispo' },
              { label: 'Restant', value: storage.supported ? formatBytes(remaining) : '—' },
              { label: 'Quota estimé', value: storage.supported ? formatBytes(quota) : '—' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[10px] uppercase tracking-wider text-white/30">{item.label}</div>
                <div className="text-xs font-semibold text-white/75 mt-0.5 truncate">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-white/30 mt-3 leading-relaxed">
            Inclut IndexedDB, cache PWA et autres données locales du site. Sur iOS/Safari, cette valeur reste une estimation et peut évoluer selon l’espace disponible.
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

type AiModelUsageStat = {
  model: string;
  provider: string;
  callsDay: number;
  callsWeek: number;
  promptTokensDay: number;
  completionTokensDay: number;
  totalTokensDay: number;
  totalTokensWeek: number;
  avgTokensDay: number;
  endpoints: string[];
};

const AiModelCard = ({ stat }: { stat: AiModelUsageStat }) => {
  const limit = AI_MODEL_LIMITS[stat.model as AiModelId];
  const dailyTokenLimit = limit?.tpd;
  const dailyRequestLimit = limit?.rpd;
  const tokenPct = percent(stat.totalTokensDay, dailyTokenLimit);
  const requestPct = percent(stat.callsDay, dailyRequestLimit);
  const tokenRemaining = dailyTokenLimit ? Math.max(0, dailyTokenLimit - stat.totalTokensDay) : undefined;
  const requestRemaining = dailyRequestLimit ? Math.max(0, dailyRequestLimit - stat.callsDay) : undefined;
  const color = tokenPct >= 85 || requestPct >= 85 ? '#ef4444' : tokenPct >= 65 || requestPct >= 65 ? '#f0b24a' : '#56c5a4';
  const rps = limit && 'rps' in limit ? limit.rps : undefined;

  return (
    <div className="rounded-3xl p-4 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-18" style={{ background: color }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/35">{limit?.provider ?? stat.provider}</div>
          <div className="text-sm font-bold tracking-tight mt-0.5 truncate">{limit?.label ?? stat.model}</div>
          <div className="text-[11px] text-white/35 truncate mt-0.5">{stat.model}</div>
        </div>
        <MiniProgressRing value={tokenPct} color={color} size={54} stroke={6} />
      </div>

      <div className="relative mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/30">Tokens aujourd’hui</div>
            <div className="text-xl font-bold font-display tracking-tight mt-0.5">
              {formatNumber(stat.totalTokensDay)}
              {dailyTokenLimit ? <span className="text-xs text-white/35 font-medium"> / {formatCompactNumber(dailyTokenLimit)}</span> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Restant</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color }}>{dailyTokenLimit ? formatCompactNumber(tokenRemaining) : '—'}</div>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}, #a5b4fc)` }}
            initial={{ width: 0 }}
            animate={{ width: `${tokenPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] uppercase tracking-wider text-white/30">Requêtes jour</div>
          <div className="text-xs font-semibold text-white/75 mt-0.5">
            {formatNumber(stat.callsDay)}{dailyRequestLimit ? ` / ${formatNumber(dailyRequestLimit)}` : ''}
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">Restant : {dailyRequestLimit ? formatNumber(requestRemaining ?? 0) : '—'}</div>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] uppercase tracking-wider text-white/30">Rythme max</div>
          <div className="text-xs font-semibold text-white/75 mt-0.5">{formatCompactNumber(limit?.tpm)} tok/min</div>
          <div className="text-[10px] text-white/30 mt-0.5">{rps ? `${rps.toFixed(2)} req/s` : formatRate(limit?.rpm)}</div>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] uppercase tracking-wider text-white/30">Entrée / sortie</div>
          <div className="text-xs font-semibold text-white/75 mt-0.5">{formatCompactNumber(stat.promptTokensDay)} / {formatCompactNumber(stat.completionTokensDay)}</div>
          <div className="text-[10px] text-white/30 mt-0.5">prompt / réponse</div>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] uppercase tracking-wider text-white/30">Moyenne</div>
          <div className="text-xs font-semibold text-white/75 mt-0.5">{formatCompactNumber(stat.avgTokensDay)} tok/req</div>
          <div className="text-[10px] text-white/30 mt-0.5">7j : {formatCompactNumber(stat.totalTokensWeek)}</div>
        </div>
      </div>

      <div className="relative text-[11px] text-white/30 mt-3 leading-relaxed">
        Utilisé sur : {stat.endpoints.length > 0 ? stat.endpoints.join(' · ') : 'aucun appel aujourd’hui'}
        <span className="block mt-1">{limit?.source ?? 'Limite non renseignée'}</span>
      </div>
    </div>
  );
};

const AiTokensSheet = ({
  open,
  onClose,
  stats,
  totalDay,
  totalWeek,
  callsDay,
}: {
  open: boolean;
  onClose: () => void;
  stats: AiModelUsageStat[];
  totalDay: number;
  totalWeek: number;
  callsDay: number;
}) => (
  <BottomSheet open={open} onClose={onClose} title="Consommation IA" maxWidth={640}>
    <div className="space-y-4">
      <div className="rounded-3xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(255,122,0,0.12))', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full blur-3xl opacity-24" style={{ background: '#7C3AED' }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-white/40">Aujourd’hui</div>
          <div className="text-3xl font-bold font-display tracking-tight mt-1">{formatNumber(totalDay)} tokens</div>
          <div className="text-sm text-white/45 mt-1">{formatNumber(callsDay)} requête{callsDay > 1 ? 's' : ''} IA · limite totale suivie : {formatCompactNumber(AI_DAILY_TOKEN_LIMIT)} tokens/jour</div>
        </div>
        <div className="relative grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[10px] uppercase tracking-wider text-white/30">Restant jour</div>
            <div className="text-sm font-semibold text-white/80 mt-0.5">{formatCompactNumber(Math.max(0, AI_DAILY_TOKEN_LIMIT - totalDay))}</div>
          </div>
          <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[10px] uppercase tracking-wider text-white/30">Utilisé 7 jours</div>
            <div className="text-sm font-semibold text-white/80 mt-0.5">{formatCompactNumber(totalWeek)} / {formatCompactNumber(AI_WEEKLY_TOKEN_LIMIT)}</div>
          </div>
        </div>
      </div>

      <div className="text-xs uppercase tracking-wider text-white/35 px-1">Détail par modèle</div>
      <div className="space-y-3">
        {stats.map((stat) => <AiModelCard key={stat.model} stat={stat} />)}
      </div>

      <div className="text-[11px] text-white/30 leading-relaxed px-1">
        Les tokens utilisés viennent du retour réel du Worker quand le provider renvoie l’usage. Les limites Groq sont journalières/minute. Les limites Mistral visibles ici sont converties depuis le débit minute/seconde de ton dashboard.
      </div>
    </div>
  </BottomSheet>
);

const ServicesTestedCard = ({ active, total = 9 }: { active: number; total?: number }) => {
  const pct = percent(active, total);
  const color = active >= total ? '#56c5a4' : active >= Math.ceil(total * 0.6) ? '#7c8cff' : '#f0b24a';

  return (
    <GlassCard className="p-3 relative overflow-hidden min-h-[118px]">
      <div className="absolute -right-8 -top-8 w-20 h-20 rounded-full blur-2xl opacity-18" style={{ background: color }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base">🧪</span>
            <span className="text-sm font-semibold truncate">Services</span>
          </div>
          <div className="mt-2 text-lg font-bold font-display tracking-tight">
            {active}<span className="text-[11px] text-white/35 font-medium"> / {total}</span>
          </div>
        </div>
        <MiniProgressRing value={pct} color={color} />
      </div>
      <div className="relative mt-3 text-[10px] text-white/35 leading-snug">
        testés aujourd’hui
        <span className="block text-white/25 mt-0.5">Couverture de test</span>
      </div>
    </GlassCard>
  );
};

const StatPill = ({ icon: Icon, label, value, color }: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  color: string;
}) => (
  <GlassCard className="p-3">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-[11px] text-white/40 uppercase tracking-wider">{label}</div>
    </div>
    <div className="text-xl font-bold font-display tracking-tight">{value}</div>
  </GlassCard>
);

const statusLabel = (event: UsageEvent) => {
  if (event.status === 'success') return { text: 'OK', color: '#56c5a4', bg: 'rgba(86,197,164,0.13)' };
  if (event.status === 'fallback') return { text: 'Fallback', color: '#f0b24a', bg: 'rgba(240,178,74,0.13)' };
  if (event.status === 'cache') return { text: 'Cache', color: '#a5b4fc', bg: 'rgba(165,180,252,0.13)' };
  return { text: 'Erreur', color: '#ef4444', bg: 'rgba(239,68,68,0.13)' };
};

const ERROR_GUIDE: Record<string, { title: string; body: string; tone: 'warn' | 'error' | 'info' }> = {
  '400': { title: 'Requête invalide', body: 'Paramètre manquant ou format incorrect.', tone: 'warn' },
  '401': { title: 'Non authentifié', body: 'Session, token ou clé absente/invalide.', tone: 'error' },
  '403': { title: 'Accès refusé', body: 'Permission ou clé API refusée par le service.', tone: 'error' },
  '404': { title: 'Introuvable', body: 'Endpoint ou ressource non disponible.', tone: 'warn' },
  '408': { title: 'Timeout', body: 'Le service n’a pas répondu assez vite.', tone: 'warn' },
  '429': { title: 'Trop de requêtes', body: 'Rate limit ou quota temporaire atteint. Réduire la fréquence ou attendre.', tone: 'warn' },
  '500': { title: 'Erreur serveur', body: 'Erreur interne côté service appelé.', tone: 'error' },
  '502': { title: 'Provider indisponible', body: 'Le Worker/proxy a reçu une mauvaise réponse du provider.', tone: 'error' },
  '503': { title: 'Service indisponible', body: 'Provider temporairement inaccessible ou surchargé.', tone: 'warn' },
  timeout: { title: 'Temps dépassé', body: 'La requête a expiré avant réponse complète.', tone: 'warn' },
  network: { title: 'Réseau indisponible', body: 'Connexion, DNS, offline, CORS ou interruption réseau.', tone: 'info' },
  fallback: { title: 'Fallback utilisé', body: 'My Plan’Air a utilisé une réponse locale/cache au lieu du live.', tone: 'info' },
};

const getErrorKey = (event: UsageEvent): string | null => {
  if (event.httpStatus) return String(event.httpStatus);
  const reason = `${event.errorReason ?? ''}`.toLowerCase();
  const httpMatch = reason.match(/http_?(\d{3})/);
  if (httpMatch?.[1]) return httpMatch[1];
  if (reason.includes('timeout')) return 'timeout';
  if (reason.includes('network') || reason.includes('offline')) return 'network';
  if (event.status === 'fallback') return 'fallback';
  return null;
};

const toneStyle = (tone: 'warn' | 'error' | 'info') => {
  if (tone === 'error') return { color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)' };
  if (tone === 'warn') return { color: '#f0b24a', bg: 'rgba(240,178,74,0.12)', border: 'rgba(240,178,74,0.22)' };
  return { color: '#a5b4fc', bg: 'rgba(124,140,255,0.12)', border: 'rgba(124,140,255,0.22)' };
};

const CollapsibleSection = ({
  title,
  subtitle,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => (
  <GlassCard className="mb-5 overflow-hidden">
    <button onClick={onToggle} className="w-full px-4 py-3.5 flex items-center gap-3 text-left tap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-wider text-white/45">{title}</div>
          {typeof count === 'number' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)' }}>{count}</span>
          )}
        </div>
        {subtitle && <div className="text-[11px] text-white/30 mt-0.5">{subtitle}</div>}
      </div>
      <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown size={16} className="text-white/35" />
      </motion.div>
    </button>
    {open && <div className="border-t border-white/5">{children}</div>}
  </GlassCard>
);

export const UsageConsole = () => {
  const navigate = useNavigate();
  const { success, info } = useToast();
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<'all' | 'ai' | 'errors'>('all');
  const [servicesOpen, setServicesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(true);
  const [selectedErrorKey, setSelectedErrorKey] = useState<string | null>(null);
  const [expandedErrorEventId, setExpandedErrorEventId] = useState<string | null>(null);
  const [expandedTechnicalEventId, setExpandedTechnicalEventId] = useState<string | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimateState>({ supported: false });

  useEffect(() => {
    let cancelled = false;

    const readStorageEstimate = async () => {
      if (!navigator.storage?.estimate) {
        if (!cancelled) setStorageEstimate({ supported: false });
        return;
      }

      try {
        const estimate = await navigator.storage.estimate();
        if (!cancelled) {
          setStorageEstimate({
            supported: true,
            usage: estimate.usage ?? 0,
            quota: estimate.quota ?? 0,
          });
        }
      } catch {
        if (!cancelled) setStorageEstimate({ supported: false });
      }
    };

    readStorageEstimate();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const events = useMemo(() => getUsageEvents(), [version]);
  const dayEvents = useMemo(() => getUsageWindowEvents('day', events), [events]);
  const weekEvents = useMemo(() => getUsageWindowEvents('week', events), [events]);
  const totals = useMemo(() => getUsageTotals(dayEvents), [dayEvents]);
  const weekTotals = useMemo(() => getUsageTotals(weekEvents), [weekEvents]);

  const aiModelStats = useMemo<AiModelUsageStat[]>(() => {
    const modelIds = new Set<string>(TRACKED_AI_MODELS);
    for (const event of weekEvents) {
      if (event.category !== 'ai' || !event.model) continue;
      modelIds.add(event.model);
    }

    return [...modelIds].map((model) => {
      const dayModelEvents = dayEvents.filter((event) => event.category === 'ai' && event.model === model);
      const weekModelEvents = weekEvents.filter((event) => event.category === 'ai' && event.model === model);
      const promptTokensDay = dayModelEvents.reduce((sum, event) => sum + (event.tokens?.promptTokens ?? 0), 0);
      const completionTokensDay = dayModelEvents.reduce((sum, event) => sum + (event.tokens?.completionTokens ?? 0), 0);
      const totalTokensDay = dayModelEvents.reduce((sum, event) => sum + (event.tokens?.totalTokens ?? 0), 0);
      const totalTokensWeek = weekModelEvents.reduce((sum, event) => sum + (event.tokens?.totalTokens ?? 0), 0);
      const endpoints = [...new Set(dayModelEvents.map((event) => event.endpoint).filter(Boolean))];
      const provider = dayModelEvents[0]?.provider ?? weekModelEvents[0]?.provider ?? AI_MODEL_LIMITS[model as AiModelId]?.provider ?? 'IA';

      return {
        model,
        provider,
        callsDay: dayModelEvents.length,
        callsWeek: weekModelEvents.length,
        promptTokensDay,
        completionTokensDay,
        totalTokensDay,
        totalTokensWeek,
        avgTokensDay: dayModelEvents.length > 0 ? Math.round(totalTokensDay / dayModelEvents.length) : 0,
        endpoints,
      };
    }).sort((a, b) => {
      const bKnown = TRACKED_AI_MODELS.includes(b.model as AiModelId) ? 1 : 0;
      const aKnown = TRACKED_AI_MODELS.includes(a.model as AiModelId) ? 1 : 0;
      return (b.totalTokensDay - a.totalTokensDay) || (bKnown - aKnown) || a.model.localeCompare(b.model);
    });
  }, [dayEvents, weekEvents]);

  const activeServiceCount = useMemo(() => (
    (Object.keys(SERVICE_LABELS) as UsageService[])
      .filter((service) => service !== 'unknown')
      .filter((service) => (totals.byService[service]?.calls ?? 0) > 0).length
  ), [totals.byService]);

  const alertCount = totals.errors + totals.fallbacks;

  const health = useMemo(() => calculateHealthStatus({
    events: dayEvents,
    totalTokens: totals.totalTokens,
    avgDurationMs: totals.avgDurationMs,
  }), [dayEvents, totals.avgDurationMs, totals.totalTokens]);

  const services = useMemo(() => {
    const entries = Object.entries(totals.byService) as Array<[UsageService, typeof totals.byService[UsageService]]>;
    return entries
      .filter(([, item]) => item.calls > 0)
      .sort((a, b) => b[1].calls - a[1].calls);
  }, [totals.byService]);

  const filteredEvents = useMemo(() => {
    const list = [...events].reverse();
    if (filter === 'ai') return list.filter((event) => event.category === 'ai');
    if (filter === 'errors') return list.filter((event) => event.status === 'error' || event.status === 'fallback');
    return list;
  }, [events, filter]);

  const observedErrors = useMemo(() => {
    const map = new Map<string, { count: number; last?: UsageEvent; events: UsageEvent[] }>();
    for (const event of events) {
      if (event.status !== 'error' && event.status !== 'fallback') continue;
      const key = getErrorKey(event);
      if (!key) continue;
      const current = map.get(key) ?? { count: 0, last: undefined, events: [] };
      current.count += 1;
      current.last = event;
      current.events.push(event);
      map.set(key, current);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [events]);

  const selectedError = useMemo(() => (
    selectedErrorKey
      ? observedErrors.find(([key]) => key === selectedErrorKey) ?? null
      : null
  ), [observedErrors, selectedErrorKey]);

  const reset = () => {
    haptic([8, 30, 8]);
    clearUsageEvents();
    setVersion((v) => v + 1);
    info('Stats locales réinitialisées');
  };

  const refresh = () => {
    haptic(4);
    setVersion((v) => v + 1);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mytrip-usage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Export usage créé');
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#07070b' }}>
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/mytrip-ambient-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(18px) saturate(130%) brightness(1.02)', transform: 'scale(1.06)', opacity: 0.5 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(7,7,11,0.30) 0%, rgba(7,7,11,0.70) 48%, #07070b 100%)' }}
        />
        <div className="absolute top-20 left-6 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: '#7c8cff' }} />
        <div className="absolute top-44 right-4 w-44 h-44 rounded-full blur-3xl opacity-14" style={{ background: '#ec4899' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-safe pb-8">
        <div className="pt-4 pb-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/profil')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
            aria-label="Retour au profil"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display tracking-tight">Admin test</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,140,255,0.16)', color: '#a5b4fc' }}>LOCAL</span>
            </div>
            <p className="text-sm text-white/42 mt-0.5">API · IA · quotas · tokens réels quand disponibles</p>
          </div>
          <button
            onClick={refresh}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
            aria-label="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <GlassCard className="p-4 mb-4 overflow-hidden relative">
          <div className="absolute -top-16 -right-12 w-40 h-40 rounded-full blur-3xl opacity-25" style={{ background: '#7c8cff' }} />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,140,255,0.28), rgba(236,72,153,0.22))' }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Console locale de test</div>
              <p className="text-xs text-white/42 leading-relaxed mt-1">
                Ces données restent sur cet appareil. Les vrais quotas seront branchés plus tard avec Supabase.
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatPill icon={Activity} label="Appels jour" value={formatNumber(totals.calls)} color="#7c8cff" />
          <StatPill icon={Brain} label="Tokens jour" value={formatNumber(totals.totalTokens)} color="#ec4899" />
          <StatPill icon={WifiOff} label="Erreurs" value={formatNumber(totals.errors + totals.fallbacks)} color="#f0b24a" />
          <StatPill icon={Clock3} label="Moyenne" value={formatDuration(totals.avgDurationMs)} color="#56c5a4" />
        </div>

        <HealthCard
          health={health}
          totalTokens={totals.totalTokens}
          avgDurationMs={totals.avgDurationMs}
          activeServices={activeServiceCount}
          alertCount={alertCount}
        />

        <StorageCard storage={storageEstimate} />

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <Donut
            label="Tokens IA aujourd’hui"
            value={totals.totalTokens}
            limit={AI_DAILY_TOKEN_LIMIT}
            color="#ec4899"
            caption="Total tokens réels Worker · toucher pour détailler"
            onClick={() => {
              haptic(4);
              setAiSheetOpen(true);
            }}
          />
          <Donut
            label="Tokens IA semaine"
            value={weekTotals.totalTokens}
            limit={AI_WEEKLY_TOKEN_LIMIT}
            color="#7c8cff"
            caption="Fenêtre locale semaine"
          />
        </div>

        <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Quotas par service · aujourd’hui</div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(Object.keys(SERVICE_LABELS) as UsageService[])
            .filter((service) => service !== 'unknown')
            .map((service) => {
              const calls = totals.byService[service]?.calls ?? 0;
              const limit = USAGE_TEST_LIMITS[service]?.daily;
              return (
                <CompactQuotaCard
                  key={service}
                  service={service}
                  calls={calls}
                  limit={limit}
                  tokens={totals.byService[service]?.tokens}
                  avgDurationMs={totals.byService[service]?.avgDurationMs}
                />
              );
            })}
          <ServicesTestedCard active={activeServiceCount} />
        </div>

        <CollapsibleSection
          title="Codes erreurs observés"
          subtitle="Aide de lecture pendant les tests"
          count={observedErrors.length}
          open={errorsOpen}
          onToggle={() => setErrorsOpen((open) => !open)}
        >
          {observedErrors.length === 0 ? (
            <div className="p-5 text-center text-sm text-white/40">Aucun code erreur observé pour l’instant.</div>
          ) : (
            <div className="p-3 space-y-2">
              {observedErrors.map(([key, item]) => {
                const guide = ERROR_GUIDE[key] ?? { title: `Code ${key}`, body: 'Erreur observée pendant les tests.', tone: 'warn' as const };
                const style = toneStyle(guide.tone);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      haptic(4);
                      setSelectedErrorKey(key);
                    }}
                    className="w-full rounded-2xl p-3 text-left tap"
                    style={{ background: style.bg, border: `1px solid ${style.border}` }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} style={{ color: style.color, marginTop: 2 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold" style={{ color: style.color }}>{key} · {guide.title}</div>
                          <div className="text-[10px] text-white/40 flex-shrink-0">×{item.count}</div>
                        </div>
                        <div className="text-xs text-white/45 mt-1 leading-relaxed">{guide.body}</div>
                        {item.last && (
                          <div className="text-[11px] text-white/30 mt-1 truncate">
                            Dernier : {SERVICE_LABELS[item.last.service]?.short ?? item.last.service} · {item.last.endpoint}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="text-[11px] text-white/28 px-1 pt-1 leading-relaxed">
                429 = trop de requêtes/quota temporaire. 502/503 = provider ou proxy indisponible. Network/timeout = réseau ou service trop lent.
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Détail services actifs"
          subtitle="Répartition des appels enregistrés aujourd’hui"
          count={services.length}
          open={servicesOpen}
          onToggle={() => setServicesOpen((open) => !open)}
        >
          <div className="divide-y divide-white/5">
          {services.length === 0 ? (
            <div className="p-5 text-center text-sm text-white/40">Aucun appel enregistré pour aujourd’hui.</div>
          ) : services.map(([service, item]) => {
            const meta = SERVICE_LABELS[service];
            return (
              <div key={service} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background: `${meta.color}22` }}>{meta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="text-xs text-white/35 mt-0.5">
                    {item.calls} appels · {item.errors} erreurs · {item.fallbacks} fallback · {formatDuration(item.avgDurationMs)} moy.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatNumber(item.tokens)}</div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider">tokens</div>
                </div>
              </div>
            );
          })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Historique"
          subtitle="Derniers événements locaux enregistrés"
          count={filteredEvents.length}
          open={historyOpen}
          onToggle={() => setHistoryOpen((open) => !open)}
        >
          <div className="px-4 py-3 border-b border-white/5 flex justify-end">
            <div className="flex gap-1">
              {[
                ['all', 'Tous'],
                ['ai', 'IA'],
                ['errors', 'Alertes'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold tap"
                  style={{ background: filter === key ? 'rgba(124,140,255,0.18)' : 'rgba(255,255,255,0.06)', color: filter === key ? '#a5b4fc' : 'rgba(255,255,255,0.45)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {filteredEvents.length === 0 ? (
              <div className="p-5 text-center text-sm text-white/40">Aucun événement dans ce filtre.</div>
            ) : filteredEvents.slice(0, 80).map((event) => {
              const meta = SERVICE_LABELS[event.service];
              const status = statusLabel(event);
              return (
                <div key={event.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-base" style={{ background: `${meta.color}1f` }}>{meta.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-sm font-semibold truncate">{meta.short}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: status.bg, color: status.color }}>{status.text}</span>
                    </div>
                    <div className="text-[11px] text-white/35 truncate mt-0.5">
                      {formatTime(event.at)} · {event.endpoint} · {event.provider ?? event.category}{event.model ? ` · ${event.model}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold">{event.tokens?.totalTokens ? `${formatNumber(event.tokens.totalTokens)} tok.` : formatDuration(event.durationMs)}</div>
                    <div className="text-[10px] text-white/30">{event.workerVersion ?? 'local'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        <div className="grid grid-cols-2 gap-3 pb-8">
          <button
            onClick={exportJson}
            className="py-3 rounded-2xl text-sm font-semibold tap flex items-center justify-center gap-2"
            style={{ background: 'rgba(124,140,255,0.14)', border: '1px solid rgba(124,140,255,0.22)', color: '#c7d2fe' }}
          >
            <Download size={15} /> Export JSON
          </button>
          <button
            onClick={reset}
            className="py-3 rounded-2xl text-sm font-semibold tap flex items-center justify-center gap-2"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
          >
            <Trash2 size={15} /> Reset local
          </button>
        </div>

        <div className="text-center text-[11px] text-white/25 pb-safe flex items-center justify-center gap-1">
          <Server size={12} /> Données de test locales · Worker 2.13-test compatible
        </div>
      </div>

      <BottomSheet
        open={Boolean(selectedError)}
        onClose={() => setSelectedErrorKey(null)}
        title={selectedError ? `Erreur ${selectedError[0]}` : 'Détail erreur'}
        maxWidth={680}
      >
        {selectedError && (() => {
          const [key, item] = selectedError;
          const guide = ERROR_GUIDE[key] ?? { title: `Code ${key}`, body: 'Erreur observée pendant les tests.', tone: 'warn' as const };
          const style = toneStyle(guide.tone);
          const recentEvents = [...item.events]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 20);

          return (
            <div className="space-y-4">
              <div
                className="rounded-[24px] p-4"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} style={{ color: style.color, marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: style.color }}>{key} · {guide.title}</div>
                    <div className="text-xs text-white/48 mt-1 leading-relaxed">{guide.body}</div>
                    <div className="text-[11px] text-white/32 mt-2">{item.count} événement{item.count > 1 ? 's' : ''} enregistré{item.count > 1 ? 's' : ''} · derniers 20 affichés</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {recentEvents.map((event) => {
                  const meta = SERVICE_LABELS[event.service];
                  const status = statusLabel(event);
                  const details = asRecord(event.details);
                  const context = asRecord(details.context);
                  const worker = asRecord(details.worker);
                  const reason = String(worker.reason ?? details.workerReason ?? details.reason ?? event.errorReason ?? '');
                  const expanded = expandedErrorEventId === event.id;
                  const techExpanded = expandedTechnicalEventId === event.id;
                  return (
                    <div
                      key={event.id}
                      className="rounded-[22px] p-4"
                      style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.085)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-base flex-shrink-0" style={{ background: `${meta.color}22` }}>{meta.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold truncate">{meta.label}</div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: status.bg, color: status.color }}>{status.text}</span>
                          </div>
                          <div className="text-[11px] text-white/35 mt-1">
                            {formatDateTime(event.at)} · {event.endpoint} · {formatDuration(event.durationMs)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {[
                          { label: 'HTTP', value: event.httpStatus ? String(event.httpStatus) : '—' },
                          { label: 'Raison', value: event.errorReason ?? '—' },
                          { label: 'Provider', value: event.provider ?? '—' },
                          { label: 'Modèle', value: event.model ?? '—' },
                          { label: 'Worker', value: event.workerVersion ?? 'local' },
                          { label: 'Request ID', value: event.requestId ?? '—' },
                        ].map((row) => (
                          <div key={row.label} className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="text-[10px] uppercase tracking-wider text-white/28">{row.label}</div>
                            <div className="text-[11px] font-semibold text-white/68 mt-0.5 truncate">{row.value}</div>
                          </div>
                        ))}
                      </div>

                      {event.tokens?.totalTokens ? (
                        <div className="text-[11px] text-white/35 mt-3">
                          Tokens : {formatNumber(event.tokens.totalTokens)} total · prompt {formatNumber(event.tokens.promptTokens ?? 0)} · réponse {formatNumber(event.tokens.completionTokens ?? 0)}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => setExpandedErrorEventId(expanded ? null : event.id)}
                          className="h-10 rounded-2xl text-xs font-semibold tap"
                          style={{ background: 'rgba(var(--accent-from-rgb),0.12)', border: '1px solid rgba(var(--accent-from-rgb),0.22)', color: 'var(--accent-label)' }}
                        >
                          {expanded ? 'Masquer raison' : 'Voir raison'}
                        </button>
                        <button
                          onClick={() => setExpandedTechnicalEventId(techExpanded ? null : event.id)}
                          className="h-10 rounded-2xl text-xs font-semibold tap"
                          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.62)' }}
                        >
                          {techExpanded ? 'Masquer JSON' : 'JSON technique'}
                        </button>
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="text-[10px] uppercase tracking-wider text-white/28 mb-1">Pourquoi</div>
                            <div className="text-xs text-white/65 leading-relaxed">{humanReason(reason)}</div>
                          </div>

                          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="text-[10px] uppercase tracking-wider text-white/28 mb-2">Contexte</div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Destination', value: context.destination },
                                { label: 'Pays', value: context.country },
                                { label: 'Jours', value: context.days },
                                { label: 'Roadtrip', value: context.isRoadtrip === true ? 'Oui' : context.isRoadtrip === false ? 'Non' : undefined },
                                { label: 'Moments', value: asRecord(context.preferences).targetPeriods },
                                { label: 'Ambiances', value: asRecord(context.preferences).activityFamilies },
                              ].map((row) => (
                                <div key={row.label}>
                                  <div className="text-[10px] text-white/28 uppercase tracking-wider">{row.label}</div>
                                  <div className="text-[11px] text-white/62 font-semibold mt-0.5 truncate">{formatListValue(row.value)}</div>
                                </div>
                              ))}
                            </div>
                            {asRecord(context.preferences).avoid ? (
                              <div className="mt-2">
                                <div className="text-[10px] text-white/28 uppercase tracking-wider">À éviter</div>
                                <div className="text-[11px] text-white/58 mt-0.5 leading-relaxed">{String(asRecord(context.preferences).avoid)}</div>
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="text-[10px] uppercase tracking-wider text-white/28 mb-2">Retour Worker</div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Erreur', value: worker.error ?? details.workerError },
                                { label: 'Raison', value: worker.reason ?? details.workerReason },
                                { label: 'Message', value: worker.message ?? details.workerMessage },
                                { label: 'Réparé', value: worker.repaired === true ? 'Oui' : worker.repaired === false ? 'Non' : undefined },
                              ].map((row) => (
                                <div key={row.label}>
                                  <div className="text-[10px] text-white/28 uppercase tracking-wider">{row.label}</div>
                                  <div className="text-[11px] text-white/62 font-semibold mt-0.5 truncate">{formatListValue(row.value)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {techExpanded && (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-wider text-white/28 mb-1">Détails techniques enregistrés</div>
                          <pre className="max-h-52 overflow-auto rounded-2xl p-3 text-[11px] leading-relaxed text-white/55 whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {formatJson(event.details)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      <AiTokensSheet
        open={aiSheetOpen}
        onClose={() => setAiSheetOpen(false)}
        stats={aiModelStats}
        totalDay={totals.totalTokens}
        totalWeek={weekTotals.totalTokens}
        callsDay={dayEvents.filter((event) => event.category === 'ai').length}
      />
    </div>
  );
};
