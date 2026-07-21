// src/shared/NavTabBar.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Barre de navigation principale — 4 onglets + FAB central (page Voyages)
// [🏠 Accueil] [✈️ Voyages] [➕] [🔍 Découvrir] [👤 Profil]
// FAB intégré dans la barre, dépasse 8px, visible uniquement sur /voyages
// Design glass-strong flottant avec rounded-[28px]
// ═══════════════════════════════════════════════════════════════════════════════

import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Plane, Search, User, Plus } from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { haptic } from '../utils/haptic';

type TabDef = {
  path:        string;
  label:       string;
  icon:        typeof Home;
  matchPrefix?: string;
};

const TABS: TabDef[] = [
  { path: '/',          label: 'Accueil',   icon: Home },
  { path: '/voyages',   label: 'Voyages',   icon: Plane, matchPrefix: '/voyages' },
  { path: '/decouvrir', label: 'Découvrir', icon: Search },
  { path: '/profil',    label: 'Profil',    icon: User },
];

export const NavTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const triggerFabCreate = useTripStore((s) => s.triggerFabCreate);

  const isActive = (tab: TabDef): boolean => {
    if (tab.matchPrefix) return pathname.startsWith(tab.matchPrefix);
    return pathname === tab.path;
  };

  // FAB visible uniquement sur la page Voyages
  const showFab = pathname.startsWith('/voyages');

  const handleFabClick = () => {
    haptic(8);
    triggerFabCreate();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe" aria-label="Navigation principale">
      <div className="max-w-3xl mx-auto px-4 pb-2">
        <div className="glass-strong rounded-[28px] p-1.5 flex items-center">
          {/* Tab 1: Accueil */}
          <NavTab tab={TABS[0]} active={isActive(TABS[0])} navigate={navigate} />

          {/* Tab 2: Voyages */}
          <NavTab tab={TABS[1]} active={isActive(TABS[1])} navigate={navigate} />

          {/* ── FAB intégré — uniquement page Voyages ── */}
          <AnimatePresence>
            {showFab && (
              <motion.button
                key="fab-nav"
                initial={{ scale: 0, opacity: 0, marginTop: 0 }}
                animate={{ scale: 1, opacity: 1, marginTop: -8 }}
                exit={{ scale: 0, opacity: 0, marginTop: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                whileTap={{ scale: 0.88 }}
                onClick={handleFabClick}
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center tap relative z-10"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                  boxShadow: '0 4px 24px rgba(var(--accent-from-rgb, 124,140,255), 0.40), 0 0 0 2px rgba(255,255,255,0.12) inset',
                }}
                aria-label="Créer un voyage"
              >
                <Plus size={20} className="text-white" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Tab 3: Découvrir */}
          <NavTab tab={TABS[2]} active={isActive(TABS[2])} navigate={navigate} />

          {/* Tab 4: Profil */}
          <NavTab tab={TABS[3]} active={isActive(TABS[3])} navigate={navigate} />
        </div>
      </div>
    </nav>
  );
};

// ─── Tab Button ──────────────────────────────────────────────────────────────

const NavTab = ({ tab, active, navigate }: {
  tab: TabDef;
  active: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const Icon = tab.icon;

  return (
    <button
      onClick={() => {
        if (!active) haptic(4);
        navigate(tab.path);
      }}
      className="relative flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[22px] tap transition"
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.div
          layoutId="mainNavPill"
          className="absolute inset-0 rounded-[22px]"
          style={{
            background:         'rgba(var(--accent-from-rgb), 0.32)',
            border:             '1px solid rgba(255,255,255,0.15)',
            backdropFilter:     'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        />
      )}

      <Icon
        size={20}
        className="relative"
        style={{
          color: active ? 'white' : 'rgba(255,255,255,0.55)',
          transition: 'color 0.2s',
        }}
      />
      <span
        className="relative text-[10px] font-semibold tracking-tight"
        style={{
          color: active ? 'white' : 'rgba(255,255,255,0.55)',
          transition: 'color 0.2s',
        }}
      >
        {tab.label}
      </span>
    </button>
  );
};
