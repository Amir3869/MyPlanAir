// src/features/auth/OnboardingFlow.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useTripStore, type AppTheme, USER_EMOJIS } from '../../store/tripStore';
import { CURRENCIES } from '../../api/countries';
import { haptic } from '../../utils/haptic';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type OnboardingStep = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES STATIQUES
// ─────────────────────────────────────────────────────────────────────────────
const THEMES: {
  key:        AppTheme;
  emoji:      string;
  label:      string;
  bg:         string;
  accentFrom: string;
  accentTo:   string;
  accentRgb:  string;
  accentLbl:  string;
}[] = [
  {
    key: 'dark',    emoji: '🌑', label: 'Sombre',
    bg: '#07070b',
    accentFrom: '#7c8cff', accentTo: '#ec4899',
    accentRgb: '124,140,255', accentLbl: '#a5b4fc',
  },
  {
    key: 'myplanair', emoji: '✈️', label: 'My Plan’Air',
    bg: '#07070b',
    accentFrom: '#7C3AED', accentTo: '#FF7A00',
    accentRgb: '124,58,237', accentLbl: '#FDBA74',
  },
  {
    key: 'ocean',   emoji: '🌊', label: 'Océan',
    bg: '#020d1a',
    accentFrom: '#00d4ff', accentTo: '#0066ff',
    accentRgb: '0,212,255', accentLbl: '#67e8f9',
  },
  {
    key: 'sunset',  emoji: '🌅', label: 'Sunset',
    bg: '#0f0608',
    accentFrom: '#ff6b35', accentTo: '#ec4899',
    accentRgb: '255,107,53', accentLbl: '#fdba74',
  },
  {
    key: 'forest',  emoji: '🌿', label: 'Forêt',
    bg: '#040d06',
    accentFrom: '#56c5a4', accentTo: '#00d4ff',
    accentRgb: '86,197,164', accentLbl: '#6ee7b7',
  },
  {
    key: 'minimal', emoji: '⚡', label: 'Minimal',
    bg: '#0d0d0d',
    accentFrom: '#ffffff', accentTo: '#a0a0a0',
    accentRgb: '255,255,255', accentLbl: '#e5e5e5',
  },
];

// ✅ Top 8 devises
const TOP_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'MAD', 'AUD'];

