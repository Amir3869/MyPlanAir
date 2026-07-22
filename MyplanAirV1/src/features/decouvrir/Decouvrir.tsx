// src/features/decouvrir/Decouvrir.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Page Découvrir — Route "/decouvrir"
// V1 : Recherche + Destinations populaires + Planificateur IA bientôt
//     + Hub catégories (bottom sheet) avec logos Clearbit + fallback
// Design HARMONISÉ avec les autres pages (GlassCard, aurora, titres)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTripStore, type Trip } from '../../store/tripStore';
import { nameToHue, nameToInitials } from '../../store/types';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import { PlannerCreateSheet } from './PlannerCreateSheet';
import { TravelPrepSheet } from '../travelPrep/TravelPrepSheet';
import { createPlannerTrip } from './plannerCreateTrip';
import { PlannerForm } from './PlannerForm';
import { PlannerResults } from './PlannerResults';
import { fetchPlanner } from './plannerApi';
import type { PlannerApiFailure } from './plannerApi';
import { generatePlannerDemoSuggestions } from './plannerFallback';
import type { PlannerRequest, PlannerSuggestion } from './plannerTypes';

// ─── Partenaires (18) ────────────────────────────────────────────────────────

type Partner = {
  name: string;
  domain: string;
  url: string;
  letter: string;
  color: string;
  category: string;
  description: string;
  logoScale?: number;
};

const PARTNERS: Partner[] = [
  { name: 'Skyscanner',    domain: 'skyscanner.com',    url: 'https://www.skyscanner.com',    letter: 'S', color: '#0770e3', category: 'Vols',        description: 'Comparer les prix' },
  { name: 'Kayak',         domain: 'kayak.com',         url: 'https://www.kayak.com',         letter: 'K', color: '#ff690f', category: 'Vols',        description: 'Rechercher des vols' },
  { name: 'Booking',       domain: 'booking.com',       url: 'https://www.booking.com',       letter: 'B', color: '#003580', category: 'Hébergement', description: 'Hôtels & séjours' },
  { name: 'Airbnb',        domain: 'airbnb.com',        url: 'https://www.airbnb.com',        letter: 'A', color: '#ff5a5f', category: 'Hébergement', description: 'Locations uniques' },
  { name: 'StayforLong',   domain: 'stayforlong.com',   url: 'https://www.stayforlong.com',   letter: 'S', color: '#1a73e8', category: 'Hébergement', description: 'Séjours longs' },
  { name: 'RentalCars',    domain: 'rentalcars.com',    url: 'https://www.rentalcars.com',    letter: 'R', color: '#ff9500', category: 'Mobilité',    description: 'Location voiture' },
  { name: 'Discover Cars', domain: 'discovercars.com',  url: 'https://www.discovercars.com',  letter: 'D', color: '#2ecc71', category: 'Mobilité',    description: 'Comparer locations' },
  { name: 'Holafly',       domain: 'holafly.com',       url: 'https://www.holafly.com',       letter: 'H', color: '#00d4aa', category: 'eSIM',        description: 'eSIM illimité' },
  { name: 'Airalo',        domain: 'airalo.com',        url: 'https://www.airalo.com',        letter: 'A', color: '#3b82f6', category: 'eSIM',        description: 'eSIM abordables' },
  { name: 'Heymondo',      domain: 'heymondo.com',      url: 'https://www.heymondo.com',      letter: 'H', color: '#4ade80', category: 'Assurance',   description: 'Assurance voyage' },
  { name: 'SafetyWing',    domain: 'safetywing.com',    url: 'https://www.safetywing.com',    letter: 'S', color: '#6366f1', category: 'Assurance',   description: 'Assurance nomade' },
  { name: 'Amazon',        domain: 'amazon.com',        url: 'https://www.amazon.com',        letter: 'A', color: '#ff9900', category: 'Shopping',    description: 'Accessoires voyage' },
  { name: 'AliExpress',    domain: 'aliexpress.com',    url: 'https://www.aliexpress.com',    letter: 'A', color: '#e62e04', category: 'Shopping',    description: 'Prix bas garantis', logoScale: 1.24 },
  { name: 'GetYourGuide',  domain: 'getyourguide.com',  url: 'https://www.getyourguide.com',  letter: 'G', color: '#ff6600', category: 'Activités',   description: 'Tours & excursions', logoScale: 1.22 },
  { name: 'Viator',        domain: 'viator.com',        url: 'https://www.viator.com',        letter: 'V', color: '#d4000e', category: 'Activités',   description: 'Expériences voyage' },
  { name: 'Revolut',       domain: 'revolut.com',       url: 'https://www.revolut.com',       letter: 'R', color: '#0075eb', category: 'Banque',      description: 'Multi-devises' },
  { name: 'N26',           domain: 'n26.com',           url: 'https://www.n26.com',           letter: 'N', color: '#36a18b', category: 'Banque',      description: 'Banque mobile' },
  { name: 'Wise',          domain: 'wise.com',          url: 'https://www.wise.com',          letter: 'W', color: '#9fe870', category: 'Banque',      description: 'Transferts internationaux' },
];

