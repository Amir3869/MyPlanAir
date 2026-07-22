// src/features/overview/Overview.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Cloud, Wallet,
  Lightbulb, ArrowRight, RefreshCw, WifiOff,
  Wind, Droplets, Plus, Check,
  Thermometer, ChevronDown, Map,
  CheckCircle2, ArrowLeftRight, Plane, Home, Navigation,
  FileText, MessageCircle, Camera,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { fmtMoney } from '../../utils/formatters';
import {
  fetchAssistant,
  clearAssistantCache,
  CAPITAL_COORDS,
  type AssistantResult,
  type AssistantPayload,
  type AssistantStepSuggestionDetail,
} from '../../api/cloud';
import { fetchWeather, type WeatherResult } from '../../api/weather';
import { fetchRate } from '../../api/currency';
import { getCountryMeta } from '../../api/countries';
import { Donut } from '../../shared/Donut';
import { useNavigate } from 'react-router-dom';
import { daysBetween, addDaysISO, tripStatus } from '../../utils/dateHelpers';
import {
  useTripStore,
  type StepPeriod,
  type StepType,
  type TripDestination,
  type TripMemory,
} from '../../store/tripStore';
import { formatFileSize } from '../../store/types';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import { MemoryStorage } from '../../utils/memoryStorage';
import { getExpensesBudgetTotal } from '../../utils/expenseHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Spinner inline
// ─────────────────────────────────────────────────────────────────────────────
const Spinner = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-2 py-1">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-4 h-4 border border-white/20 border-t-white/70 rounded-full flex-shrink-0"
    />
    {label && <span className="text-sm text-white/40">{label}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TipCard
// ─────────────────────────────────────────────────────────────────────────────
const TipCard = ({
  tip,
  index,
}: {
  tip: { title: string; body: string };
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className="rounded-2xl p-4"
    style={{
      background: 'rgba(255,255,255,0.06)',
      border:     '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <div className="font-semibold tracking-tight mb-1">{tip.title}</div>
    <div className="text-sm text-white/65 leading-relaxed">{tip.body}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Parser emoji
// ─────────────────────────────────────────────────────────────────────────────
const parseEmojiFromSuggestion = (suggestion: string): { emoji: string; text: string } => {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
  const match      = suggestion.match(emojiRegex);
  if (match) return { emoji: match[0].trim(), text: suggestion.replace(match[0], '').trim() };
  const t = suggestion.toLowerCase();
  if (t.includes('restaurant') || t.includes('dîner') || t.includes('déjeuner') ||
      t.includes('café') || t.includes('cuisine') || t.includes('ramen') ||
      t.includes('sushi') || t.includes('tapas') || t.includes('gastronomie') ||
      t.includes('dégustation') || t.includes('marché')) return { emoji: '🍽️', text: suggestion };
  if (t.includes('train') || t.includes('bus') || t.includes('métro') ||
      t.includes('avion') || t.includes('taxi') || t.includes('ferry') ||
      t.includes('transport') || t.includes('gare')) return { emoji: '🚆', text: suggestion };
  if (t.includes('hôtel') || t.includes('auberge') || t.includes('logement') ||
      t.includes('airbnb') || t.includes('hostel')) return { emoji: '🏨', text: suggestion };
  if (t.includes('plage') || t.includes('mer') || t.includes('onsen') ||
      t.includes('bain') || t.includes('piscine')) return { emoji: '🏖️', text: suggestion };
  if (t.includes('temple') || t.includes('sanctuaire') || t.includes('église') ||
      t.includes('cathédrale') || t.includes('mosquée')) return { emoji: '🛕', text: suggestion };
  if (t.includes('musée') || t.includes('galerie') || t.includes('palais') ||
      t.includes('exposition')) return { emoji: '🏛️', text: suggestion };
  if (t.includes('montagne') || t.includes('randonnée') || t.includes('forêt') ||
      t.includes('parc naturel') || t.includes('volcan')) return { emoji: '⛰️', text: suggestion };
  if (t.includes('souk') || t.includes('bazar') || t.includes('shopping'))
    return { emoji: '🛒', text: suggestion };
  if (t.includes('coucher de soleil') || t.includes('panorama') || t.includes('belvédère'))
    return { emoji: '🌅', text: suggestion };
  if (t.includes('concert') || t.includes('spectacle') || t.includes('théâtre'))
    return { emoji: '🎭', text: suggestion };
  if (t.includes('château') || t.includes('forteresse') || t.includes('citadelle'))
    return { emoji: '🏯', text: suggestion };
  if (t.includes('massage') || t.includes('spa')) return { emoji: '💆', text: suggestion };
  return { emoji: '🗺️', text: suggestion };
};

const parseSuggestionDetails = (suggestion: string): {
  emoji: string;
  title: string;
  place?: string;
  info?: string;
} => {
  const { emoji, text } = parseEmojiFromSuggestion(suggestion);
  const parts = text
    .split(/\s*[·•]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    emoji,
    title: parts[0] || text,
    place: parts[1],
    info: parts.slice(2).join(' · ') || undefined,
  };
};

const normalizeSuggestionText = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '')
  .replace(/[’']/g, ' ')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase();

const isGenericSuggestionInfo = (info?: string): boolean => {
  const normalized = normalizeSuggestionText(info ?? '');
  if (!normalized) return true;

  const genericFragments = [
    'idee locale selectionnee par aria pour enrichir ton parcours',
    'adresse food a tester pour un repas une pause ou une decouverte locale',
    'point de trajet utile si ce deplacement structure ta journee',
    'repere pratique a garder dans ton parcours pour organiser ton arrivee',
    'lieu culturel historique ou emblematique a integrer au bon moment de ta journee',
    'idee locale a integrer a ton parcours tu peux ajuster le lieu avant de l ajouter',
    'suggestion pour enrichir ton parcours',
    'detail a completer',
    'info indisponible',
  ];

  return genericFragments.some((fragment) => normalized.includes(fragment));
};

const cleanSuggestionInfo = (info?: string): string => {
  const cleaned = (info ?? '').replace(/\s+/g, ' ').trim();
  return isGenericSuggestionInfo(cleaned) ? '' : cleaned;
};

const roadtripSuggestionDetailsCache = new globalThis.Map<string, AssistantStepSuggestionDetail[]>();

// ─────────────────────────────────────────────────────────────────────────────
// Détection type étape
// ─────────────────────────────────────────────────────────────────────────────
const detectStepType = (title: string): StepType => {
  const t = title.toLowerCase();
  if (t.includes('restaurant') || t.includes('dîner') || t.includes('déjeuner') ||
      t.includes('café') || t.includes('gastronomie') || t.includes('ramen') ||
      t.includes('sushi') || t.includes('tapas') || t.includes('cuisine')) return 'food';
  if (t.includes('hôtel') || t.includes('airbnb') || t.includes('auberge') ||
      t.includes('logement') || t.includes('hébergement')) return 'lodging';
  if (t.includes('train') || t.includes('bus') || t.includes('métro') ||
      t.includes('avion') || t.includes('taxi') || t.includes('transport') ||
      t.includes('gare') || t.includes('ferry')) return 'transport';
  return 'sight';
};

// ─────────────────────────────────────────────────────────────────────────────
// Périodes
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS: { key: StepPeriod; label: string; emoji: string; color: string }[] = [
  { key: 'morning',   label: 'Matin',      emoji: '🌅', color: '#56c5a4' },
  { key: 'afternoon', label: 'Après-midi', emoji: '☀️', color: '#f0b24a' },
  { key: 'night',     label: 'Soir',       emoji: '🌙', color: '#7c8cff' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TripCountdownStat
// ─────────────────────────────────────────────────────────────────────────────
const TripCountdownStat = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate:   string;
}) => {
  const status = tripStatus(startDate, endDate);
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const start  = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end    = new Date(endDate);   end.setHours(0, 0, 0, 0);

  if (status === 'upcoming') {
    const daysLeft = Math.round((start.getTime() - now.getTime()) / 86400000);
    return (
      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Plane size={12} style={{ color: '#7c8cff' }} />
          <span
            className="text-2xl font-bold font-display tracking-tighter"
            style={{ color: '#7c8cff' }}
          >
            J-{daysLeft}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
          avant départ
        </div>
      </GlassCard>
    );
  }

  if (status === 'ongoing') {
    const dayIdx = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    const total  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return (
      <GlassCard className="p-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Navigation size={12} style={{ color: '#56c5a4' }} />
          <span
            className="text-2xl font-bold font-display tracking-tighter"
            style={{ color: '#56c5a4' }}
          >
            {dayIdx}/{total}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
          en voyage
        </div>
      </GlassCard>
    );
  }

  const daysAgo = Math.round((now.getTime() - end.getTime()) / 86400000);
  return (
    <GlassCard className="p-4 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Home size={12} style={{ color: '#f0b24a' }} />
        <span
          className="text-2xl font-bold font-display tracking-tighter"
          style={{ color: '#f0b24a' }}
        >
          J+{daysAgo}
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/55 leading-tight">
        depuis retour
      </div>
    </GlassCard>
  );
};

const getRoadtripDestinationKey = (destination: TripDestination): string =>
  `${destination.city}|${destination.fromDay}|${destination.toDay}`;

// ─────────────────────────────────────────────────────────────────────────────
// CityAccordion
// ─────────────────────────────────────────────────────────────────────────────
type CityAccordionProps = {
  destination:  TripDestination;
  tripId:       string;
  tripCountry:  string;
  tripBudget:   number;
  tripCurrency: string;
  isOpen:       boolean;
  onToggle:     () => void;
  destinationKey: string;
  onAddToTrip:  (title: string, city: string, detail?: AssistantStepSuggestionDetail, index?: number, destinationKey?: string) => void;
  mode?:        'accordion' | 'panel';
};

const CityAccordion = ({
  destination, destinationKey, tripId, tripCountry, tripBudget, tripCurrency,
  isOpen, onToggle, onAddToTrip, mode = 'accordion',
}: CityAccordionProps) => {
  const setAiSuggestions     = useTripStore((s) => s.setAiSuggestions);
  const clearUsedSuggestions = useTripStore((s) => s.clearUsedSuggestions);
  const cacheKey             = `${tripId}_${destinationKey}`;
  const aiSuggestionsRaw     = useTripStore((s) => s.aiSuggestions[cacheKey]);
  const usedSuggestionsRaw   = useTripStore((s) => s.usedSuggestions[cacheKey]);
  const aiSuggestions        = aiSuggestionsRaw  ?? [];
  const usedSuggestions      = usedSuggestionsRaw ?? [];

  const [citySuggestionDetails, setCitySuggestionDetails] = useState<AssistantStepSuggestionDetail[]>(
    () => roadtripSuggestionDetailsCache.get(cacheKey) ?? [],
  );
  const [loading,      setLoading]      = useState(false);
  const [loaded,       setLoaded]       = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const cityDays = Math.max(1, daysBetween(destination.fromDate, destination.toDate));
  const expanded = mode === 'panel' || isOpen;

  useEffect(() => {
    const cachedDetails = roadtripSuggestionDetailsCache.get(cacheKey);
    if (cachedDetails && cachedDetails.length > 0) {
      setCitySuggestionDetails(cachedDetails);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!expanded || loaded || aiSuggestions.length > 0) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchAssistant({
          city:     destination.city,
          country:  tripCountry,
          days:     cityDays,
          budget:   tripBudget,
          currency: tripCurrency,
        });
        if (result.ok && result.stepSuggestions.length > 0) {
          setAiSuggestions(cacheKey, result.stepSuggestions);
          const details = result.stepSuggestionDetails ?? [];
          setCitySuggestionDetails(details);
          roadtripSuggestionDetailsCache.set(cacheKey, details);
          setUsedFallback(false);
        } else {
          setUsedFallback(true);
        }
      } catch {
        setUsedFallback(true);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const handleRefresh = async () => {
    haptic([5, 20, 5]);
    clearAssistantCache({ city: destination.city, country: tripCountry });
    clearUsedSuggestions(cacheKey);
    setAiSuggestions(cacheKey, []);
    setCitySuggestionDetails([]);
    roadtripSuggestionDetailsCache.delete(cacheKey);
    setLoaded(false);
    setLoading(true);
    try {
      const result = await fetchAssistant({
        city:     destination.city,
        country:  tripCountry,
        days:     cityDays,
        budget:   tripBudget,
        currency: tripCurrency,
      });
      if (result.ok && result.stepSuggestions.length > 0) {
        setAiSuggestions(cacheKey, result.stepSuggestions);
        const details = result.stepSuggestionDetails ?? [];
        setCitySuggestionDetails(details);
        roadtripSuggestionDetailsCache.set(cacheKey, details);
        setUsedFallback(false);
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); setLoaded(true); }
  };

  const availableSuggestions = aiSuggestions.filter((s) => !usedSuggestions.includes(s));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: mode === 'panel' ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.04)',
        border:     mode === 'panel' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {mode === 'accordion' && (
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,140,255,0.15)' }}
        >
          <Map size={14} style={{ color: '#7c8cff' }} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold tracking-tight">{destination.city}</div>
          <div className="text-xs text-white/40 mt-0.5">
            J{destination.fromDay}→J{destination.toDay} · {cityDays} jour{cityDays > 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(124,140,255,0.15)', color: '#7c8cff' }}
          >
            IA
          </span>
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
              disabled={loading}
              className="w-7 h-7 rounded-xl flex items-center justify-center tap"
              style={{ background: 'rgba(124,140,255,0.1)' }}
              aria-label="Nouvelles suggestions"
            >
              <motion.div
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  loading
                    ? { repeat: Infinity, duration: 1, ease: 'linear' }
                    : { duration: 0.3 }
                }
              >
                <RefreshCw size={11} style={{ color: '#7c8cff' }} />
              </motion.div>
            </button>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-white/30" />
          </motion.div>
        </div>
      </button>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={mode === 'panel' ? 'px-3 py-3 space-y-2' : 'px-3 pb-3 space-y-2'}>
              {loading && (
                <Spinner label={`Suggestions pour ${destination.city}...`} />
              )}
              {!loading && usedFallback && (
                <div
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(240,178,74,0.08)',
                    border:     '1px solid rgba(240,178,74,0.15)',
                    color:      '#f0b24a',
                  }}
                >
                  <WifiOff size={11} /> Suggestions hors-ligne pour {destination.city}
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {availableSuggestions.map((suggestion, i) => {
                  const suggestionIndex = aiSuggestions.findIndex((item) => item === suggestion);
                  const structuredDetails = suggestionIndex >= 0
                    ? citySuggestionDetails[suggestionIndex]
                    : undefined;
                  const parsedDetails = parseSuggestionDetails(suggestion);
                  const details = {
                    emoji: structuredDetails?.emoji || parsedDetails.emoji,
                    title: structuredDetails?.title || parsedDetails.title,
                    place: structuredDetails?.place || parsedDetails.place,
                    info: cleanSuggestionInfo(structuredDetails?.info || parsedDetails.info),
                    type: structuredDetails?.type,
                  };
                  const { emoji } = details;
                  const text = details.title;
                  return (
                    <motion.div
                      key={suggestion}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, height: 0 }}
                      transition={{
                        delay:  i * 0.03,
                        layout: { type: 'spring', damping: 26 },
                      }}
                      onClick={() => onAddToTrip(
                        suggestion,
                        destination.city,
                        structuredDetails,
                        suggestionIndex >= 0 ? suggestionIndex : i,
                        destinationKey,
                      )}
                      className="flex items-center gap-3 p-3 rounded-xl tap cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border:     '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium tracking-tight truncate">{text}</span>
                        {details.place && (
                          <span className="block text-[11px] text-white/35 truncate mt-0.5">{details.place}</span>
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToTrip(
                            suggestion,
                            destination.city,
                            structuredDetails,
                            suggestionIndex >= 0 ? suggestionIndex : i,
                            destinationKey,
                          );
                        }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center tap flex-shrink-0"
                        style={{
                          background: 'rgba(124,140,255,0.2)',
                          border:     '1px solid rgba(124,140,255,0.3)',
                        }}
                        aria-label={`Ajouter ${text} au parcours`}
                      >
                        <Plus size={13} style={{ color: '#7c8cff' }} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!loading && availableSuggestions.length === 0 && loaded && (
                <p className="text-xs text-white/30 text-center py-2">
                  Toutes les suggestions ont été ajoutées !
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 OVERVIEW PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const Overview = () => {
  const { trip } = useTripContext();
  const navigate  = useNavigate();
  const { success, error } = useToast();

  // ── Store ────────────────────────────────────────────────────────────────
  const setAiSuggestions     = useTripStore((s) => s.setAiSuggestions);
  const markSuggestionUsed   = useTripStore((s) => s.markSuggestionUsed);
  const clearUsedSuggestions = useTripStore((s) => s.clearUsedSuggestions);
  const addStep              = useTripStore((s) => s.addStep);
  const addMemory            = useTripStore((s) => s.addMemory);
  const addChecklistItem     = useTripStore((s) => s.addChecklistItem);

  const aiSuggestionsRaw   = useTripStore((s) => s.aiSuggestions[trip.id]);
  const usedSuggestionsRaw = useTripStore((s) => s.usedSuggestions[trip.id]);
  const aiSuggestions      = aiSuggestionsRaw  ?? [];
  const usedSuggestions    = usedSuggestionsRaw ?? [];

  // ── State ─────────────────────────────────────────────────────────────────
  const [aiOpen,        setAiOpen]        = useState(false);
  const [loadingAI,     setLoadingAI]     = useState(false);
  const [usedFallback,  setUsedFallback]  = useState(false);
  const [assistantData, setAssistantData] = useState<AssistantResult | null>(null);

  const [weather,            setWeather]            = useState<WeatherResult | null>(null);
  const [loadingWeather,     setLoadingWeather]     = useState(false);
  const [weatherFromCapital, setWeatherFromCapital] = useState(false);

  // ✅ FIX P4 — rateUpdatedAt supprimé (déclaré mais jamais lu)
  // On garde rate et rateSource qui sont utilisés dans le rendu
  const [rate,        setRate]        = useState<number | null>(null);
  const [rateSource,  setRateSource]  = useState<'live' | 'offline' | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [rateAmount,    setRateAmount]    = useState<number>(10);
  const [rateFrom,      setRateFrom]      = useState(trip.homeCurrency);
  const [rateTo,        setRateTo]        = useState(trip.currency);
  const [quickRate,     setQuickRate]     = useState<number | null>(null);
  const [quickRateSource, setQuickRateSource] = useState<'live' | 'offline' | null>(null);
  const [quickRateLoading, setQuickRateLoading] = useState(false);

  const [addingTitle,       setAddingTitle]       = useState<string | null>(null);
  const [addingRawTitle,    setAddingRawTitle]    = useState<string>('');
  const [addingInfo,        setAddingInfo]        = useState<string>('');
  const [addingCityHint,    setAddingCityHint]    = useState<string>('');
  const [addingDestinationKey, setAddingDestinationKey] = useState<string>('');
  const [addDay,            setAddDay]            = useState(1);
  const [addPeriod,         setAddPeriod]         = useState<StepPeriod>('morning');
  const [addPlace,          setAddPlace]          = useState('');
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState<string>('');

  const [memoryOpen,    setMemoryOpen]    = useState(false);
  const [memoryFiles,   setMemoryFiles]   = useState<File[]>([]);
  const [memoryDay,     setMemoryDay]     = useState<number | null>(null);
  const [memoryStepId,  setMemoryStepId]  = useState<string>('');
  const [memoryCaption, setMemoryCaption] = useState('');
  const [memorySaving,  setMemorySaving]  = useState(false);

  const [adviceFamily, setAdviceFamily] = useState<'auto' | 'money' | 'docs' | 'bagage' | 'weather' | 'memory' | 'transport'>('auto');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalChecklist = trip.checklist.length;
  const doneChecklist  = trip.checklist.filter((c) => c.done).length;
  const checkPct       = totalChecklist > 0
    ? Math.round((doneChecklist / totalChecklist) * 100)
    : 0;
  const spent    = getExpensesBudgetTotal(trip.expenses, trip.currency);
  const budgetPct = trip.budget > 0
    ? Math.min(100, Math.round((spent / trip.budget) * 100))
    : 0;
  const days = daysBetween(trip.startDate, trip.endDate);

  // ── Documents stats ─────────────────────────────────────────────────────
  const docCount       = trip.documents?.length ?? 0;
  const docTotalSize   = trip.documents?.reduce((s, d) => s + (d.size ?? 0), 0) ?? 0;
  const docTicketCount = trip.documents?.filter((d) => d.category === 'ticket').length ?? 0;
  const docResaCount   = trip.documents?.filter((d) => d.category === 'reservation').length ?? 0;
  const docVisaCount   = trip.documents?.filter((d) => d.category === 'visa').length ?? 0;
  const docPapiersCount = trip.documents?.filter((d) => d.category === 'papiers').length ?? 0;
  const docOtherCount  = trip.documents?.filter((d) => d.category === 'other' || !d.category).length ?? 0;

  // ── Souvenirs stats ─────────────────────────────────────────────────────
  const memories = trip.memories ?? [];
  const memoryCount = memories.length;
  const memoryPhotoCount = memories.reduce((sum, memory) => sum + memory.photoIds.length, 0);
  const memoryDayCount = new Set(memories.map((m) => m.day).filter((d): d is number => typeof d === 'number')).size;

  const availableSuggestions = aiSuggestions.filter((s) => !usedSuggestions.includes(s));

  const assistantPayload: AssistantPayload = trip.isRoadtrip
    ? { city: trip.country, country: trip.country, days, budget: trip.budget, currency: trip.currency }
    : { city: trip.destination, country: trip.country, days, budget: trip.budget, currency: trip.currency };

  // ✅ FIX P2 — Devise réelle du pays de destination
  const destinationCurrency = getCountryMeta(trip.countryCode)?.currency ?? trip.currency;
  const showRateWidget = trip.homeCurrency !== destinationCurrency;
  const currentTripStatus = tripStatus(trip.startDate, trip.endDate);
  const assistantOffline = usedFallback && !assistantData?.ok;

  const adviceFamilies = [
    { key: 'auto' as const,      label: 'Auto',     emoji: '✨' },
    { key: 'money' as const,     label: 'Argent',   emoji: '💳' },
    { key: 'docs' as const,      label: 'Docs',     emoji: '🛂' },
    { key: 'bagage' as const,    label: 'Bagage',   emoji: '🎒' },
    { key: 'weather' as const,   label: 'Météo',    emoji: '🌦️' },
    { key: 'memory' as const,    label: 'Souvenir', emoji: '📸' },
    { key: 'transport' as const, label: 'Trajet',   emoji: '🚆' },
  ];

  const ariaAdvice = useMemo(() => {
    const aiTips = assistantData?.ok ? assistantData.tips : [];
    const structuredAdvice = assistantData?.ok ? assistantData.advice : undefined;

    const cleanTitle = (title: string): string =>
      title.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();

    const compact = (text: string, max = 130): string => {
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned.length <= max) return cleaned;
      const firstSentence = cleaned.match(/^(.+?[.!?])\s/)?.[1];
      if (firstSentence && firstSentence.length <= max) return firstSentence;
      return `${cleaned.slice(0, max - 1).trimEnd()}…`;
    };

    const appAdvice = {
      money: { emoji: '💳', family: 'Argent', title: 'Paiements', body: showRateWidget ? `Garde une idée du change ${trip.homeCurrency} → ${destinationCurrency}.` : 'Vérifie tes plafonds et garde un moyen de paiement de secours.', checklistLabel: 'Vérifier carte bancaire, plafonds et frais à l’étranger', accent: '#56c5a4' },
      docs: { emoji: '🛂', family: 'Documents', title: 'Papiers', body: 'Ajoute billets et réservations dans Documents.', checklistLabel: 'Ajouter billets, réservations et papiers importants', accent: '#7c8cff' },
      bagage: { emoji: '🎒', family: 'Bagage', title: 'Essentiels', body: 'Prépare adaptateur, batterie externe et chargeurs.', checklistLabel: 'Préparer adaptateur, batterie externe, chargeurs et médicaments', accent: '#f0b24a' },
      weather: { emoji: '🌦️', family: 'Météo', title: 'Plan B', body: weather?.ok ? `${weather.label}, ${weather.temp}°C : garde une option intérieure.` : 'Garde une option intérieure si la météo change.', checklistLabel: 'Prévoir une activité intérieure en cas de météo difficile', accent: '#38bdf8' },
      memory: { emoji: '📸', family: 'Souvenir', title: currentTripStatus === 'finished' ? 'Souvenirs' : 'Moment du jour', body: currentTripStatus === 'finished' ? 'Ajoute tes meilleures photos pour ton futur carnet.' : 'Ajoute une photo à une activité du parcours.', checklistLabel: undefined, accent: '#ec4899' },
      transport: { emoji: '🚆', family: 'Trajet', title: 'Déplacements', body: trip.isRoadtrip ? 'Vérifie les trajets entre tes villes.' : 'Sauvegarde adresse du logement et trajets principaux.', checklistLabel: trip.isRoadtrip ? 'Vérifier les trajets entre les villes du roadtrip' : 'Sauvegarder adresse du logement et trajets principaux', accent: '#a78bfa' },
    };

    const familyMeta = {
      auto: { emoji: '✨', family: 'Local', accent: '#7c8cff' },
      money: { emoji: '💳', family: 'Argent', accent: '#56c5a4' },
      docs: { emoji: '🛂', family: 'Documents', accent: '#7c8cff' },
      bagage: { emoji: '🎒', family: 'Bagage', accent: '#f0b24a' },
      weather: { emoji: '🌦️', family: 'Météo', accent: '#38bdf8' },
      memory: { emoji: '📸', family: 'Souvenir', accent: '#ec4899' },
      transport: { emoji: '🚆', family: 'Trajet', accent: '#a78bfa' },
    };

    const fromStructured = (family: keyof typeof familyMeta) => {
      const item = structuredAdvice?.[family];
      if (!item) return null;
      const meta = familyMeta[family];
      return {
        emoji: meta.emoji,
        family: meta.family,
        title: compact(item.title || meta.family, 34),
        body: compact(item.body || '', 135),
        checklistLabel: item.checklistLabel,
        accent: meta.accent,
      };
    };

    const findAiTip = (keywords: string[]) => {
      const lowerKeywords = keywords.map((k) => k.toLowerCase());
      return aiTips.find((tip) => {
        const haystack = `${tip.title} ${tip.body}`.toLowerCase();
        return lowerKeywords.some((keyword) => haystack.includes(keyword));
      });
    };

    const fromTip = (
      tip: { title: string; body: string } | undefined,
      fallback: typeof appAdvice.money,
    ) => {
      if (!tip) return fallback;
      return {
        ...fallback,
        title: compact(cleanTitle(tip.title) || fallback.title, 34),
        body: compact(tip.body, 135),
      };
    };

    if (adviceFamily !== 'auto') {
      const structured = fromStructured(adviceFamily);
      if (structured) return structured;

      const fallbackByFamily = {
        money: fromTip(findAiTip(['argent', 'budget', 'prix', 'carte', 'cash', 'paiement', 'frais', 'change', 'monnaie']), appAdvice.money),
        docs: fromTip(findAiTip(['document', 'passeport', 'visa', 'billet', 'réservation', 'reservation', 'papier']), appAdvice.docs),
        bagage: fromTip(findAiTip(['bagage', 'adaptateur', 'chargeur', 'valise', 'médicament', 'medicament', 'vêtement', 'vetement']), appAdvice.bagage),
        weather: fromTip(findAiTip(['météo', 'meteo', 'pluie', 'chaleur', 'froid', 'saison', 'climat']), appAdvice.weather),
        memory: appAdvice.memory,
        transport: fromTip(findAiTip(['transport', 'train', 'bus', 'métro', 'metro', 'taxi', 'ferry', 'trajet', 'gare']), appAdvice.transport),
      };
      return fallbackByFamily[adviceFamily];
    }

    const structuredAuto = fromStructured('auto');
    if (structuredAuto) return structuredAuto;

    if (aiTips.length > 0) {
      const firstTip = aiTips[0];
      return {
        emoji: '✨', family: 'Local', title: compact(cleanTitle(firstTip.title) || 'Conseil local', 34),
        body: compact(firstTip.body, 135), checklistLabel: undefined, accent: '#7c8cff',
      };
    }

    if (currentTripStatus === 'finished') {
      return memoryPhotoCount === 0 ? appAdvice.memory : { emoji: '📖', family: 'Carnet', title: 'Album souvenir', body: `${memoryPhotoCount} photo${memoryPhotoCount > 1 ? 's' : ''} déjà ajoutée${memoryPhotoCount > 1 ? 's' : ''}.`, checklistLabel: undefined, accent: '#ec4899' };
    }
    if (currentTripStatus === 'ongoing') {
      return budgetPct >= 80 ? { emoji: '💰', family: 'Budget', title: 'Attention extras', body: `Tu as utilisé environ ${budgetPct}% du budget.`, checklistLabel: undefined, accent: '#f0b24a' } : appAdvice.memory;
    }
    if (docCount === 0) return appAdvice.docs;
    if (showRateWidget) return appAdvice.money;
    return appAdvice.bagage;
  }, [adviceFamily, assistantData, budgetPct, currentTripStatus, destinationCurrency, docCount, memoryPhotoCount, showRateWidget, trip.homeCurrency, trip.isRoadtrip, weather]);

  // ── Météo ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadWeather = async () => {
      let lat = trip.lat;
      let lon = trip.lon;
      let fromCapital = false;
      if (!lat || !lon) {
        const cap = CAPITAL_COORDS[trip.countryCode];
        if (cap) { lat = cap.lat; lon = cap.lon; fromCapital = true; }
        else return;
      }
      setLoadingWeather(true);
      setWeatherFromCapital(fromCapital);
      const result = await fetchWeather(lat, lon);
      setWeather(result);
      setLoadingWeather(false);
    };
    loadWeather();
  }, [trip.id, trip.lat, trip.lon, trip.countryCode]);

  // ✅ FIX P2 — Taux chargé avec destinationCurrency via Worker (pas direct Frankfurter)
  useEffect(() => {
    if (!showRateWidget) return;
    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const result = await fetchRate(trip.homeCurrency, destinationCurrency);
        setRate(result.rate);
        setRateSource(result.source);
        // ✅ FIX P4 — rateUpdatedAt supprimé car non utilisé dans le rendu
      } finally {
        setLoadingRate(false);
      }
    };
    loadRate();
  }, [trip.id, trip.homeCurrency, destinationCurrency, showRateWidget]);

  // ── Assistant ─────────────────────────────────────────────────────────────
  const loadAssistant = useCallback(async (forceRefresh = false) => {
    setLoadingAI(true);
    setUsedFallback(false);
    try {
      if (forceRefresh) clearAssistantCache(assistantPayload);
      const result = await fetchAssistant(assistantPayload);
      if (result.ok) {
        setAssistantData(result);
        if (!trip.isRoadtrip && result.stepSuggestions.length > 0) {
          const currentLength = aiSuggestionsRaw?.length ?? 0;
          if (currentLength === 0 || forceRefresh) {
            setAiSuggestions(trip.id, result.stepSuggestions);
          }
        }
      } else {
        setAssistantData(null);
        setUsedFallback(true);
      }
    } catch {
      setUsedFallback(true);
    } finally {
      setLoadingAI(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, trip.destination, trip.country, trip.isRoadtrip, days, trip.budget, trip.currency, aiSuggestionsRaw]);

  useEffect(() => { loadAssistant(false); }, [loadAssistant]);

  useEffect(() => {
    if (!trip.isRoadtrip || !trip.destinations || trip.destinations.length === 0) return;
    setSelectedSuggestionKey((current) => current || (trip.destinations?.[0] ? getRoadtripDestinationKey(trip.destinations[0]) : ''));
  }, [trip.isRoadtrip, trip.destinations]);

  const handleRefreshSuggestions = useCallback(() => {
    haptic([5, 20, 5]);
    setShowAllSuggestions(false);
    clearUsedSuggestions(trip.id);
    setAiSuggestions(trip.id, []);
    loadAssistant(true);
  }, [trip.id, clearUsedSuggestions, setAiSuggestions, loadAssistant]);

  const getStructuredSuggestionDetail = useCallback((
    suggestion: string,
    index?: number,
  ): AssistantStepSuggestionDetail | undefined => {
    if (!assistantData?.ok) return undefined;

    const details = assistantData.stepSuggestionDetails ?? [];
    const suggestions = assistantData.stepSuggestions ?? [];
    const exactIndex = suggestions.findIndex((item) => item === suggestion);
    const resolvedIndex = exactIndex >= 0 ? exactIndex : index;

    if (typeof resolvedIndex === 'number' && details[resolvedIndex]) {
      return details[resolvedIndex];
    }

    const parsedDetails = parseSuggestionDetails(suggestion);
    const cleanParsedTitle = normalizeSuggestionText(parsedDetails.title);
    const cleanRaw = normalizeSuggestionText(suggestion);

    return details.find((detail) => {
      const cleanDetailTitle = normalizeSuggestionText(detail.title ?? '');
      return cleanDetailTitle
        && (cleanDetailTitle === cleanParsedTitle
          || cleanRaw.includes(cleanDetailTitle)
          || cleanDetailTitle.includes(cleanParsedTitle));
    });
  }, [assistantData]);

  const getDisplaySuggestionDetails = useCallback((
    suggestion: string,
    index?: number,
  ) => {
    const parsedDetails = parseSuggestionDetails(suggestion);
    const structuredDetails = getStructuredSuggestionDetail(suggestion, index);
    const info = cleanSuggestionInfo(structuredDetails?.info || parsedDetails.info);

    return {
      emoji: structuredDetails?.emoji || parsedDetails.emoji,
      title: structuredDetails?.title || parsedDetails.title || suggestion,
      place: structuredDetails?.place || parsedDetails.place,
      info,
      type: structuredDetails?.type,
    };
  }, [getStructuredSuggestionDetail]);

  const openAddSuggestion = (
    title: string,
    cityHint = '',
    detailOverride?: AssistantStepSuggestionDetail,
    index?: number,
    destinationKey?: string,
  ) => {
    const parsedDetails = parseSuggestionDetails(title);
    const structuredDetails = detailOverride ?? getStructuredSuggestionDetail(title, index);
    const cleanInfo = cleanSuggestionInfo(structuredDetails?.info || parsedDetails.info);

    const resolvedCity = cityHint || trip.destination;
    const roadtripStop = destinationKey
      ? trip.destinations?.find((dest) => getRoadtripDestinationKey(dest) === destinationKey)
      : trip.destinations?.find((dest) => dest.city === resolvedCity);

    setAddingRawTitle(title);
    setAddingTitle(structuredDetails?.title || parsedDetails.title || title);
    setAddingInfo(cleanInfo);
    setAddingCityHint(resolvedCity);
    setAddingDestinationKey(destinationKey || '');
    setAddDay(roadtripStop?.fromDay ?? 1);
    setAddPeriod('morning');
    setAddPlace(structuredDetails?.place || parsedDetails.place || resolvedCity);
  };

  const handleAddFromRoadtrip = useCallback(
    (title: string, city: string, detail?: AssistantStepSuggestionDetail, index?: number, destinationKey?: string) => {
      openAddSuggestion(title, city, detail, index, destinationKey);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.destination, getStructuredSuggestionDetail],
  );

  const confirmAddSuggestion = () => {
    if (!addingTitle) return;
    haptic([5, 20, 5]);
    addStep(trip.id, {
      id:     crypto.randomUUID(),
      day:    addDay,
      period: addPeriod,
      type:   detectStepType(addingTitle),
      title:  addingTitle,
      place:  addPlace.trim() || trip.destination,
      done:   false,
    });
    markSuggestionUsed(trip.id, addingRawTitle || addingTitle);
    success(
      `✓ ${addingTitle} ajouté — Jour ${addDay} · ${
        PERIODS.find((p) => p.key === addPeriod)?.label
      }`,
    );
    setAddingTitle(null);
    setAddingRawTitle('');
    setAddingInfo('');
    setAddingCityHint('');
  };

  const openMemorySheet = () => {
    haptic(6);
    setMemoryOpen(true);
    setMemoryFiles([]);
    setMemoryDay(null);
    setMemoryStepId('');
    setMemoryCaption('');
  };

  const closeMemorySheet = () => {
    if (memorySaving) return;
    setMemoryOpen(false);
    setMemoryFiles([]);
    setMemoryDay(null);
    setMemoryStepId('');
    setMemoryCaption('');
  };

  const addAdviceToChecklist = () => {
    if (!ariaAdvice.checklistLabel) return;
    haptic([5, 20, 5]);
    addChecklistItem(trip.id, ariaAdvice.checklistLabel);
    success('Ajouté à la checklist');
  };

  const saveMemory = async () => {
    if (memoryFiles.length === 0 || memorySaving) return;
    if (!MemoryStorage.isAvailable() || !(await MemoryStorage.canOpen())) {
      error('Stockage photo indisponible sur cet appareil.');
      return;
    }

    setMemorySaving(true);
    const photoIds: string[] = [];

    try {
      const memoryId = crypto.randomUUID();

      for (const file of memoryFiles) {
        const photoId = crypto.randomUUID();
        await MemoryStorage.savePhoto(trip.id, photoId, file);
        photoIds.push(photoId);
      }

      const linkedStep = memoryStepId
        ? trip.steps.find((step) => step.id === memoryStepId)
        : undefined;

      const memory: TripMemory = {
        id: memoryId,
        day: memoryDay ?? linkedStep?.day,
        stepId: memoryStepId || undefined,
        title: linkedStep?.title,
        caption: memoryCaption.trim() || undefined,
        photoIds,
        createdAt: new Date().toISOString(),
      };

      addMemory(trip.id, memory);
      success(photoIds.length > 1 ? `${photoIds.length} photos ajoutées` : 'Photo souvenir ajoutée');
      closeMemorySheet();
    } catch (err) {
      if (photoIds.length > 0) {
        await Promise.allSettled(
          photoIds.map((photoId) => MemoryStorage.removePhoto(trip.id, photoId)),
        );
      }
      console.warn('[Overview] Erreur ajout souvenir:', err);
      error('Impossible d’ajouter ce souvenir.');
    } finally {
      setMemorySaving(false);
    }
  };

  const RATE_AMOUNTS = [5, 10];
  const RATE_SHEET_AMOUNTS = [5, 10, 25, 50, 100];
  const formatRateAmount = (amount: number): string => {
    if (rate === null) return '—';
    const v = amount * rate;
    return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
  };
  const effectiveQuickRate = quickRate ?? (
    rate !== null
      ? rateFrom === trip.homeCurrency && rateTo === destinationCurrency
        ? rate
        : rateFrom === destinationCurrency && rateTo === trip.homeCurrency
          ? 1 / rate
          : null
      : null
  );
  const convertedRateAmount = effectiveQuickRate !== null ? rateAmount * effectiveQuickRate : null;

  const handleQuickConvert = async () => {
    if (!rateFrom || !rateTo || rateAmount <= 0) return;
    haptic(4);
    setQuickRateLoading(true);
    try {
      if (rateFrom === rateTo) {
        setQuickRate(1);
        setQuickRateSource('live');
        return;
      }
      const result = await fetchRate(rateFrom, rateTo);
      setQuickRate(result.rate);
      setQuickRateSource(result.source);
    } catch {
      setQuickRate(null);
      setQuickRateSource(null);
      error('Conversion indisponible pour le moment.');
    } finally {
      setQuickRateLoading(false);
    }
  };

  const handleAddConvertedExpense = () => {
    const budgetAmount = rateFrom === trip.currency
      ? rateAmount
      : rateTo === trip.currency && convertedRateAmount !== null
        ? convertedRateAmount
        : undefined;

    setRateSheetOpen(false);
    navigate(`/trip/${trip.id}/budget`, {
      state: {
        openExpenseAdder: true,
        expensePrefill: {
          amount: rateAmount,
          currency: rateFrom,
          budgetAmount,
          budgetCurrency: trip.currency,
          source: 'overview-rate',
        },
      },
    });
  };

  const suggestionStop = addingDestinationKey
    ? trip.destinations?.find((dest) => getRoadtripDestinationKey(dest) === addingDestinationKey)
    : addingCityHint
      ? trip.destinations?.find((dest) => dest.city === addingCityHint)
      : undefined;

  const suggestionDayOptions = suggestionStop
    ? Array.from(
        { length: Math.max(1, suggestionStop.toDay - suggestionStop.fromDay + 1) },
        (_, i) => suggestionStop.fromDay + i,
      )
    : Array.from({ length: days }, (_, i) => i + 1);

  const suggestionType = addingTitle ? detectStepType(addingTitle) : 'sight';
  const suggestionTypeMeta = {
    sight:     { label: 'Visite',    emoji: '🗺️', color: '#7c8cff' },
    food:      { label: 'Resto',     emoji: '🍽️', color: '#f0b24a' },
    transport: { label: 'Transport', emoji: '🚆', color: '#56c5a4' },
    lodging:   { label: 'Logement',  emoji: '🏨', color: '#ec4899' },
    other:     { label: 'Idée',      emoji: '✨', color: '#94a3b8' },
  }[suggestionType];

  const suggestionInfoText = cleanSuggestionInfo(addingInfo);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── LIGNE 1 : 3 stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{days}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Jours</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold font-display">{trip.steps.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">Étapes</div>
        </GlassCard>
        <TripCountdownStat startDate={trip.startDate} endDate={trip.endDate} />
      </div>

      {/* ── Roadtrip banner ── */}
      {trip.isRoadtrip && trip.destinations && trip.destinations.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Map size={14} style={{ color: '#7c8cff' }} />
            <span className="text-xs uppercase tracking-wider text-white/55">
              Itinéraire Roadtrip
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {trip.destinations.map((dest, i) => (
              <div key={`${getRoadtripDestinationKey(dest)}-${i}`} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: 'rgba(124,140,255,0.15)',
                    border:     '1px solid rgba(124,140,255,0.25)',
                    color:      '#a5b4fc',
                  }}
                >
                  {dest.city}
                  <span className="text-white/30 ml-1">
                    J{dest.fromDay}→{dest.toDay}
                  </span>
                </div>
                {i < trip.destinations!.length - 1 && (
                  <ArrowRight size={12} className="text-white/20 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── LIGNE 2 : Budget + Checklist ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard
          className="p-4 flex flex-col items-center cursor-pointer"
          onClick={() => navigate(`/trip/${trip.id}/budget`)}
        >
          <div className="flex items-center gap-2 mb-3 w-full">
            <Wallet size={13} style={{ color: '#f0b24a' }} />
            <span className="text-[10px] uppercase tracking-wider text-white/55">Budget</span>
          </div>
          <Donut
            value={spent}
            max={trip.budget}
            size={90}
            stroke={9}
            color={budgetPct > 90 ? '#ef4444' : '#f0b24a'}
            label={`${budgetPct}%`}
          />
          <div className="mt-2 text-center w-full">
            <div className="text-xs font-semibold tracking-tight truncate">
              {fmtMoney(spent, trip.currency)}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5 truncate">
              / {fmtMoney(trip.budget, trip.currency)}
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-4 flex flex-col items-center cursor-pointer"
          onClick={() => navigate(`/trip/${trip.id}/essentials`)}
        >
          <div className="flex items-center gap-2 mb-3 w-full">
            <CheckCircle2 size={13} style={{ color: '#56c5a4' }} />
            <span className="text-[10px] uppercase tracking-wider text-white/55">
              Préparation
            </span>
          </div>
          <Donut
            value={doneChecklist}
            max={totalChecklist || 1}
            size={90}
            stroke={9}
            color="#56c5a4"
            label={`${checkPct}%`}
          />
          <div className="mt-2 text-center w-full">
            <div className="text-xs font-semibold tracking-tight">
              {doneChecklist}/{totalChecklist}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">prêts</div>
          </div>
        </GlassCard>
      </div>

      {/* ── LIGNE 3 : Météo + Documents ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-5 cursor-pointer" onClick={() => navigate(`/trip/${trip.id}/weather`)}>
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={14} className="text-white/55" />
            <div className="text-xs uppercase tracking-wider text-white/55">Météo</div>
            {!loadingWeather && weather?.ok && (
              <div
                className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                style={{
                  background: 'rgba(86,197,164,0.15)',
                  border:     '1px solid rgba(86,197,164,0.3)',
                  color:      '#56c5a4',
                }}
              >
                <span className="w-1 h-1 rounded-full bg-[#56c5a4] inline-block" />
                LIVE
              </div>
            )}
          </div>
          {loadingWeather && <Spinner label="Chargement..." />}
          {!loadingWeather && weather?.ok && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-4xl mb-1">{weather.icon}</div>
              <div className="text-sm font-semibold tracking-tight leading-tight">
                {weather.label}
              </div>
              <div className="text-2xl font-bold font-display mt-1">{weather.temp}°C</div>
              <div className="flex items-center gap-1 mt-1">
                <Thermometer size={10} className="text-white/35" />
                <span className="text-[10px] text-white/40">
                  Ressenti {weather.feelsLike}°C
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-white/40">
                  <Droplets size={10} /> {weather.humidity}%
                </span>
                <span className="flex items-center gap-1 text-[10px] text-white/40">
                  <Wind size={10} /> {weather.wind} km/h
                </span>
              </div>
              {weatherFromCapital && (
                <div className="mt-2 text-[9px] text-white/25">
                  📍 {CAPITAL_COORDS[trip.countryCode]?.name ?? 'Capitale'}
                </div>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-label)' }}>
                Prévisions 7 jours <ArrowRight size={12} />
              </div>
            </motion.div>
          )}
          {!loadingWeather && (!weather || !weather.ok) && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-3xl mb-1">🌡️</div>
              <div className="text-lg font-bold font-display tracking-tight leading-tight text-white/90">
                Prévisions en attente
              </div>
              <div className="text-[11px] text-white/42 mt-1.5 leading-relaxed">
                Ouvre la météo détaillée
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-label)' }}>
                Voir météo <ArrowRight size={12} />
              </div>
            </motion.div>
          )}
        </GlassCard>

        <GlassCard className="p-5 cursor-pointer" onClick={() => navigate(`/trip/${trip.id}/documents`)}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} style={{ color: 'var(--accent-label)' }} />
            <div className="text-xs uppercase tracking-wider text-white/55">Documents</div>
          </div>
          {docCount > 0 ? (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-4xl mb-1">📄</div>
              <div className="text-2xl font-bold font-display tracking-tight">
                {docCount} fichier{docCount > 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-white/40 mt-1">
                {formatFileSize(docTotalSize)}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {docTicketCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#0770e320', color: '#0770e3', border: '1px solid #0770e335' }}>
                    ✈️ {docTicketCount}
                  </span>
                )}
                {docResaCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#4a90d920', color: '#4a90d9', border: '1px solid #4a90d935' }}>
                    🏨 {docResaCount}
                  </span>
                )}
                {docVisaCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0b24a20', color: '#f0b24a', border: '1px solid #f0b24a35' }}>
                    🛂 {docVisaCount}
                  </span>
                )}
                {docPapiersCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#a855f720', color: '#a855f7', border: '1px solid #a855f735' }}>
                    🪪 {docPapiersCount}
                  </span>
                )}
                {docOtherCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    📎 {docOtherCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-label)' }}>
                Voir tout <ArrowRight size={12} />
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-4xl mb-1">📄</div>
              <div className="text-lg font-bold font-display tracking-tight leading-tight text-white/90">
                Centralise tes documents
              </div>
              <div className="text-[11px] text-white/42 mt-1.5 leading-relaxed">
                Billets · réservations · papiers
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-label)' }}>
                Ajouter <Plus size={12} />
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>

      {/* ── LIGNE 4 : Change + Souvenirs ── */}
      <div className="grid grid-cols-2 gap-3">
        {showRateWidget && (
          <GlassCard
            className="p-4 min-h-[178px] flex flex-col cursor-pointer"
            onClick={() => {
              haptic(4);
              setRateAmount(10);
              setRateFrom(trip.homeCurrency);
              setRateTo(destinationCurrency);
              setQuickRate(rate);
              setQuickRateSource(rateSource);
              setRateSheetOpen(true);
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight size={13} style={{ color: '#56c5a4' }} />
              <div className="text-[10px] uppercase tracking-wider text-white/55 flex-1">
                Taux de change
              </div>
              {loadingRate ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full"
                />
              ) : rateSource === 'live' ? (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                  style={{
                    background: 'rgba(86,197,164,0.15)',
                    border:     '1px solid rgba(86,197,164,0.3)',
                    color:      '#56c5a4',
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-[#56c5a4] inline-block" />
                  LIVE
                </div>
              ) : rateSource === 'offline' ? (
                <div
                  className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                  style={{
                    background: 'rgba(240,178,74,0.12)',
                    border:     '1px solid rgba(240,178,74,0.25)',
                    color:      '#f0b24a',
                  }}
                >
                  Indicatif
                </div>
              ) : null}
            </div>

            {loadingRate && <div className="flex-1 flex items-center justify-center"><Spinner /></div>}
            {!loadingRate && rate === null && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-1">💱</div>
                  <div className="text-lg font-bold font-display tracking-tight leading-tight text-white/90">
                    Taux à actualiser
                  </div>
                  <div className="text-[11px] text-white/42 mt-1.5 leading-relaxed">
                    Conversion rapide disponible
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: '#56c5a4' }}>
                  Convertir <ArrowRight size={12} />
                </div>
              </motion.div>
            )}

            {!loadingRate && rate !== null && (
              <div className="flex-1 flex flex-col">
                <div
                  className="text-xs font-semibold tracking-tight mb-3"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  1 {trip.homeCurrency}{' '}
                  <span className="text-white/35 font-normal">=</span>{' '}
                  <span style={{ color: '#56c5a4' }}>
                    {rate.toFixed(4)} {destinationCurrency}
                  </span>
                </div>

                <div className="space-y-2">
                  {RATE_AMOUNTS.map((amount) => (
                    <div
                      key={amount}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.055)',
                        border:     '1px solid rgba(255,255,255,0.09)',
                      }}
                    >
                      <span className="text-xs text-white/55 font-semibold">
                        {amount} {trip.homeCurrency}
                      </span>
                      <span className="text-xs font-extrabold text-right" style={{ color: '#56c5a4' }}>
                        {formatRateAmount(amount)} {destinationCurrency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        <GlassCard className="p-4 min-h-[178px] flex flex-col cursor-pointer" onClick={openMemorySheet}>
          <div className="flex items-center gap-2 mb-3">
            <Camera size={13} style={{ color: 'var(--accent-label)' }} />
            <div className="text-[10px] uppercase tracking-wider text-white/55 flex-1">
              Souvenirs
            </div>
            {memoryPhotoCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                style={{
                  background: 'rgba(86,197,164,0.14)',
                  border:     '1px solid rgba(86,197,164,0.28)',
                  color:      '#56c5a4',
                }}
              >
                {memoryPhotoCount}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div>
              {memoryPhotoCount > 0 ? (
                <>
                  <div className="text-4xl mb-1">📸</div>
                  <div className="text-2xl font-bold font-display tracking-tight">
                    {memoryPhotoCount} photo{memoryPhotoCount > 1 ? 's' : ''}
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">
                    {memoryCount} souvenir{memoryCount > 1 ? 's' : ''}
                    {memoryDayCount > 0 ? ` · ${memoryDayCount} jour${memoryDayCount > 1 ? 's' : ''}` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-1">📸</div>
                  <div className="text-lg font-bold font-display tracking-tight leading-tight text-white/90">
                    Capture tes moments
                  </div>
                  <div className="text-[11px] text-white/42 mt-1.5 leading-relaxed">
                    Photos · anecdotes
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-label)' }}>
              Ajouter <Plus size={12} />
            </div>
          </div>
        </GlassCard>
      </div>

      <BottomSheet
        open={rateSheetOpen}
        onClose={() => setRateSheetOpen(false)}
        title="Conversion rapide"
      >
        <div className="space-y-5">
          <div
            className="rounded-[24px] p-4"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border:     '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight size={14} style={{ color: '#56c5a4' }} />
              <div className="text-xs uppercase tracking-wider text-white/55 flex-1">
                Taux de change
              </div>
              {rateSource === 'live' && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: 'rgba(86,197,164,0.15)',
                    border:     '1px solid rgba(86,197,164,0.3)',
                    color:      '#56c5a4',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4]" />
                  LIVE
                </span>
              )}
            </div>

            {rate !== null ? (
              <div className="text-sm font-semibold tracking-tight text-white/78">
                1 {trip.homeCurrency}{' '}
                <span className="text-white/35 font-normal">=</span>{' '}
                <span style={{ color: '#56c5a4' }}>
                  {rate.toFixed(4)} {destinationCurrency}
                </span>
              </div>
            ) : (
              <div className="text-sm text-white/40">Taux temporairement indisponible</div>
            )}
          </div>

          <div
            className="rounded-[24px] p-4"
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">De</div>
                <div className="text-lg font-bold font-display tracking-tight">{rateFrom}</div>
              </div>
              <button
                onClick={() => {
                  const from = rateFrom;
                  setRateFrom(rateTo);
                  setRateTo(from);
                  setQuickRate(null);
                }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center tap"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                aria-label="Inverser les devises"
              >
                <ArrowLeftRight size={15} className="text-white/55" />
              </button>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Vers</div>
                <div className="text-lg font-bold font-display tracking-tight">{rateTo}</div>
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
              Montant à convertir
            </div>
            <div className="flex items-baseline gap-2">
              <input
                value={Number.isFinite(rateAmount) ? String(rateAmount) : ''}
                onChange={(e) => {
                  setRateAmount(Number(e.target.value) || 0);
                  setQuickRate(null);
                }}
                inputMode="decimal"
                type="number"
                className="min-w-0 flex-1 bg-transparent outline-none text-3xl font-bold font-display tracking-tight"
              />
              <span className="text-sm font-semibold text-white/45">{rateFrom}</span>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {RATE_SHEET_AMOUNTS.map((amount) => {
                const active = rateAmount === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => {
                      setRateAmount(amount);
                      setQuickRate(null);
                    }}
                    className="h-10 rounded-2xl text-xs font-bold tap"
                    style={{
                      background: active ? 'rgba(86,197,164,0.16)' : 'rgba(255,255,255,0.055)',
                      border: active ? '1px solid rgba(86,197,164,0.32)' : '1px solid rgba(255,255,255,0.10)',
                      color: active ? '#56c5a4' : 'rgba(255,255,255,0.62)',
                    }}
                  >
                    {amount}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleQuickConvert}
            disabled={quickRateLoading || rateAmount <= 0}
            className="w-full h-12 rounded-2xl font-semibold text-sm tap disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)', color: '#fff' }}
          >
            {quickRateLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-4 h-4 border border-white/25 border-t-white rounded-full"
              />
            ) : (
              <ArrowLeftRight size={15} />
            )}
            Convertir
          </button>

          <div
            className="rounded-[24px] p-4"
            style={{ background: 'rgba(86,197,164,0.08)', border: '1px solid rgba(86,197,164,0.18)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
              Résultat
            </div>
            <div className="text-3xl font-bold font-display tracking-tight" style={{ color: '#56c5a4' }}>
              {convertedRateAmount === null
                ? '—'
                : convertedRateAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-semibold text-white/45 mt-0.5">{rateTo}</div>
            {quickRate !== null && (
              <div className="text-[11px] text-white/32 mt-2">
                1 {rateFrom} = {quickRate.toFixed(4)} {rateTo}
                {quickRateSource === 'offline' ? ' · indicatif' : ''}
              </div>
            )}
          </div>

          <button
            onClick={handleAddConvertedExpense}
            disabled={rateAmount <= 0}
            className="w-full h-12 rounded-2xl font-semibold text-sm glass tap disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Ajouter une dépense
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={memoryOpen}
        onClose={closeMemorySheet}
        title="Ajouter un souvenir"
      >
        <div className="space-y-4">
          <div
            className="rounded-[24px] p-4"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border:     '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">📸</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold tracking-tight text-white/92">
                  Souvenir libre
                </div>
                <div className="text-xs text-white/45 leading-relaxed mt-1">
                  Ajoute une ou plusieurs photos. Le jour et l’activité sont optionnels.
                </div>
                <div className="text-[11px] text-white/32 leading-relaxed mt-2">
                  Photos stockées uniquement sur cet appareil.
                </div>
              </div>
            </div>
          </div>

          <label
            className="block rounded-2xl p-4 tap cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border:     '1px dashed rgba(255,255,255,0.18)',
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setMemoryFiles(files.filter((file) => file.type.startsWith('image/')));
              }}
            />
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/75">
              <Camera size={16} />
              {memoryFiles.length > 0
                ? `${memoryFiles.length} photo${memoryFiles.length > 1 ? 's' : ''} sélectionnée${memoryFiles.length > 1 ? 's' : ''}`
                : 'Choisir une ou plusieurs photos'}
            </div>
          </label>

          {memoryFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {memoryFiles.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              Jour
            </div>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              <button
                onClick={() => {
                  setMemoryDay(null);
                  setMemoryStepId('');
                }}
                className="flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold tap"
                style={{
                  background: memoryDay === null
                    ? 'rgba(var(--accent-from-rgb), 0.18)'
                    : 'rgba(255,255,255,0.055)',
                  border: memoryDay === null
                    ? '1px solid rgba(var(--accent-from-rgb), 0.34)'
                    : '1px solid rgba(255,255,255,0.10)',
                  color: memoryDay === null ? 'var(--accent-label)' : 'rgba(255,255,255,0.58)',
                }}
              >
                Libre
              </button>
              {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                const active = memoryDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setMemoryDay(d);
                      const linkedStep = trip.steps.find((step) => step.id === memoryStepId);
                      if (linkedStep && linkedStep.day !== d) setMemoryStepId('');
                    }}
                    className="flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold tap"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                        : 'rgba(255,255,255,0.055)',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.10)',
                      color: '#fff',
                    }}
                  >
                    J{d}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              Activité liée
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              <button
                onClick={() => setMemoryStepId('')}
                className="w-full px-3 py-3 rounded-2xl text-left tap flex items-center justify-between"
                style={{
                  background: memoryStepId === ''
                    ? 'rgba(var(--accent-from-rgb), 0.14)'
                    : 'rgba(255,255,255,0.045)',
                  border: memoryStepId === ''
                    ? '1px solid rgba(var(--accent-from-rgb), 0.30)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span className="text-sm font-semibold text-white/78">Aucune activité</span>
                {memoryStepId === '' && <Check size={14} style={{ color: 'var(--accent-label)' }} />}
              </button>

              {trip.steps
                .filter((step) => memoryDay === null || step.day === memoryDay)
                .map((step) => {
                  const active = memoryStepId === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        setMemoryStepId(step.id);
                        setMemoryDay(step.day);
                      }}
                      className="w-full px-3 py-3 rounded-2xl text-left tap flex items-center gap-3"
                      style={{
                        background: active
                          ? 'rgba(var(--accent-from-rgb), 0.14)'
                          : 'rgba(255,255,255,0.045)',
                        border: active
                          ? '1px solid rgba(var(--accent-from-rgb), 0.30)'
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/6 flex items-center justify-center text-xs font-bold text-white/55 flex-shrink-0">
                        J{step.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/82 truncate">
                          {step.title}
                        </div>
                        <div className="text-[11px] text-white/38 truncate">
                          {step.place}
                        </div>
                      </div>
                      {active && <Check size={14} style={{ color: 'var(--accent-label)' }} />}
                    </button>
                  );
                })}

              {trip.steps.filter((step) => memoryDay === null || step.day === memoryDay).length === 0 && (
                <div className="text-xs text-white/35 px-2 py-2">
                  Aucune activité pour ce jour. Tu peux garder le souvenir libre.
                </div>
              )}
            </div>
          </div>

          <label className="block">
            <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
              Légende optionnelle
            </div>
            <textarea
              value={memoryCaption}
              onChange={(e) => setMemoryCaption(e.target.value)}
              placeholder="Écrire un souvenir, une sensation, une anecdote..."
              rows={3}
              className="w-full glass rounded-2xl px-4 py-3 bg-transparent outline-none resize-none text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={closeMemorySheet}
              disabled={memorySaving}
              className="h-12 rounded-2xl font-semibold text-sm glass tap disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={saveMemory}
              disabled={memorySaving || memoryFiles.length === 0}
              className="h-12 rounded-2xl font-semibold text-sm tap disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                color: '#fff',
              }}
            >
              {memorySaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-4 h-4 border border-white/25 border-t-white rounded-full"
                />
              ) : (
                <Camera size={15} />
              )}
              Ajouter
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── CONSEIL ARIA DYNAMIQUE ── */}
      <GlassCard className="p-5 overflow-hidden min-h-[292px] flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--accent-from-rgb),0.18), rgba(236,72,153,0.10))',
                border:     '1px solid rgba(var(--accent-from-rgb),0.28)',
                boxShadow:  '0 10px 30px rgba(var(--accent-from-rgb),0.12)',
              }}
            >
              <Sparkles size={17} style={{ color: 'var(--accent-label)' }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-sm font-semibold tracking-tight leading-none"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                ARIA
              </div>
              <div className="text-[11px] text-white/38 mt-1">
                Conseil intelligent
              </div>
            </div>
          </div>
          <div
            className="px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
            style={{
              background: 'rgba(86,197,164,0.12)',
              border:     '1px solid rgba(86,197,164,0.24)',
              color:      '#56c5a4',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#56c5a4]" />
            Live
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-3 mb-3">
          {adviceFamilies.map((family) => {
            const active = adviceFamily === family.key;
            return (
              <button
                key={family.key}
                onClick={() => {
                  haptic(4);
                  setAdviceFamily(family.key);
                }}
                className="flex-shrink-0 h-9 rounded-full text-[11px] font-semibold tap flex items-center justify-center gap-1.5 transition-all"
                style={{
                  paddingInline: active ? 12 : 10,
                  minWidth: active ? 'auto' : 38,
                  background: active
                    ? 'rgba(var(--accent-from-rgb), 0.18)'
                    : 'rgba(255,255,255,0.055)',
                  border: active
                    ? '1px solid rgba(var(--accent-from-rgb), 0.34)'
                    : '1px solid rgba(255,255,255,0.10)',
                  color: active ? 'var(--accent-label)' : 'rgba(255,255,255,0.55)',
                }}
                aria-label={`Conseil ${family.label}`}
              >
                <span>{family.emoji}</span>
                {active && <span>{family.label}</span>}
              </button>
            );
          })}
        </div>

        <motion.div
          key={`${ariaAdvice.family}-${ariaAdvice.title}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="rounded-[26px] p-4 mb-4 h-[132px] flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.055)',
            border:     '1px solid rgba(255,255,255,0.10)',
            boxShadow:  'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{ariaAdvice.emoji}</span>
            <div className="text-[15px] font-semibold tracking-tight leading-snug text-white/90 truncate">
              {ariaAdvice.title}
            </div>
          </div>
          <div
            className="text-sm text-white/62 leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ariaAdvice.body}
          </div>
        </motion.div>

        <div className="flex gap-2 mt-auto">
          {ariaAdvice.checklistLabel && (
            <button
              onClick={addAdviceToChecklist}
              className="h-10 px-3 rounded-2xl text-xs font-semibold tap flex items-center gap-1.5"
              style={{
                background: 'rgba(86,197,164,0.12)',
                border:     '1px solid rgba(86,197,164,0.24)',
                color:      '#56c5a4',
              }}
            >
              <Plus size={13} /> Checklist
            </button>
          )}
          <button
            onClick={() => navigate(`/trip/${trip.id}/chat`)}
            className="h-10 px-3 rounded-2xl text-xs font-semibold tap flex items-center gap-1.5"
            style={{
              background: 'rgba(var(--accent-from-rgb), 0.12)',
              border:     '1px solid rgba(var(--accent-from-rgb), 0.25)',
              color:      'var(--accent-label)',
            }}
          >
            <MessageCircle size={13} /> Discuter
          </button>
        </div>
      </GlassCard>

      {/* ── SUGGESTIONS IA ── */}
      <GlassCard className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {loadingAI ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/20 border-t-[#7c8cff] rounded-full"
            />
          ) : (
            <Sparkles size={16} style={{ color: '#7c8cff' }} />
          )}
          <div className="text-sm font-semibold tracking-tight flex-1">
            {loadingAI ? 'Suggestions · Analyse...' : 'Suggestions IA'}
          </div>
          {assistantOffline && !loadingAI && (
            <WifiOff size={12} className="text-white/30" />
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(124,140,255,0.15)', color: '#7c8cff' }}
          >
            IA
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleRefreshSuggestions(); }}
            disabled={loadingAI}
            className="w-8 h-8 rounded-xl flex items-center justify-center tap disabled:opacity-40"
            style={{
              background: 'rgba(124,140,255,0.12)',
              border: '1px solid rgba(124,140,255,0.25)',
            }}
            aria-label="Nouvelles suggestions"
          >
            <motion.div
              animate={loadingAI ? { rotate: 360 } : { rotate: 0 }}
              transition={loadingAI ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.3 }}
            >
              <RefreshCw size={13} style={{ color: '#7c8cff' }} />
            </motion.div>
          </button>
        </div>

        {assistantOffline && !loadingAI && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4"
            style={{
              background: 'rgba(240,178,74,0.1)',
              border: '1px solid rgba(240,178,74,0.2)',
              color: '#f0b24a',
            }}
          >
            <WifiOff size={12} /> Mode hors-ligne
          </div>
        )}

        {/* 🗺️ Suggestions — voyage simple */}
        {!trip.isRoadtrip && availableSuggestions.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1">
              🗺️ Suggestions
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {(showAllSuggestions ? availableSuggestions : availableSuggestions.slice(0, 3)).map((suggestion, i) => {
                  const suggestionIndex = assistantData?.ok
                    ? assistantData.stepSuggestions.findIndex((item) => item === suggestion)
                    : i;
                  const details = getDisplaySuggestionDetails(
                    suggestion,
                    suggestionIndex >= 0 ? suggestionIndex : i,
                  );
                  const { emoji } = details;
                  const text = details.title;
                  return (
                    <motion.div
                      key={suggestion}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, height: 0 }}
                      transition={{ delay: i * 0.04, layout: { type: 'spring', damping: 26 } }}
                      onClick={() => openAddSuggestion(
                        suggestion,
                        '',
                        getStructuredSuggestionDetail(suggestion, suggestionIndex >= 0 ? suggestionIndex : i),
                        suggestionIndex >= 0 ? suggestionIndex : i,
                      )}
                      className="flex items-center gap-3 p-3 rounded-xl tap cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium tracking-tight truncate">{text}</span>
                        {details.place && (
                          <span className="block text-[11px] text-white/35 truncate mt-0.5">{details.place}</span>
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddSuggestion(
                            suggestion,
                            '',
                            getStructuredSuggestionDetail(suggestion, suggestionIndex >= 0 ? suggestionIndex : i),
                            suggestionIndex >= 0 ? suggestionIndex : i,
                          );
                        }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center tap flex-shrink-0"
                        style={{
                          background: 'rgba(124,140,255,0.2)',
                          border: '1px solid rgba(124,140,255,0.3)',
                        }}
                        aria-label={`Ajouter ${text} au parcours`}
                      >
                        <Plus size={13} style={{ color: '#7c8cff' }} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {availableSuggestions.length > 3 && (
              <button
                onClick={() => {
                  haptic(4);
                  setShowAllSuggestions((v) => !v);
                }}
                className="w-full mt-3 h-10 rounded-2xl text-xs font-semibold tap flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.055)',
                  border:     '1px solid rgba(255,255,255,0.10)',
                  color:      'rgba(255,255,255,0.62)',
                }}
              >
                {showAllSuggestions ? 'Réduire' : `Voir les ${availableSuggestions.length - 3} autres`}
                <motion.div
                  animate={{ rotate: showAllSuggestions ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>
            )}
            {availableSuggestions.length === 0 && !loadingAI && (
              <p className="text-xs text-white/30 text-center py-2">
                Toutes les suggestions ont été ajoutées !
              </p>
            )}
          </div>
        )}

        {/* 🗺️ Suggestions — roadtrip — tabs par ville */}
        {trip.isRoadtrip && trip.destinations && trip.destinations.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1">
              🗺️ Suggestions par ville
            </div>

            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 mb-3">
              {trip.destinations.map((dest, index) => {
                const destKey = getRoadtripDestinationKey(dest);
                const active = selectedSuggestionKey === destKey;
                return (
                  <button
                    key={`${destKey}-${index}`}
                    onClick={() => {
                      haptic(4);
                      setSelectedSuggestionKey(destKey);
                    }}
                    className="flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold tap"
                    style={{
                      background: active
                        ? 'rgba(var(--accent-from-rgb), 0.18)'
                        : 'rgba(255,255,255,0.055)',
                      border: active
                        ? '1px solid rgba(var(--accent-from-rgb), 0.34)'
                        : '1px solid rgba(255,255,255,0.10)',
                      color: active ? 'var(--accent-label)' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    {dest.city}
                    <span className="ml-1 text-white/30 font-medium">
                      J{dest.fromDay}→{dest.toDay}
                    </span>
                  </button>
                );
              })}
            </div>

            {(() => {
              const selectedDest = trip.destinations?.find((dest) => getRoadtripDestinationKey(dest) === selectedSuggestionKey)
                ?? trip.destinations?.[0];
              const selectedDestKey = selectedDest ? getRoadtripDestinationKey(selectedDest) : '';
              if (!selectedDest) return null;
              return (
                <CityAccordion
                  key={selectedDestKey}
                  destination={selectedDest}
                  destinationKey={selectedDestKey}
                  tripId={trip.id}
                  tripCountry={trip.country}
                  tripBudget={trip.budget}
                  tripCurrency={trip.currency}
                  isOpen
                  onToggle={() => undefined}
                  onAddToTrip={handleAddFromRoadtrip}
                  mode="panel"
                />
              );
            })()}
          </div>
        )}

      </GlassCard>

      {/* ── BottomSheet Assistant ── */}
      <BottomSheet
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={`Assistant · ${trip.isRoadtrip ? trip.country : trip.destination}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-white/55">
            <Lightbulb size={14} style={{ color: '#7c8cff' }} />
            {assistantOffline
              ? 'Conseils généraux (hors-ligne)'
              : trip.isRoadtrip
              ? `Astuces pour votre roadtrip en ${trip.country}`
              : 'Astuces locales par votre assistant IA'}
          </div>
          {assistantOffline && !loadingAI && (
            <button
              onClick={(e) => { e.stopPropagation(); loadAssistant(true); }}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(124,140,255,0.15)',
                color:      '#7c8cff',
                border:     '1px solid rgba(124,140,255,0.3)',
              }}
            >
              <RefreshCw size={11} /> Réessayer
            </button>
          )}
        </div>

        {assistantOffline && !loadingAI && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4"
            style={{
              background: 'rgba(240,178,74,0.1)',
              border:     '1px solid rgba(240,178,74,0.2)',
              color:      '#f0b24a',
            }}
          >
            <WifiOff size={12} /> Assistant IA temporairement indisponible.
          </div>
        )}

        <AnimatePresence mode="wait">
          {loadingAI ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
              />
              <p className="text-sm text-white/50">
                Préparation de vos conseils pour{' '}
                {trip.isRoadtrip ? trip.country : trip.destination}...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="tips"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {assistantData?.ok &&
                assistantData.tips.map((tip, i) => (
                  <TipCard key={i} tip={tip} index={i} />
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>

      {/* ── BottomSheet Suggestion ARIA ── */}
      <BottomSheet
        open={!!addingTitle}
        onClose={() => {
          setAddingTitle(null);
          setAddingRawTitle('');
          setAddingInfo('');
          setAddingCityHint('');
          setAddingDestinationKey('');
        }}
        title="Suggestion ARIA"
      >
        {addingTitle && (
          <div className="space-y-5">
            <div
              className="rounded-[24px] p-4"
              style={{
                background: 'rgba(255,255,255,0.055)',
                border:     '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{
                    background: `${suggestionTypeMeta.color}18`,
                    border:     `1px solid ${suggestionTypeMeta.color}35`,
                  }}
                >
                  {parseEmojiFromSuggestion(addingTitle).emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      style={{
                        background: `${suggestionTypeMeta.color}16`,
                        border:     `1px solid ${suggestionTypeMeta.color}30`,
                        color:      suggestionTypeMeta.color,
                      }}
                    >
                      {suggestionTypeMeta.emoji} {suggestionTypeMeta.label}
                    </span>
                    {suggestionStop && (
                      <span className="text-[10px] text-white/32">
                        J{suggestionStop.fromDay}→{suggestionStop.toDay}
                      </span>
                    )}
                  </div>
                  <div className="font-bold tracking-tight text-white/92 leading-snug">
                    {addingTitle}
                  </div>
                  {suggestionInfoText && (
                    <div className="text-xs text-white/45 leading-relaxed mt-2">
                      {suggestionInfoText}
                    </div>
                  )}
                  {addingCityHint && addingCityHint !== trip.destination && (
                    <span className="text-xs text-white/40 mt-2 block">
                      📍 {addingCityHint}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📅 Quel jour ?
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {suggestionDayOptions.map((d) => {
                  const dateISO = addDaysISO(trip.startDate, d - 1);
                  const active  = addDay === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setAddDay(d)}
                      className="flex-shrink-0 rounded-2xl px-4 py-3 tap min-w-[68px] text-center transition"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                          : 'rgba(var(--accent-from-rgb), 0.13)',
                        border: active ? 'none' : '1px solid rgba(var(--accent-from-rgb), 0.28)',
                        color: '#ffffff',
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-65">Jour {d}</div>
                      <div className="text-lg font-bold font-display tracking-tight">
                        {new Date(dateISO).getDate()}
                      </div>
                      <div className="text-[10px] opacity-65">
                        {new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                🕐 Quel moment ?
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map((p) => {
                  const active = addPeriod === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setAddPeriod(p.key)}
                      className="rounded-2xl p-3 flex flex-col items-center gap-1.5 tap transition"
                      style={{
                        background: active ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                        border: active
                          ? `1px solid ${p.color}60`
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: active ? p.color : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {p.label}
                      </span>
                      {active && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: p.color }}
                        >
                          <Check size={10} className="text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📍 Lieu
              </div>
              <input
                value={addPlace}
                onChange={(e) => setAddPlace(e.target.value)}
                placeholder={addingCityHint || trip.destination}
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
            </div>

            <button
              onClick={confirmAddSuggestion}
              className="w-full h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
              }}
            >
              <Check size={16} /> Ajouter au parcours
            </button>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};
