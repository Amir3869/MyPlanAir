// src/features/settings/SettingsSheet.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Palette, BarChart3,
  Download, Trash2, Info, Star,
  Share2, LogOut, Check, AlertTriangle, Edit3,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useTripStore, type AppTheme, USER_EMOJIS } from '../../store/tripStore';
import { BottomSheet } from '../../shared/BottomSheet';
import { CURRENCIES } from '../../api/countries';
import { useToast } from '../../shared/Toast';
import { tripStatus } from '../../utils/dateHelpers';

// ── Thèmes disponibles ─────────────────────────────────────────────────────
const THEMES: {
  key:        AppTheme;
  label:      string;
  emoji:      string;
  base:       string;
  accentFrom: string;
  accentTo:   string;
  accentRgb:  string;
  accentLbl:  string;
}[] = [
  {
    key: 'dark',    label: 'Sombre',  emoji: '🌑',
    base: '#07070b',
    accentFrom: '#7c8cff', accentTo: '#ec4899',
    accentRgb: '124,140,255', accentLbl: '#a5b4fc',
  },
  {
    key: 'ocean',   label: 'Océan',   emoji: '🌊',
    base: '#020d1a',
    accentFrom: '#00d4ff', accentTo: '#0066ff',
    accentRgb: '0,212,255',  accentLbl: '#67e8f9',
  },
  {
    key: 'sunset',  label: 'Sunset',  emoji: '🌅',
    base: '#0f0608',
    accentFrom: '#ff6b35', accentTo: '#ec4899',
    accentRgb: '255,107,53', accentLbl: '#fdba74',
  },
  {
    key: 'forest',  label: 'Forêt',   emoji: '🌿',
    base: '#040d06',
    accentFrom: '#56c5a4', accentTo: '#00d4ff',
    accentRgb: '86,197,164', accentLbl: '#6ee7b7',
  },
  {
    key: 'minimal', label: 'Minimal', emoji: '⚡',
    base: '#0d0d0d',
    accentFrom: '#ffffff', accentTo: '#a0a0a0',
    accentRgb: '255,255,255', accentLbl: '#e5e5e5',
  },
];

// ── Applique le thème via CSS variables sur <html> ─────────────────────────
const applyTheme = (theme: AppTheme) => {
  const t = THEMES.find((th) => th.key === theme);
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty('--s-base',   t.base);
  root.style.setProperty('--c-night',  t.accentFrom);
  root.style.setProperty('--c-accent', t.accentFrom);
  document.body.style.background = t.base;
  root.style.setProperty('--accent-from',     t.accentFrom);
  root.style.setProperty('--accent-to',       t.accentTo);
  root.style.setProperty('--accent-from-rgb', t.accentRgb);
  root.style.setProperty('--accent-label',    t.accentLbl);
};