// ─── Catégories ──────────────────────────────────────────────────────────────

type CategoryDef = {
  key: string;
  emoji: string;
  color: string;
  bgGradient: string;
};

const CATEGORY_DEFS: CategoryDef[] = [
  { key: 'Vols',        emoji: '✈️', color: '#0770e3', bgGradient: 'linear-gradient(135deg, rgba(7,112,227,0.18) 0%, rgba(7,112,227,0.04) 100%)' },
  { key: 'Hébergement', emoji: '🏨', color: '#003580', bgGradient: 'linear-gradient(135deg, rgba(0,53,128,0.22) 0%, rgba(0,53,128,0.05) 100%)' },
  { key: 'Mobilité',    emoji: '🚗', color: '#ff9500', bgGradient: 'linear-gradient(135deg, rgba(255,149,0,0.18) 0%, rgba(255,149,0,0.04) 100%)' },
  { key: 'eSIM',        emoji: '📶', color: '#00d4aa', bgGradient: 'linear-gradient(135deg, rgba(0,212,170,0.18) 0%, rgba(0,212,170,0.04) 100%)' },
  { key: 'Assurance',   emoji: '🛡️', color: '#4ade80', bgGradient: 'linear-gradient(135deg, rgba(74,222,128,0.18) 0%, rgba(74,222,128,0.04) 100%)' },
  { key: 'Shopping',    emoji: '📦', color: '#ff9900', bgGradient: 'linear-gradient(135deg, rgba(255,153,0,0.18) 0%, rgba(255,153,0,0.04) 100%)' },
  { key: 'Activités',   emoji: '🎟️', color: '#ff6600', bgGradient: 'linear-gradient(135deg, rgba(255,102,0,0.18) 0%, rgba(255,102,0,0.04) 100%)' },
  { key: 'Banque',      emoji: '💳', color: '#0075eb', bgGradient: 'linear-gradient(135deg, rgba(0,117,235,0.18) 0%, rgba(0,117,235,0.04) 100%)' },
];

// ─── Partner Logo — Logo.dev + fallback favicon + lettre ────────────────────

const LOGO_DEV_KEY = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY;

const buildPartnerLogoUrl = (domain: string): string => {
  if (LOGO_DEV_KEY) {
    const params = new URLSearchParams({
      token: LOGO_DEV_KEY,
      format: 'webp',
      retina: 'true',
      size: '256',
    });
    return `https://img.logo.dev/${domain}?${params.toString()}`;
  }

  // Fallback si la variable Vercel/local n’est pas encore présente.
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
};