// ─────────────────────────────────────────────────────────────────────────────
// ÉTOILES FIXES — seeds statiques pour éviter re-render StrictMode
// ─────────────────────────────────────────────────────────────────────────────
const STARS = [
  { w: 2.1, h: 2.1, l: 12,  t: 8,  d: 1.2, delay: 0.1 },
  { w: 1.4, h: 1.4, l: 28,  t: 22, d: 1.8, delay: 0.7 },
  { w: 2.5, h: 2.5, l: 45,  t: 5,  d: 1.4, delay: 0.3 },
  { w: 1.8, h: 1.8, l: 63,  t: 18, d: 2.1, delay: 1.1 },
  { w: 1.2, h: 1.2, l: 78,  t: 11, d: 1.6, delay: 0.5 },
  { w: 2.2, h: 2.2, l: 91,  t: 26, d: 1.9, delay: 0.9 },
  { w: 1.6, h: 1.6, l: 18,  t: 72, d: 1.3, delay: 0.4 },
  { w: 1.9, h: 1.9, l: 35,  t: 85, d: 1.7, delay: 0.8 },
  { w: 2.3, h: 2.3, l: 52,  t: 68, d: 2.0, delay: 1.2 },
  { w: 1.5, h: 1.5, l: 69,  t: 78, d: 1.5, delay: 0.6 },
  { w: 1.1, h: 1.1, l: 84,  t: 62, d: 1.8, delay: 1.0 },
  { w: 2.0, h: 2.0, l: 7,   t: 45, d: 1.4, delay: 0.2 },
  { w: 1.7, h: 1.7, l: 24,  t: 58, d: 2.2, delay: 1.3 },
  { w: 1.3, h: 1.3, l: 72,  t: 42, d: 1.6, delay: 0.5 },
  { w: 2.4, h: 2.4, l: 88,  t: 35, d: 1.1, delay: 0.3 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTIS FIXES
// ─────────────────────────────────────────────────────────────────────────────
const CONFETTIS = [
  { s: 7,  c: '#7c8cff', l: 15, t: 25 },
  { s: 10, c: '#ec4899', l: 32, t: 18 },
  { s: 8,  c: '#56c5a4', l: 48, t: 32 },
  { s: 6,  c: '#f0b24a', l: 62, t: 20 },
  { s: 9,  c: '#7c8cff', l: 75, t: 28 },
  { s: 7,  c: '#ec4899', l: 88, t: 15 },
  { s: 11, c: '#56c5a4', l: 22, t: 65 },
  { s: 8,  c: '#f0b24a', l: 40, t: 72 },
  { s: 6,  c: '#7c8cff', l: 55, t: 60 },
  { s: 9,  c: '#ec4899', l: 68, t: 78 },
  { s: 7,  c: '#56c5a4', l: 82, t: 68 },
  { s: 10, c: '#f0b24a', l: 12, t: 80 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// APPLY THEME — applique le thème live pendant l'onboarding
// ─────────────────────────────────────────────────────────────────────────────
const applyThemeLive = (themeKey: AppTheme) => {
  const t = THEMES.find((th) => th.key === themeKey);
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty('--s-base',           t.bg);
  root.style.setProperty('--accent-from',      t.accentFrom);
  root.style.setProperty('--accent-to',        t.accentTo);
  root.style.setProperty('--accent-from-rgb',  t.accentRgb);
  root.style.setProperty('--accent-label',     t.accentLbl);
  document.body.style.background = t.bg;
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGO BRAND
// ─────────────────────────────────────────────────────────────────────────────
const BrandMark = () => (
  <div className="flex items-center gap-2 mb-8">
    <div
      className="w-7 h-7 rounded-xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
        boxShadow:  '0 4px 12px rgba(var(--accent-from-rgb), 0.3)',
      }}
    >
      <span className="text-sm">✈️</span>
    </div>
    <span
      className="font-bold text-sm tracking-tight"
      style={{ color: 'rgba(255,255,255,0.5)' }}
    >
      MyTrip
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP INDICATOR — CSS variables thème
// ─────────────────────────────────────────────────────────────────────────────
const StepIndicator = ({
  current,
  total,
}: {
  current: number;
  total:   number;
}) => (
  <div className="flex items-center gap-2 mb-8">
    {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
      <motion.div
        key={n}
        className="h-1 rounded-full flex-1"
        animate={{
          // ✅ CSS variables thème
          background: n <= current
            ? 'linear-gradient(90deg, var(--accent-from), var(--accent-to))'
            : 'rgba(255,255,255,0.12)',
          opacity: n <= current ? 1 : 0.5,
        }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        style={{
          maxWidth: n === current ? 56 : n < current ? 40 : 24,
        }}
      />
    ))}
    <span className="text-[11px] font-semibold ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
      {current}/{total}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCREEN — inchangé, déjà excellent
// ─────────────────────────────────────────────────────────────────────────────
const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#07070b' }}
    >
      {/* Aurora */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-50" />
      </div>

      {/* Étoiles fixes */}
      {STARS.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width:  star.w,
            height: star.h,
            left:   `${star.l}%`,
            top:    `${star.t}%`,
          }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: star.d,
            repeat:   Infinity,
            delay:    star.delay,
            ease:     'easeInOut',
          }}
        />
      ))}

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        className="relative flex flex-col items-center"
      >
        <motion.div
          className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            boxShadow:  '0 0 80px rgba(124,140,255,0.5), 0 0 160px rgba(236,72,153,0.2)',
          }}
          animate={{
            boxShadow: [
              '0 0 80px rgba(124,140,255,0.5), 0 0 160px rgba(236,72,153,0.2)',
              '0 0 120px rgba(124,140,255,0.7), 0 0 200px rgba(236,72,153,0.35)',
              '0 0 80px rgba(124,140,255,0.5), 0 0 160px rgba(236,72,153,0.2)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="text-5xl"
            animate={{ y: [0, -4, 0], rotate: [-8, -12, -8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✈️
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-6xl font-extrabold tracking-tighter text-white"
        >
          MyTrip
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
          className="text-white/50 text-base mt-2 tracking-wide"
        >
          Tes voyages, sublimés.
        </motion.p>
      </motion.div>

      {/* Barre de chargement */}
      <motion.div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #7c8cff, #ec4899)' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }}
        />
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — PRÉNOM + AVATAR
// ─────────────────────────────────────────────────────────────────────────────
const Step1NameAvatar = ({
  name,
  emoji,
  onNameChange,
  onEmojiChange,
  onNext,
}: {
  name:          string;
  emoji:         string;
  onNameChange:  (v: string) => void;
  onEmojiChange: (v: string) => void;
  onNext:        () => void;
}) => {
  const canNext     = name.trim().length >= 2;
  const displayName = name.trim();

  // ✅ Sélection 16 emojis depuis USER_EMOJIS — cohérent avec SettingsSheet
  const AVATAR_EMOJIS = USER_EMOJIS.slice(0, 16);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="w-full"
    >
      <BrandMark />
      <StepIndicator current={1} total={3} />

      <div className="mb-6">
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-tight">
          Comment tu
          <br />
          <span
            style={{
              background:           'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
            }}
          >
            t'appelles ?
          </span>
        </h2>
        <p className="text-white/45 text-base mt-3 leading-relaxed">
          Pour que MyTrip te parle comme un ami.
        </p>
      </div>

      {/* Input prénom */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-3"
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border:     canNext
              ? '1.5px solid rgba(var(--accent-from-rgb), 0.5)'
              : '1.5px solid rgba(255,255,255,0.1)',
            boxShadow: canNext
              ? '0 0 24px rgba(var(--accent-from-rgb), 0.15)'
              : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canNext) {
                haptic([5, 20, 5]);
                onNext();
              }
            }}
            placeholder="Ton prénom..."
            maxLength={30}
            className="w-full bg-transparent outline-none px-5 py-5 text-2xl font-bold tracking-tight placeholder-white/20"
            style={{
              color: canNext ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
            }}
          />
          {canNext && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              }}
            >
              <Check size={14} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Preview live */}
      <AnimatePresence>
        {canNext && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1   }}
            exit={{ opacity: 0, y: 4, scale: 0.97   }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="mb-4 px-4 py-3 rounded-2xl"
            style={{
              background: 'rgba(var(--accent-from-rgb), 0.08)',
              border:     '1px solid rgba(var(--accent-from-rgb), 0.20)',
            }}
          >
            <p className="text-sm text-white/60 leading-relaxed">
              ✈️{' '}
              <span className="font-semibold" style={{ color: 'var(--accent-label)' }}>
                Bonjour {displayName} !
              </span>
              {' '}Prêt pour ta prochaine aventure ?
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sélecteur avatar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">
          Ton avatar
        </div>
        <div className="grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((e) => {
            const isSelected = emoji === e;
            return (
              <motion.button
                key={e}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  haptic(4);
                  onEmojiChange(e);
                }}
                className="relative flex items-center justify-center rounded-2xl tap"
                style={{
                  height:     48,
                  background: isSelected
                    ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  border: isSelected
                    ? '1px solid rgba(255,255,255,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? '0 4px 16px rgba(var(--accent-from-rgb), 0.35)'
                    : 'none',
                }}
              >
                <span
                  style={{
                    fontSize:   20,
                    lineHeight: 1,
                    fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                  }}
                >
                  {e}
                </span>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#56c5a4', border: '2px solid rgba(7,7,11,1)' }}
                  >
                    <Check size={8} className="text-black" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Bouton continuer */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={!canNext}
        onClick={() => {
          haptic([5, 20, 5]);
          onNext();
        }}
        className="w-full h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-30"
        style={{
          background: canNext
            ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: canNext
            ? '0 8px 32px rgba(var(--accent-from-rgb), 0.35)'
            : 'none',
        }}
      >
        Continuer <ChevronRight size={18} />
      </motion.button>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — DEVISE
// ─────────────────────────────────────────────────────────────────────────────
const Step2Currency = ({
  currency,
  userName,
  onCurrencyChange,
  onNext,
  onBack,
}: {
  currency:         string;
  userName:         string;
  onCurrencyChange: (v: string) => void;
  onNext:           () => void;
  onBack:           () => void;
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll
    ? CURRENCIES
    : CURRENCIES.filter((c) => TOP_CURRENCIES.includes(c.code));

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="w-full"
    >
      <BrandMark />
      <StepIndicator current={2} total={3} />

      <div className="mb-7">
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-tight">
          {userName ? `${userName},` : 'Et'} ta
          <br />
          <span
            style={{
              background:           'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
            }}
          >
            devise ?
          </span>
        </h2>
        <p className="text-white/45 text-base mt-3 leading-relaxed">
          Pour suivre ton budget dans ta monnaie.
        </p>
      </div>

      {/* Grille devises */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-3"
      >
        <div className="grid grid-cols-4 gap-2 mb-2">
          {displayed.map((c) => {
            const isSelected = currency === c.code;
            return (
              <button
                key={c.code}
                onClick={() => {
                  haptic(4);
                  onCurrencyChange(c.code);
                }}
                className="relative rounded-2xl py-3 px-2 flex flex-col items-center gap-1 tap"
                style={{
                  background: isSelected
                    ? 'rgba(var(--accent-from-rgb), 0.18)'
                    : 'rgba(255,255,255,0.04)',
                  border: isSelected
                    ? '1.5px solid rgba(var(--accent-from-rgb), 0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(var(--accent-from-rgb), 0.2)'
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-from)' }}
                  >
                    <Check size={8} className="text-white" strokeWidth={3} />
                  </div>
                )}
                <div
                  className="text-sm font-bold tracking-tight"
                  style={{
                    color: isSelected
                      ? 'var(--accent-label)'
                      : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {c.code}
                </div>
                <div
                  className="text-[10px] font-medium"
                  style={{
                    color: isSelected
                      ? 'rgba(var(--accent-from-rgb), 0.7)'
                      : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {c.symbol}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-white/30 hover:text-white/55 transition tap px-1"
        >
          {showAll
            ? '↑ Afficher moins'
            : `+ Voir toutes les devises (${CURRENCIES.length})`}
        </button>
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => { haptic(6); onBack(); }}
          className="h-14 px-5 rounded-2xl font-semibold tap flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border:     '1px solid rgba(255,255,255,0.1)',
            color:      'rgba(255,255,255,0.7)',
          }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { haptic([5, 20, 5]); onNext(); }}
          className="flex-1 h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
            boxShadow:  '0 8px 32px rgba(var(--accent-from-rgb), 0.35)',
          }}
        >
          Continuer <ChevronRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI PREVIEW — aperçu TripsHub selon thème sélectionné
// ─────────────────────────────────────────────────────────────────────────────
const ThemePreview = ({
  theme,
  userName,
}: {
  theme:    typeof THEMES[number];
  userName: string;
}) => (
  <motion.div
    key={theme.key}
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="rounded-2xl overflow-hidden"
    style={{
      background: theme.bg,
      border:     `1px solid rgba(255,255,255,0.08)`,
      boxShadow:  `0 8px 32px rgba(0,0,0,0.4)`,
    }}
  >
    {/* Barre de statut simulée */}
    <div
      className="px-4 pt-3 pb-2 flex items-center justify-between"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Bonjour {userName || 'Voyageur'} 👋
      </div>
      <div className="flex gap-1.5">
        {['🔔', '🌍', '⚙️'].map((ic) => (
          <div
            key={ic}
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', fontSize: 9 }}
          >
            {ic}
          </div>
        ))}
      </div>
    </div>

    <div className="px-4 py-3">
      {/* Titre */}
      <div
        className="text-base font-extrabold tracking-tighter mb-2"
        style={{ color: 'rgba(255,255,255,0.95)' }}
      >
        Mes Voyages
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 mb-3">
        {['Tous', 'À venir', 'En cours'].map((f, i) => (
          <div
            key={f}
            className="px-2.5 py-1 rounded-full text-[9px] font-semibold"
            style={
              i === 0
                ? {
                    background: `rgba(${theme.accentRgb}, 0.18)`,
                    border:     `1px solid rgba(${theme.accentRgb}, 0.35)`,
                    color:      theme.accentLbl,
                  }
                : {
                    background: 'rgba(255,255,255,0.06)',
                    border:     '1px solid rgba(255,255,255,0.1)',
                    color:      'rgba(255,255,255,0.5)',
                  }
            }
          >
            {f}
          </div>
        ))}
      </div>

      {/* Carte voyage simulée */}
      <div
        className="rounded-xl p-3 mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border:     '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div
            className="text-[10px] font-bold"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            ✈️ Tokyo — Japon
          </div>
          <div
            className="px-2 py-0.5 rounded-full text-[8px] font-semibold"
            style={{
              background: `rgba(${theme.accentRgb}, 0.18)`,
              color:      theme.accentLbl,
            }}
          >
            À venir
          </div>
        </div>
        <div
          className="text-[9px]"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          15 jan → 28 jan · J-12
        </div>
      </div>

      {/* Bouton CTA */}
      <div
        className="w-full py-2 rounded-xl text-center text-[10px] font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
          boxShadow:  `0 4px 16px rgba(${theme.accentRgb}, 0.35)`,
        }}
      >
        + Nouveau voyage
      </div>
    </div>

    {/* Nav bottom simulée */}
    <div
      className="px-3 py-2 flex justify-around"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      {['Aperçu', 'Parcours', 'Budget', 'Prep.'].map((tab, i) => (
        <div
          key={tab}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl"
          style={
            i === 0
              ? {
                  background: `rgba(${theme.accentRgb}, 0.32)`,
                  color:      'white',
                }
              : {
                  color: 'rgba(255,255,255,0.4)',
                }
          }
        >
          <div className="text-[8px] font-semibold">{tab}</div>
        </div>
      ))}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — THÈME + PREVIEW LIVE
// ─────────────────────────────────────────────────────────────────────────────
const Step3Theme = ({
  theme,
  userName,
  onThemeChange,
  onBack,
  onFinish,
}: {
  theme:         AppTheme;
  userName:      string;
  onThemeChange: (v: AppTheme) => void;
  onBack:        () => void;
  onFinish:      () => void;
}) => {
  const currentTheme = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="w-full"
    >
      <BrandMark />
      <StepIndicator current={3} total={3} />

      <div className="mb-6">
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-tight">
          Ton
          <br />
          <span
            style={{
              background:           'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
            }}
          >
            ambiance ?
          </span>
        </h2>
        <p className="text-white/45 text-base mt-3 leading-relaxed">
          Modifiable à tout moment dans les réglages.
        </p>
      </div>

      {/* Sélecteur thèmes */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5"
      >
        <div className="grid grid-cols-5 gap-2">
          {THEMES.map((t) => {
            const isActive = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  haptic(4);
                  onThemeChange(t.key);
                  // ✅ Preview live — le thème change visuellement à la sélection
                  applyThemeLive(t.key);
                }}
                className="relative rounded-2xl p-2.5 flex flex-col items-center gap-2 tap"
                style={{
                  background: isActive ? `${t.accentFrom}15` : 'rgba(255,255,255,0.04)',
                  border:     isActive
                    ? `1.5px solid ${t.accentFrom}50`
                    : '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: t.accentFrom }}
                  >
                    <Check size={8} className="text-black" strokeWidth={3} />
                  </motion.div>
                )}

                {/* Préview couleur */}
                <div
                  className="w-9 h-9 rounded-xl overflow-hidden relative flex-shrink-0"
                  style={{
                    background: t.bg,
                    border:     `1.5px solid ${t.accentFrom}40`,
                    boxShadow:  isActive ? `0 0 16px ${t.accentFrom}40` : 'none',
                  }}
                >
                  <div
                    className="absolute right-0 top-0 w-1/2 h-full"
                    style={{ background: `${t.accentFrom}50` }}
                  />
                  <div
                    className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full"
                    style={{ background: t.accentFrom }}
                  />
                </div>

                <div
                  className="text-[9px] font-bold leading-tight text-center"
                  style={{ color: isActive ? t.accentFrom : 'rgba(255,255,255,0.45)' }}
                >
                  {t.label}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ✅ Preview live mini TripsHub */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="text-xs uppercase tracking-widest text-white/40 mb-2 px-1">
          Aperçu
        </div>
        <ThemePreview theme={currentTheme} userName={userName} />
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => { haptic(6); onBack(); }}
          className="h-14 px-5 rounded-2xl font-semibold tap flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border:     '1px solid rgba(255,255,255,0.1)',
            color:      'rgba(255,255,255,0.7)',
          }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { haptic([5, 30, 10]); onFinish(); }}
          className="flex-1 h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
            boxShadow:  '0 8px 32px rgba(var(--accent-from-rgb), 0.4)',
          }}
        >
          <Sparkles size={18} />
          C'est parti, {userName || 'Voyageur'} !
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN FINAL — inchangé, déjà excellent
// ─────────────────────────────────────────────────────────────────────────────
const FinaleScreen = ({ userName }: { userName: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1   }}
    exit={{ opacity: 0,   scale: 1.1  }}
    transition={{ type: 'spring', damping: 18, stiffness: 200 }}
    className="fixed inset-0 z-[400] flex flex-col items-center justify-center overflow-hidden"
    style={{ background: '#07070b' }}
  >
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="aurora opacity-60" />
    </div>

    <div className="relative flex flex-col items-center gap-6 text-center px-8">
      {CONFETTIS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:      c.s,
            height:     c.s,
            background: c.c,
            left:       `${c.l}%`,
            top:        `${c.t}%`,
          }}
          initial={{ opacity: 0, scale: 0, y: 0  }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: -80 }}
          transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="text-8xl"
      >
        🎉
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-display text-4xl font-extrabold tracking-tighter mb-2">
          Bienvenue, {userName} !
        </h2>
        <p className="text-white/55 text-base">
          Ton aventure commence maintenant ✨
        </p>
      </motion.div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING FLOW — COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const completeOnboarding = useTripStore((s) => s.completeOnboarding);
  const setUserEmoji       = useTripStore((s) => s.setUserEmoji);

  const [phase,    setPhase]    = useState<'splash' | 'onboarding' | 'finale'>('splash');
  const [step,     setStep]     = useState<OnboardingStep>(1);
  const [userName, setUserName] = useState('');
  const [emoji, setEmoji] = useState<string>(USER_EMOJIS[0]);
  const [currency, setCurrency] = useState('EUR');
  const [theme,    setTheme]    = useState<AppTheme>('dark');

  const goNext = () => {
    if (step < 3) setStep((s) => (s + 1) as OnboardingStep);
  };

  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as OnboardingStep);
  };

  const handleFinish = () => {
    // ✅ Sauvegarde prénom + style + devise + thème
    completeOnboarding({
      userName:     userName.trim() || 'Voyageur',
      travelStyle:  'solo', // valeur neutre — supprimé du flow visible
      homeCurrency: currency,
      theme,
    });
    // ✅ Sauvegarde emoji avatar séparément
    setUserEmoji(emoji);

    setPhase('finale');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <>
      {/* Splash */}
      <AnimatePresence>
        {phase === 'splash' && (
          <SplashScreen onDone={() => setPhase('onboarding')} />
        )}
      </AnimatePresence>

      {/* Finale */}
      <AnimatePresence>
        {phase === 'finale' && (
          <FinaleScreen userName={userName.trim() || 'Voyageur'} />
        )}
      </AnimatePresence>

      {/* Onboarding steps */}
      {phase === 'onboarding' && (
        <div
          className="min-h-screen relative flex items-center justify-center overflow-hidden"
          style={{ background: '#07070b' }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="aurora opacity-30" />
          </div>

          {/* Particules fixes */}
          {[15, 25, 35, 45, 55, 65, 75, 85].map((left, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width:      2,
                height:     2,
                background: 'rgba(255,255,255,0.4)',
                left:       `${left}%`,
                top:        `${20 + (i % 3) * 25}%`,
              }}
              animate={{ opacity: [0, 0.6, 0], y: [0, -20, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}

          <div className="relative z-10 w-full max-w-md px-6 py-12 min-h-screen flex flex-col justify-center overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <Step1NameAvatar
                  name={userName}
                  emoji={emoji}
                  onNameChange={setUserName}
                  onEmojiChange={setEmoji}
                  onNext={goNext}
                />
              )}
              {step === 2 && (
                <Step2Currency
                  currency={currency}
                  userName={userName.trim() || 'Voyageur'}
                  onCurrencyChange={setCurrency}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              {step === 3 && (
                <Step3Theme
                  theme={theme}
                  userName={userName.trim() || 'Voyageur'}
                  onThemeChange={setTheme}
                  onBack={goBack}
                  onFinish={handleFinish}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
};