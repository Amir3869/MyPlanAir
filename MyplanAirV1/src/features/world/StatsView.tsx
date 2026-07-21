// src/features/world/StatsView.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Stats View — XP + km détaillés + bar chart top pays + badges
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Plane, Star } from 'lucide-react';
import { Flag } from '../../shared/Flag';
import { GlassCard } from '../../shared/GlassCard';
import { COLOR, type Badge, type WorldStats, type KmEntry, estimateFlightTime } from './worldHelpers';

// ─── StatMini ──────────────────────────────────────────────────────────────

const StatMini = ({
  value, label, color, emoji,
}: {
  value: string | number;
  label: string;
  color: string;
  emoji: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-3 text-center flex flex-col items-center gap-1"
    style={{
      background: `${color}14`,
      border: `1px solid ${color}30`,
      backdropFilter: 'blur(16px)',
    }}
  >
    <span className="text-lg">{emoji}</span>
    <div
      className="text-xl font-bold font-display tracking-tighter leading-tight"
      style={{ color }}
    >
      {value}
    </div>
    <div className="text-[10px] text-white/45 uppercase tracking-wider leading-tight">
      {label}
    </div>
  </motion.div>
);

// ─── Bar chart top pays ────────────────────────────────────────────────────

const TopCountries = ({ trips }: { trips: { country: string; countryCode: string }[] }) => {
  const topCountries = (() => {
    const counts: Record<string, { count: number; code: string }> = {};
    for (const t of trips) {
      if (!counts[t.country]) counts[t.country] = { count: 0, code: t.countryCode };
      counts[t.country].count++;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
  })();

  if (topCountries.length === 0) return null;
  const maxCount = topCountries[0][1].count;

  return (
    <GlassCard className="p-5">
      <div className="text-xs uppercase tracking-wider text-white/45 mb-4">🏆 Top destinations</div>
      <div className="space-y-3">
        {topCountries.map(([country, { count, code }], i) => (
          <div key={country} className="flex items-center gap-3">
            <Flag code={code} size={16} />
            <span className="text-sm font-medium tracking-tight flex-1 truncate">{country}</span>
            <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full rounded-full"
                style={{
                  background: i === 0
                    ? 'linear-gradient(90deg, var(--accent-from), var(--accent-to))'
                    : 'rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <span className="text-xs font-bold text-white/60 w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// ─── Km détaillé ───────────────────────────────────────────────────────────

const KmDetail = ({ kmBreakdown }: { kmBreakdown: KmEntry[] }) => {
  if (kmBreakdown.length === 0) return null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${COLOR.dream}20` }}
        >
          <Plane size={18} style={{ color: COLOR.dream }} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-white/45">
            Kilomètres parcourus
          </div>
          <div className="text-2xl font-bold font-display tracking-tighter" style={{ color: COLOR.dream }}>
            {kmBreakdown
              .filter((e) => e.status !== 'upcoming')
              .reduce((sum, e) => sum + e.distanceKm, 0)
              .toLocaleString('fr-FR')} km
          </div>
        </div>
      </div>

      <div className="text-[11px] text-white/40 mb-3">
        Distance estimée depuis ton domicile 🏠
      </div>

      {/* Détail par voyage */}
      <div className="space-y-2">
        {kmBreakdown.map((entry) => {
          const statusColor = entry.status === 'ongoing' ? COLOR.ongoing
            : entry.status === 'upcoming' ? COLOR.upcoming
            : COLOR.finished;
          const statusLabel = entry.status === 'ongoing' ? '●' : entry.status === 'upcoming' ? '○' : '✓';

          return (
            <div key={entry.tripId} className="flex items-center gap-2 text-xs">
              <span style={{ color: statusColor }}>{statusLabel}</span>
              <Flag code={entry.countryCode} size={12} />
              <span className="text-white/70 font-medium truncate flex-1">{entry.destination}</span>
              <span className="text-white/45 font-mono">
                {entry.distanceKm.toLocaleString('fr-FR')} km
              </span>
              <span className="text-white/25">✈️ {estimateFlightTime(entry.distanceKm)}</span>
            </div>
          );
        })}
      </div>

      {/* Roadtrip legs détaillés */}
      {kmBreakdown.filter((e) => e.roadtripLegs && e.roadtripLegs.length > 0).map((entry) => (
        <div key={`legs-${entry.tripId}`} className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
            Étapes roadtrip {entry.destination}
          </div>
          {entry.roadtripLegs!.map((leg, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-white/40 ml-4">
              <span>🚗</span>
              <span>{leg.from} → {leg.to}</span>
              <span className="ml-auto font-mono">{leg.km.toLocaleString('fr-FR')} km</span>
            </div>
          ))}
        </div>
      ))}
    </GlassCard>
  );
};

// ─── Badge card ────────────────────────────────────────────────────────────

const BadgeCard = ({ badge, index }: { badge: Badge; index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
    className="rounded-2xl p-4 text-center"
    style={{
      background: badge.unlocked ? 'rgba(124,140,255,0.1)' : COLOR.glass,
      border: badge.unlocked ? '1px solid rgba(124,140,255,0.22)' : `1px solid ${COLOR.border}`,
      opacity: badge.unlocked ? 1 : 0.35,
    }}
  >
    <div className={`text-3xl mb-1 ${badge.unlocked ? '' : 'grayscale'}`}>{badge.emoji}</div>
    <div className="font-semibold text-sm tracking-tight">{badge.label}</div>
    <div className="text-[10px] text-white/40 mt-0.5">{badge.description}</div>
    {badge.progress && !badge.unlocked && (
      <div className="flex items-center justify-center gap-0.5 mt-1">
        {Array.from({ length: badge.progress.target }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: i < badge.progress!.current ? COLOR.upcoming : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
    )}
    <div
      className="text-[10px] font-bold mt-1"
      style={{ color: badge.unlocked ? COLOR.upcoming : 'rgba(255,255,255,0.25)' }}
    >
      +{badge.xp} XP
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT STATSVIEW
// ═══════════════════════════════════════════════════════════════════════════════

type Props = {
  stats: WorldStats;
  badges: Badge[];
  trips: { country: string; countryCode: string; startDate: string; endDate: string }[];
};

export const StatsView = ({ stats, badges, trips }: Props) => {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);
  const totalXP = unlocked.reduce((acc, b) => acc + b.xp, 0);
  const maxXP = badges.reduce((acc, b) => acc + b.xp, 0);

  return (
    <div className="space-y-5">
      {/* XP Progress */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/45 mb-0.5">Niveau Voyageur</div>
            <div className="text-2xl font-bold font-display tracking-tighter">{totalXP} XP</div>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)' }}
          >
            <Star size={20} className="text-white" />
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalXP / maxXP) * 100}%` }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c8cff 0%, #ec4899 100%)' }}
          />
        </div>
        <div className="text-xs text-white/30 mt-1.5">
          {totalXP} / {maxXP} XP · {unlocked.length}/{badges.length} badges débloqués
        </div>
        {/* Prochain badge */}
        {locked.length > 0 && locked[0].progress && (
          <div className="mt-3 text-xs text-white/40">
            Prochain : {locked[0].emoji} {locked[0].label} ({locked[0].progress.current}/{locked[0].progress.target})
          </div>
        )}
      </GlassCard>

      {/* Stats mini grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatMini value={stats.totalTrips} label="Voyages" color={COLOR.upcoming} emoji="✈️" />
        <StatMini value={stats.uniqueCountries} label="Pays" color={COLOR.ongoing} emoji="🌍" />
        <StatMini value={`${(stats.totalKm / 1000).toFixed(0)}k`} label="Km parcourus" color={COLOR.dream} emoji="🚀" />
        <StatMini value={`${stats.pctWorld.toFixed(1)}%`} label="Du monde" color="#ec4899" emoji="🌎" />
      </div>

      {/* Km détaillé */}
      <KmDetail kmBreakdown={stats.kmBreakdown} />

      {/* Monde exploré */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-white/45">Monde exploré</div>
          <div className="text-xs font-bold" style={{ color: COLOR.upcoming }}>
            {stats.pctWorld.toFixed(1)}% — {stats.uniqueCountries}/{stats.totalCountries} pays
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(stats.pctWorld, 0.5)}%` }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c8cff 0%, #56c5a4 50%, #ec4899 100%)' }}
          />
        </div>
        <div className="text-xs text-white/25 mt-1.5">
          Il reste {stats.totalCountries - stats.uniqueCountries} pays à découvrir 🌎
        </div>
      </GlassCard>

      {/* Destination favorite */}
      {stats.favoriteCountry && (
        <GlassCard className="p-5 flex items-center gap-4">
          <div className="text-3xl">🏆</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/45 mb-0.5">Destination favorite</div>
            <div className="font-bold text-lg tracking-tight flex items-center gap-2">
              <Flag code={stats.favoriteCode} size={20} />
              {stats.favoriteCountry}
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              {stats.favoriteCount} voyage{stats.favoriteCount > 1 ? 's' : ''}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Top pays bar chart */}
      <TopCountries trips={trips} />

      {/* Badges débloqués */}
      {unlocked.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40 mb-3 px-1">
            🏅 Badges débloqués ({unlocked.length})
          </div>
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Badges verrouillés */}
      {locked.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-white/25 mb-3 px-1">
            🔒 À débloquer ({locked.length})
          </div>
          <div className="grid grid-cols-3 gap-2">
            {locked.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i + unlocked.length} />
            ))}
          </div>
        </div>
      )}

      {unlocked.length === 0 && (
        <GlassCard className="p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-white/45">Crée ton premier voyage pour débloquer des badges !</p>
        </GlassCard>
      )}
    </div>
  );
};