const PartnerLogo = ({ partner, size = 40 }: { partner: Partner; size?: number }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = buildPartnerLogoUrl(partner.domain);
  const s = `${size}px`;

  if (logoFailed) {
    return (
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: s, height: s, background: `${partner.color}20`, border: `1px solid ${partner.color}35` }}
      >
        <span className="font-bold" style={{ color: partner.color, fontSize: size > 40 ? 18 : 15 }}>{partner.letter}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: s, height: s, background: 'rgba(255,255,255,0.92)', padding: size > 40 ? 2 : 1 }}
    >
      <img
        src={logoUrl}
        alt={partner.name}
        className="w-full h-full object-contain"
        style={{ transform: `scale(${partner.logoScale ?? 1.16})` }}
        onError={() => setLogoFailed(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

// ─── Composant Découvrir ─────────────────────────────────────────────────────

export const Decouvrir = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  const userName         = useTripStore((s) => s.userName);
  const userEmoji        = useTripStore((s) => s.userEmoji);
  const userPhotoUrl     = useTripStore((s) => s.userPhotoUrl);
  const homeCurrency     = useTripStore((s) => s.homeCurrency);
  const homeCity         = useTripStore((s) => s.homeCity);
  const homeLat          = useTripStore((s) => s.homeLat);
  const homeLon          = useTripStore((s) => s.homeLon);
  const travelStyle      = useTripStore((s) => s.travelStyle);
  const addTrip          = useTripStore((s) => s.addTrip);

  const [sheetCategory, setSheetCategory] = useState<CategoryDef | null>(null);
  const [plannerOnline, setPlannerOnline] = useState(() => navigator.onLine);
  const [plannerExpanded, setPlannerExpanded] = useState(false);
  const plannerRef = useRef<HTMLDivElement>(null);

  // Auto-open Planner si navigation depuis Home empty (state.openPlanner)
  useEffect(() => {
    const state = location.state as { openPlanner?: boolean } | null;
    if (state?.openPlanner && !plannerExpanded) {
      setPlannerExpanded(true);
      // scroll smooth vers le planner après le rendu
      setTimeout(() => {
        plannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      // clean l'history state pour éviter réouverture au back
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [plannerBudget, setPlannerBudget] = useState(1200);
  const [plannerSuggestions, setPlannerSuggestions] = useState<PlannerSuggestion[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState<PlannerApiFailure | null>(null);
  const [plannerSource, setPlannerSource] = useState<'ai' | 'demo' | null>(null);
  const [createSuggestion, setCreateSuggestion] = useState<PlannerSuggestion | null>(null);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [creationStep, setCreationStep] = useState<'idle' | 'photo' | 'checklist' | 'itinerary' | 'saving' | 'done'>('idle');

  // Avatar
  const clerkPhoto = user?.imageUrl ?? null;
  const avatarUrl  = userPhotoUrl ?? clerkPhoto;
  const initials   = nameToInitials(userName);
  const hue        = nameToHue(userName);

  useEffect(() => {
    const updateOnline = () => setPlannerOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);



  // Ouvrir bottom sheet catégorie
  const openSheet = (cat: CategoryDef) => {
    haptic(5);
    setSheetCategory(cat);
  };

  const closeSheet = () => {
    haptic(3);
    setSheetCategory(null);
  };

  // Ouvrir partenaire
  const openPartner = (url: string) => {
    haptic(5);
    window.open(url, '_blank', 'noopener,noreferrer');
    closeSheet();
  };



  const handlePlannerGenerate = async (request: PlannerRequest) => {
    if (!plannerOnline || plannerLoading) return;

    setPlannerExpanded(true);
    setPlannerBudget(request.budget);
    setPlannerError(null);
    setPlannerLoading(true);

    const result = await fetchPlanner(request);

    if (result.ok) {
      setPlannerSuggestions(result.suggestions);
      setPlannerSource('ai');
      setPlannerLoading(false);
      return;
    }

    // Si le planificateur IA est temporairement indisponible, on garde un aperçu UI explicite.
    // Hors-ligne reste bloqué dans PlannerForm : pas de fausse IA locale.
    if (result.reason === 'planner_unavailable') {
      setPlannerSuggestions(generatePlannerDemoSuggestions(request));
      setPlannerSource('demo');
      setPlannerError({
        ...result,
        message: 'Aperçu de démonstration : le planificateur IA est temporairement indisponible.',
      });
      setPlannerLoading(false);
      return;
    }

    setPlannerSuggestions([]);
    setPlannerSource(null);
    setPlannerError(result);
    setPlannerLoading(false);
  };

  const clearPlannerSuggestions = () => {
    haptic(4);
    setPlannerSuggestions([]);
    setPlannerError(null);
    setPlannerSource(null);
  };

  const handlePrepareSuggestion = (suggestion: PlannerSuggestion) => {
    haptic([8, 24, 8]);
    setCreateSuggestion(suggestion);
  };

  const handleCreateTripFromSuggestion = async (startDate: string, withItinerary: boolean) => {
    if (!createSuggestion || creatingTrip) return;

    setCreatingTrip(true);
    setCreationStep('photo');

    try {
      const trip = await createPlannerTrip(
        {
          suggestion: createSuggestion,
          startDate,
          homeCurrency,
          travelStyle,
          withItinerary,
        },
        { onProgress: setCreationStep },
      );

      addTrip(trip);
      setCreationStep('done');
      toast('Voyage créé depuis le Planificateur ✨', 'success');
      await new Promise((resolve) => setTimeout(resolve, 650));
      setCreateSuggestion(null);
      setCreatedTrip(trip);
      setShoppingOpen(true);
    } catch (err) {
      console.error('Erreur création depuis planner:', err);
      toast('Erreur lors de la création du voyage', 'error');
    } finally {
      setCreatingTrip(false);
      setCreationStep('idle');
    }
  };

  // Partenaires de la catégorie ouverte
  const sheetPartners = useMemo(() => {
    if (!sheetCategory) return [];
    return PARTNERS.filter((p) => p.category === sheetCategory.key);
  }, [sheetCategory]);

  // Catégories groupées
  const categories = useMemo(() => {
    return CATEGORY_DEFS.map((def) => ({
      ...def,
      partners: PARTNERS.filter((p) => p.category === def.key),
    }));
  }, []);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-[#07070b] pointer-events-none" style={{ zIndex: 0 }} />
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{
          zIndex:          1,
          backgroundImage: "url('/mytrip-ambient-bg.png')",
          filter:          'blur(18px) saturate(130%) brightness(1.05)',
          transform:       'scale(1.06)',
          opacity:         0.62,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'linear-gradient(180deg, rgba(7,7,11,0.24) 0%, rgba(7,7,11,0.58) 52%, rgba(7,7,11,0.88) 100%)',
        }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 3 }}>
        <div className="aurora opacity-5" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <header className="relative z-10 px-5 pt-safe max-w-3xl mx-auto">
        <div className="flex items-center justify-between pt-5 pb-3">
          <h1 className="font-display text-xl font-bold tracking-tighter flex items-center gap-2">
            <span
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              style={{ filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.35)) drop-shadow(0 0 8px rgba(255,122,0,0.16))' }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="decouvrir-search-gradient" x1="4" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="52%" stopColor="#7C3AED" />
                    <stop offset="82%" stopColor="#C84AA6" />
                    <stop offset="100%" stopColor="#FF7A00" />
                  </linearGradient>
                </defs>
                <path
                  d="m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
                  stroke="url(#decouvrir-search-gradient)"
                  strokeWidth="2.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Découvrir
          </h1>
          <button onClick={() => navigate('/profil')} className="tap" aria-label="Profil">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid rgba(255,255,255,0.15)' }} />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`,
                  border: '2px solid rgba(255,255,255,0.15)',
                }}
              >
                {userEmoji && userEmoji !== '✈️' ? userEmoji : initials}
              </div>
            )}
          </button>
        </div>
        <div className="h-px -mx-5" style={{ background: 'linear-gradient(90deg, transparent 0%, #7C3AED 18%, #7C3AED 52%, #C84AA6 78%, #FF7A00 94%, transparent 100%)', opacity: 0.45 }} />
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTENU
          ═══════════════════════════════════════════════════════════════════════ */}
      <main className="relative z-10 px-5 pb-28 max-w-3xl mx-auto mt-9 space-y-4">

        {/* ─── Planificateur IA V2 — online-only ─── */}
        <div ref={plannerRef}>
        <PlannerForm
          online={plannerOnline}
          expanded={plannerExpanded}
          homeCurrency={homeCurrency}
          homeCity={homeCity}
          homeLat={homeLat}
          homeLon={homeLon}
          defaultStyle={travelStyle}
          loading={plannerLoading}
          onExpandedChange={setPlannerExpanded}
          onGenerate={handlePlannerGenerate}
        >
          {plannerExpanded && plannerLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] p-4 flex items-center gap-3"
              style={{ background: 'rgba(var(--accent-from-rgb),0.10)', border: '1px solid rgba(var(--accent-from-rgb),0.20)' }}
            >
              <span className="block w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              <div>
                <div className="text-sm font-semibold">ARIA prépare tes idées…</div>
                <div className="text-xs text-white/35 mt-0.5">Analyse destination, budget, durée et ville de résidence.</div>
              </div>
            </motion.div>
          )}

          {plannerExpanded && plannerError && !plannerLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] p-4"
              style={{
                background: plannerSource === 'demo' ? 'rgba(240,178,74,0.09)' : 'rgba(239,68,68,0.09)',
                border: plannerSource === 'demo' ? '1px solid rgba(240,178,74,0.22)' : '1px solid rgba(239,68,68,0.22)',
              }}
            >
              <div className="text-sm font-semibold" style={{ color: plannerSource === 'demo' ? '#f0b24a' : '#ef4444' }}>
                {plannerSource === 'demo' ? 'Mode aperçu' : 'Planificateur indisponible'}
              </div>
              <div className="text-xs text-white/45 mt-1 leading-relaxed">{plannerError.message}</div>
            </motion.div>
          )}

          {plannerExpanded && (
            <PlannerResults
              suggestions={plannerSuggestions}
              userBudget={plannerBudget}
              onPrepare={handlePrepareSuggestion}
              onClear={clearPlannerSuggestions}
            />
          )}
        </PlannerForm>
        </div>

        {/* ─── Hub Catégories — Grille 2x4 ─── */}
        <div className="pt-3">
          <div className="text-xs uppercase tracking-wider text-white/35 mb-3 px-1">Services de voyage</div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, idx) => (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.03 * idx }}
                onClick={() => openSheet(cat)}
                className="w-full text-left rounded-[20px] p-4 tap relative overflow-hidden"
                style={{
                  background: cat.bgGradient,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Glow circle */}
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl pointer-events-none"
                  style={{ background: `${cat.color}15` }}
                />

                <div className="relative flex items-center gap-2.5">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <div className="text-sm font-bold tracking-tight">{cat.key}</div>
                    <div className="text-[10px] text-white/30">{cat.partners.length} partenaire{cat.partners.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-white/20 text-center px-4 pb-2">
          Les liens s'ouvrent dans votre navigateur — revenez ici pour créer votre voyage ✨
        </div>
      </main>

      <PlannerCreateSheet
        open={!!createSuggestion}
        suggestion={createSuggestion}
        creating={creatingTrip}
        creationStep={creationStep}
        onClose={() => !creatingTrip && setCreateSuggestion(null)}
        onCreate={handleCreateTripFromSuggestion}
      />

      <TravelPrepSheet
        open={shoppingOpen}
        trip={createdTrip}
        onClose={() => setShoppingOpen(false)}
        onOpenTrip={() => {
          if (!createdTrip) return;
          setShoppingOpen(false);
          navigate(`/trip/${createdTrip.id}/overview`);
        }}
      />

      {/* ═════════════════════════════════════════════════════════════════════════
          BOTTOM SHEET — Catégorie sélectionnée
          ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sheetCategory && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Sheet — Full Glassmorphism */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-sm rounded-t-[28px] overflow-hidden pb-safe"
              style={{
                background: 'rgba(20,20,30,0.65)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderBottom: 'none',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow catégorie en haut */}
              <div
                className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% -20%, ${sheetCategory.color}12 0%, transparent 70%)` }}
              />

              {/* Drag indicator */}
              <div className="relative flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
              </div>

              {/* En-tête catégorie */}
              <div className="relative px-5 pb-3 pt-1 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${sheetCategory.color}25`,
                    border: `1px solid ${sheetCategory.color}40`,
                    boxShadow: `0 4px 16px ${sheetCategory.color}15`,
                  }}
                >
                  <span className="text-xl">{sheetCategory.emoji}</span>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg tracking-tight">{sheetCategory.key}</div>
                  <div className="text-xs text-white/40">{sheetPartners.length} partenaire{sheetPartners.length > 1 ? 's' : ''} disponible{sheetPartners.length > 1 ? 's' : ''}</div>
                </div>
                <button
                  onClick={closeSheet}
                  className="p-2 rounded-xl tap"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <X size={16} className="text-white/50" />
                </button>
              </div>

              {/* Accent line glass */}
              <div
                className="relative h-px mx-5 mb-3"
                style={{ background: `linear-gradient(90deg, transparent, ${sheetCategory.color}50, transparent)` }}
              />

              {/* Liste des partenaires — glass cards */}
              <div className="relative px-4 pb-3 space-y-2">
                {sheetPartners.map((p, idx) => (
                  <motion.button
                    key={p.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 * idx }}
                    onClick={() => openPartner(p.url)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl tap text-left transition"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}
                  >
                    <PartnerLogo partner={p} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold tracking-tight">{p.name}</div>
                      <div className="text-xs text-white/35 mt-0.5">{p.description}</div>
                    </div>
                    <ArrowRight size={14} style={{ color: sheetCategory.color }} />
                  </motion.button>
                ))}
              </div>

              {/* Bouton fermer — glass */}
              <div className="relative px-4 pb-6 pt-2">
                <button
                  onClick={closeSheet}
                  className="w-full py-3.5 rounded-2xl tap font-semibold text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