// ── Picker emoji premium ───────────────────────────────────────────────────
const EmojiPicker = ({
  current,
  onSelect,
  onClose,
}: {
  current:  string;
  onSelect: (emoji: string) => void;
  onClose:  () => void;
}) => {
  const categories = [
    { label: '✈️ Voyage',    emojis: USER_EMOJIS.slice(0, 10)  },
    { label: '☕ Lifestyle', emojis: USER_EMOJIS.slice(10, 20) },
    { label: '✨ Ambiance',  emojis: USER_EMOJIS.slice(20, 30) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="w-full max-w-lg overflow-hidden"
        style={{
          borderRadius:   '28px 28px 0 0',
          background:     'rgba(14,14,22,0.98)',
          border:         '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
          boxShadow:      '0 -24px 80px rgba(0,0,0,0.6)',
          paddingBottom:  'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />
        </div>

        {/* Title */}
        <div className="px-6 pb-4 pt-1">
          <h3 className="font-bold text-lg tracking-tight">Votre avatar</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Choisissez l'emoji qui vous représente le mieux
          </p>
        </div>

        {/* Catégories */}
        <div className="px-4 pb-6 space-y-5">
          {categories.map((cat) => (
            <div key={cat.label}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">
                {cat.label}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {cat.emojis.map((emoji) => {
                  const isSelected = emoji === current;
                  return (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { onSelect(emoji); onClose(); }}
                      className="relative flex items-center justify-center rounded-2xl tap"
                      style={{
                        height:     64,
                        background: isSelected
                          ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                          : 'rgba(255,255,255,0.06)',
                        border: isSelected
                          ? '1px solid rgba(255,255,255,0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isSelected
                          ? '0 8px 24px rgba(var(--accent-from-rgb, 124,140,255), 0.4)'
                          : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize:   28,
                          lineHeight: 1,
                          fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                        }}
                      >
                        {emoji}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: '#56c5a4', border: '2px solid rgba(14,14,22,1)' }}
                        >
                          <Check size={10} className="text-black" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Statistiques voyage ────────────────────────────────────────────────────
const StatsSheet = ({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) => {
  const trips = useTripStore((s) => s.trips);

  const totalTrips      = trips.length;
  const ongoingTrips    = trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'ongoing').length;
  const finishedTrips   = trips.filter((t) => tripStatus(t.startDate, t.endDate) === 'finished').length;
  const uniqueCountries = new Set(trips.map((t) => t.countryCode)).size;
  const totalSpent      = trips.reduce(
    (sum, t) => sum + t.expenses.reduce((s, e) => s + e.amount, 0),
    0,
  );

  const countryCount = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.country] = (acc[t.country] ?? 0) + 1;
    return acc;
  }, {});
  const favoriteCountry = Object.entries(countryCount).sort(
    ([, a], [, b]) => b - a,
  )[0];

  return (
    <BottomSheet open={open} onClose={onClose} title="Mes statistiques">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Voyages créés', value: totalTrips,      color: '#7c8cff' },
            { label: 'En cours',      value: ongoingTrips,    color: '#56c5a4' },
            { label: 'Terminés',      value: finishedTrips,   color: '#f0b24a' },
            { label: 'Pays visités',  value: uniqueCountries, color: '#ec4899' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center"
              style={{
                background: `${color}15`,
                border:     `1px solid ${color}30`,
              }}
            >
              <div
                className="text-3xl font-bold font-display tracking-tighter"
                style={{ color }}
              >
                {value}
              </div>
              <div className="text-xs text-white/55 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {totalSpent > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(240,178,74,0.1)',
              border:     '1px solid rgba(240,178,74,0.2)',
            }}
          >
            <div className="text-xs text-white/55 uppercase tracking-wider mb-1">
              Total dépensé (toutes devises)
            </div>
            <div className="text-2xl font-bold font-display" style={{ color: '#f0b24a' }}>
              {Math.round(totalSpent).toLocaleString('fr-FR')} (multi-devises)
            </div>
          </div>
        )}

        {favoriteCountry && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="text-2xl">🏆</div>
            <div>
              <div className="text-xs text-white/55 uppercase tracking-wider">
                Destination favorite
              </div>
              <div className="font-semibold tracking-tight">
                {favoriteCountry[0]} ({favoriteCountry[1]} voyage
                {favoriteCountry[1] > 1 ? 's' : ''})
              </div>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

// ── Composant principal ────────────────────────────────────────────────────
export const SettingsSheet = ({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) => {
  // ✅ Clerk signOut
  const { signOut } = useClerk();

  const userName        = useTripStore((s) => s.userName);
  const userEmoji       = useTripStore((s) => s.userEmoji);
  const homeCurrency    = useTripStore((s) => s.homeCurrency);
  const theme           = useTripStore((s) => s.theme);
  const trips           = useTripStore((s) => s.trips);
  const setUserName     = useTripStore((s) => s.setUserName);
  const setUserEmoji    = useTripStore((s) => s.setUserEmoji);
  const setHomeCurrency = useTripStore((s) => s.setHomeCurrency);
  const setTheme        = useTripStore((s) => s.setTheme);
  const setAuthed       = useTripStore((s) => s.setAuthed);
  const { success, info } = useToast();

  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState(userName);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [statsOpen,    setStatsOpen]    = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [emojiOpen,    setEmojiOpen]    = useState(false);

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) {
      setUserName(trimmed);
      success(`Bonjour ${trimmed} ! 👋`);
    }
    setEditingName(false);
  };

  const handleTheme = (t: AppTheme) => {
    setTheme(t);
    applyTheme(t);
    info(`Thème ${THEMES.find((th) => th.key === t)?.label} activé`);
  };

  const exportData = () => {
    const data = JSON.stringify({ trips, exportedAt: new Date().toISOString() }, null, 2);
    const blob  = new Blob([data], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `mytrip-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Données exportées avec succès !');
  };

  const clearData = () => {
    localStorage.removeItem('mytrip-store-v1');
    window.location.reload();
  };

  const shareApp = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Plan’Air — Carnet de voyage premium',
          text:  'Organisez vos voyages avec style et intelligence. Gratuit !',
          url:   window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        success('Lien copié !');
      }
    } catch {
      // Annulé par l'utilisateur
    }
  };

  // ✅ Déconnexion Clerk réelle
  const handleSignOut = async () => {
    try {
      setAuthed(false);
      await signOut();
    } catch {
      // Si Clerk échoue, on force quand même la déconnexion locale
      setAuthed(false);
    }
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Réglages">
        <div className="space-y-5">

          {/* ── Profil ── */}
          <section>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 px-1">
              Profil
            </div>
            <div
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Avatar emoji cliquable */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setEmojiOpen(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative tap"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                  boxShadow:  '0 4px 16px rgba(var(--accent-from-rgb, 124,140,255), 0.35)',
                }}
                aria-label="Changer l'avatar"
              >
                <span
                  style={{
                    fontSize:   26,
                    lineHeight: 1,
                    fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                  }}
                >
                  {userEmoji}
                </span>
                {/* Badge édition */}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(14,14,22,0.95)',
                    border:     '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <Edit3 size={9} className="text-white/70" />
                </div>
              </motion.button>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    onBlur={saveName}
                    className="w-full bg-transparent outline-none font-semibold text-lg tracking-tight border-b border-white/30 pb-0.5"
                    maxLength={30}
                  />
                ) : (
                  <div className="font-semibold text-lg tracking-tight truncate">
                    {userName}
                  </div>
                )}
                <div className="text-sm text-white/45">Voyageur My Plan’Air</div>
              </div>

              <button
                onClick={() => {
                  setNameInput(userName);
                  setEditingName(true);
                }}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center tap flex-shrink-0"
                aria-label="Modifier le prénom"
              >
                <Edit3 size={15} />
              </button>
            </div>
          </section>

          {/* ── Préférences ── */}
          <section>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 px-1">
              Préférences
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <button
                onClick={() => setCurrencyOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(240,178,74,0.2)' }}
                >
                  <Coins size={15} style={{ color: '#f0b24a' }} />
                </div>
                <span className="flex-1 text-left font-medium">Devise principale</span>
                <span className="text-white/55 font-semibold text-sm">{homeCurrency}</span>
                <span className="text-white/30 text-xs">›</span>
              </button>
            </div>
          </section>

          {/* ── Thèmes ── */}
          <section>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 px-1 flex items-center gap-2">
              <Palette size={12} />
              Thème
            </div>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTheme(t.key)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl tap transition"
                  style={{
                    background: theme === t.key
                      ? `${t.accentFrom}25`
                      : 'rgba(255,255,255,0.05)',
                    border: theme === t.key
                      ? `1px solid ${t.accentFrom}60`
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-[10px] font-medium text-white/70 truncate w-full text-center">
                    {t.label}
                  </span>
                  {theme === t.key && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: t.accentFrom }}
                    >
                      <Check size={10} className="text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* ── Données ── */}
          <section>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 px-1">
              Mes données
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <button
                onClick={() => setStatsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition border-b border-white/5"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,140,255,0.2)' }}
                >
                  <BarChart3 size={15} style={{ color: '#7c8cff' }} />
                </div>
                <span className="flex-1 text-left font-medium">Statistiques voyage</span>
                <span className="text-white/30 text-xs">›</span>
              </button>

              <button
                onClick={exportData}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition border-b border-white/5"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(86,197,164,0.2)' }}
                >
                  <Download size={15} style={{ color: '#56c5a4' }} />
                </div>
                <span className="flex-1 text-left font-medium">Exporter mes voyages</span>
                <span className="text-white/45 text-xs">JSON</span>
              </button>

              <button
                onClick={() => setClearConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.15)' }}
                >
                  <Trash2 size={15} style={{ color: '#ef4444' }} />
                </div>
                <span className="flex-1 text-left font-medium text-red-400">
                  Effacer toutes les données
                </span>
              </button>
            </div>
          </section>

          {/* ── À propos ── */}
          <section>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 px-1">
              À propos
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <Info size={15} className="text-white/60" />
                </div>
                <span className="flex-1 font-medium">Version</span>
                <span className="text-white/45 text-sm font-mono">1.0.0</span>
              </div>

              <button
                onClick={() => window.open('mailto:support@mytrip.app?subject=Avis My Plan’Air', '_blank')}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition border-b border-white/5"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(240,178,74,0.2)' }}
                >
                  <Star size={15} style={{ color: '#f0b24a' }} />
                </div>
                <span className="flex-1 text-left font-medium">Donner un avis</span>
                <span className="text-white/30 text-xs">›</span>
              </button>

              <button
                onClick={shareApp}
                className="w-full flex items-center gap-3 px-4 py-3.5 tap hover:bg-white/5 transition"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,140,255,0.2)' }}
                >
                  <Share2 size={15} style={{ color: '#7c8cff' }} />
                </div>
                <span className="flex-1 text-left font-medium">Partager My Plan’Air</span>
                <span className="text-white/30 text-xs">›</span>
              </button>
            </div>
          </section>

          {/* ── Déconnexion ── */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSignOut}
            className="w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 tap"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border:     '1px solid rgba(239,68,68,0.2)',
              color:      '#ef4444',
            }}
          >
            <LogOut size={16} />
            Se déconnecter
          </motion.button>

        </div>
      </BottomSheet>

      {/* ── Sélecteur devise ── */}
      <BottomSheet
        open={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        title="Devise principale"
      >
        <div className="max-h-80 overflow-y-auto space-y-1">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setHomeCurrency(c.code);
                setCurrencyOpen(false);
                success(`Devise ${c.code} sélectionnée`);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl tap transition hover:bg-white/5"
              style={{
                background: homeCurrency === c.code
                  ? 'rgba(124,140,255,0.15)'
                  : 'transparent',
              }}
            >
              <div>
                <span className="font-semibold mr-2">{c.code}</span>
                <span className="text-sm text-white/55">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40">{c.symbol}</span>
                {homeCurrency === c.code && (
                  <Check size={15} style={{ color: '#7c8cff' }} />
                )}
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ── Confirmation effacement ── */}
      <AnimatePresence>
        {clearConfirm && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setClearConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-sm rounded-3xl p-6 text-center"
              style={{
                background:     'rgba(20,20,28,0.95)',
                border:         '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(32px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <AlertTriangle size={26} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">
                Effacer toutes les données ?
              </h2>
              <p className="text-sm text-white/55 mb-6 leading-relaxed">
                Tous vos voyages, dépenses et notes seront définitivement supprimés.
                Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setClearConfirm(false)}
                  className="flex-1 h-12 rounded-2xl font-semibold text-white/80 tap"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={clearData}
                  className="flex-1 h-12 rounded-2xl font-semibold text-white tap"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  }}
                >
                  Effacer tout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ── */}
      <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)} />

      {/* ── Emoji picker ── */}
      <AnimatePresence>
        {emojiOpen && (
          <EmojiPicker
            current={userEmoji}
            onSelect={(emoji) => {
              setUserEmoji(emoji);
              success(`Avatar mis à jour !`);
            }}
            onClose={() => setEmojiOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
