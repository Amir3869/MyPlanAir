// src/features/parcours/Parcours.tsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, SunDim, Moon, Plus, Check, Trash2,
  MapPin, Sparkles, ChevronRight, Map, ExternalLink, RefreshCw, Camera,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore, type Step, type StepPeriod, type StepType, type TripMemory } from '../../store/tripStore';
import { fetchItinerary, type ItineraryPayload } from '../decouvrir/itineraryApi';
import { GlassCard } from '../../shared/GlassCard';
import { BottomSheet } from '../../shared/BottomSheet';
import { useToast } from '../../shared/Toast';
import { daysBetween, getTimeOfDay, addDaysISO, fmtDate } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';
import { geocodePlace } from '../../utils/geo';
import { MemoryStorage } from '../../utils/memoryStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS: { key: StepPeriod; label: string; icon: typeof Sun; color: string }[] = [
  { key: 'morning',   label: 'Matin',      icon: Sun,    color: '#56c5a4' },
  { key: 'afternoon', label: 'Après-midi', icon: SunDim, color: '#f0b24a' },
  { key: 'night',     label: 'Soir',       icon: Moon,   color: '#7c8cff' },
];

const TYPES: { key: StepType; label: string; emoji: string; color: string }[] = [
  { key: 'sight',     label: 'Visite',    emoji: '🗺️', color: '#7c8cff' },
  { key: 'food',      label: 'Resto',     emoji: '🍽️', color: '#f0b24a' },
  { key: 'transport', label: 'Transport', emoji: '🚆', color: '#56c5a4' },
  { key: 'lodging',   label: 'Logement',  emoji: '🏨', color: '#ec4899' },
  { key: 'other',     label: 'Autre',     emoji: '📌', color: '#94a3b8' },
];

type AiSheetMode = 'full' | 'day';
type AiProximityMode = 'city' | 'gps' | 'custom';
type AiActivityFamily = 'balanced' | 'culture' | 'food' | 'nature' | 'chill' | 'family' | 'shopping' | 'unusual';

type AiGenerationPreferences = {
  scope: 'full' | 'day' | 'period';
  activityFamilies: AiActivityFamily[];
  avoid?: string;
  targetPeriods?: StepPeriod[];
  targetDays?: number[];
};

type LocalBaseResult = {
  label: string;
  subtitle: string;
  countryCode: string;
  lat: number;
  lon: number;
};

const AI_ACTIVITY_FAMILIES: { key: AiActivityFamily; label: string; emoji: string }[] = [
  { key: 'balanced', label: 'Équilibré', emoji: '✨' },
  { key: 'culture',  label: 'Culture',   emoji: '🏛️' },
  { key: 'food',     label: 'Food',      emoji: '🍽️' },
  { key: 'nature',   label: 'Nature',    emoji: '🌿' },
  { key: 'chill',    label: 'Chill',     emoji: '🫧' },
  { key: 'family',   label: 'Famille',   emoji: '👨‍👩‍👧' },
  { key: 'shopping', label: 'Shopping',  emoji: '🛍️' },
  { key: 'unusual',  label: 'Insolite',  emoji: '🧭' },
];

const PROXIMITY_PLACEHOLDER_EXAMPLES: Record<string, string> = {
  FR: 'Ex : Bron, Montmartre, Hôtel de Ville...',
  MA: 'Ex : Guéliz, Médina, Riad Yasmine...',
  MY: 'Ex : Kuala Lumpur, George Town, Langkawi...',
  GB: 'Ex : Soho, Shoreditch, Westminster...',
  US: 'Ex : Manhattan, Brooklyn, Downtown...',
  ES: 'Ex : Eixample, Gràcia, Centro...',
  IT: 'Ex : Trastevere, Centro Storico, Navigli...',
  JP: 'Ex : Shinjuku, Shibuya, Gion...',
};

// ─────────────────────────────────────────────────────────────────────────────
// Palette couleurs par ville (roadtrip)
// ─────────────────────────────────────────────────────────────────────────────
const CITY_PALETTE = [
  '#56c5a4', '#ec4899', '#7c8cff', '#f0b24a',
  '#a78bfa', '#34d399', '#fb923c', '#38bdf8',
];

const buildCityColorMap = (
  destinations: { city: string }[] | undefined,
): Record<string, string> => {
  if (!destinations || destinations.length === 0) return {};
  const uniqueCities = Array.from(new Set(destinations.map((d) => d.city)));
  const map: Record<string, string> = {};
  uniqueCities.forEach((city, idx) => {
    map[city] = CITY_PALETTE[idx % CITY_PALETTE.length];
  });
  return map;
};

const getCityForDay = (
  day: number,
  destinations: { city: string; fromDay: number; toDay: number }[] | undefined,
): string | null => {
  if (!destinations || destinations.length === 0) return null;
  const dest = destinations.find((d) => day >= d.fromDay && day <= d.toDay);
  return dest?.city ?? destinations[destinations.length - 1].city;
};

// ─────────────────────────────────────────────────────────────────────────────
// CityDaySeparator
// ─────────────────────────────────────────────────────────────────────────────
const CityDaySeparator = ({
  city, fromDay, toDay, color,
}: {
  city: string; fromDay: number; toDay: number; color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex items-center gap-3 mb-4 px-1"
  >
    <div className="flex-1 h-px" style={{ background: `${color}40` }} />
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: `${color}15`, border: `1px solid ${color}40` }}
    >
      <Map size={11} style={{ color }} />
      <span className="text-xs font-semibold tracking-tight" style={{ color }}>
        {city}
      </span>
      <span className="text-[10px] text-white/35">
        J{fromDay}→{toDay}
      </span>
    </div>
    <div className="flex-1 h-px" style={{ background: `${color}40` }} />
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Parcours principal
// ─────────────────────────────────────────────────────────────────────────────
export const Parcours = () => {
  const { trip }   = useTripContext();
  const days       = daysBetween(trip.startDate, trip.endDate);
  const updateStep = useTripStore((s) => s.updateStep);
  const removeStep = useTripStore((s) => s.removeStep);
  const updateTrip = useTripStore((s) => s.updateTrip);
  const addMemory  = useTripStore((s) => s.addMemory);
  const detachMemoriesFromStep = useTripStore((s) => s.detachMemoriesFromStep);
  const travelStyle = useTripStore((s) => s.travelStyle);
  const { success, error, info } = useToast();

  const [selectedDay,          setSelectedDay]          = useState(1);
  const [adderOpen,            setAdderOpen]            = useState(false);
  const [adderPeriod,          setAdderPeriod]          = useState<StepPeriod>('morning');
  const [infoStep,             setInfoStep]             = useState<Step | null>(null);
  const [generatingItinerary,  setGeneratingItinerary]  = useState(false);
  const [generatingTarget,     setGeneratingTarget]     = useState<string | null>(null);
  const [aiSheetMode,          setAiSheetMode]          = useState<AiSheetMode | null>(null);
  const [aiSelectedPeriods,    setAiSelectedPeriods]    = useState<StepPeriod[]>(['morning', 'afternoon', 'night']);
  const [aiFamilies,           setAiFamilies]           = useState<AiActivityFamily[]>(['balanced']);
  const [aiAvoid,              setAiAvoid]              = useState('');
  const [aiProximityMode,      setAiProximityMode]      = useState<AiProximityMode>('city');
  const [aiProximityLabel,     setAiProximityLabel]     = useState('');
  const [aiProximityCoords,    setAiProximityCoords]    = useState<{ lat: number; lon: number } | null>(null);
  const [aiProximityResults,   setAiProximityResults]   = useState<LocalBaseResult[]>([]);
  const [aiProximitySearching, setAiProximitySearching] = useState(false);
  const [aiProximityLoading,   setAiProximityLoading]   = useState(false);
  const aiProximityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiProximityAbortRef    = useRef<AbortController | null>(null);
  const [regenPeriod,          setRegenPeriod]          = useState<StepPeriod | null>(null);
  const [regenSuggestion,      setRegenSuggestion]      = useState<Step | null>(null);
  const [regenLoading,         setRegenLoading]         = useState(false);
  const [memoryStep,           setMemoryStep]           = useState<Step | null>(null);
  const [memoryFiles,          setMemoryFiles]          = useState<File[]>([]);
  const [memoryCaption,        setMemoryCaption]        = useState('');
  const [memorySaving,         setMemorySaving]         = useState(false);
  const [memoryPreviewUrls,    setMemoryPreviewUrls]    = useState<{
    key: string; name: string; url: string;
  }[]>([]);

  useEffect(() => {
    const previews = memoryFiles.map((file, index) => ({
      key:  `${file.name}-${file.size}-${file.lastModified}-${index}`,
      name: file.name,
      url:  URL.createObjectURL(file),
    }));

    setMemoryPreviewUrls(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [memoryFiles]);

  useEffect(() => {
    const safeDays = Math.max(1, days);
    setSelectedDay((current) => Math.min(Math.max(current, 1), safeDays));
  }, [days, trip.id]);

  const cityColorMap = useMemo(
    () => buildCityColorMap(trip.destinations),
    [trip.destinations],
  );

  const currentCity = useMemo(
    () => getCityForDay(selectedDay, trip.destinations),
    [selectedDay, trip.destinations],
  );

  const currentDestination = useMemo(() => {
    if (!trip.destinations) return null;
    return (
      trip.destinations.find(
        (d) => selectedDay >= d.fromDay && selectedDay <= d.toDay,
      ) ?? null
    );
  }, [selectedDay, trip.destinations]);

  const currentCityColor = currentCity
    ? (cityColorMap[currentCity] ?? '#7c8cff')
    : '#7c8cff';

  const stepsByPeriod = useMemo(() => {
    const map: Record<StepPeriod, Step[]> = { morning: [], afternoon: [], night: [] };
    trip.steps.filter((s) => s.day === selectedDay).forEach((s) => map[s.period].push(s));
    return map;
  }, [trip.steps, selectedDay]);

  const currentPeriod = getTimeOfDay();

  const isToday = (() => {
    const start = new Date(trip.startDate); start.setHours(0, 0, 0, 0);
    const now   = new Date(); now.setHours(0, 0, 0, 0);
    const dayIdx = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    return dayIdx === selectedDay;
  })();

  const openAdder = (period: StepPeriod) => {
    setAdderPeriod(period);
    setAdderOpen(true);
  };

  const buildStepSearchQuery = (step: Step) => [step.title, step.place, trip.country]
    .filter(Boolean)
    .join(' ');

  const openStepInMaps = (step: Step) => {
    const query = buildStepSearchQuery(step);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openStepActivity = (step: Step) => {
    const query = buildStepSearchQuery(step);
    const url = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMemorySheet = (step: Step) => {
    haptic(6);
    setMemoryStep(step);
    setMemoryFiles([]);
    setMemoryCaption('');
  };

  const closeMemorySheet = () => {
    if (memorySaving) return;
    setMemoryStep(null);
    setMemoryFiles([]);
    setMemoryCaption('');
  };

  const saveMemory = async () => {
    if (!memoryStep || memoryFiles.length === 0 || memorySaving) return;
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

      const memory: TripMemory = {
        id: memoryId,
        day: memoryStep.day,
        stepId: memoryStep.id,
        title: memoryStep.title,
        caption: memoryCaption.trim() || undefined,
        photoIds,
        createdAt: new Date().toISOString(),
      };

      addMemory(trip.id, memory);
      success(photoIds.length > 1 ? `${photoIds.length} photos ajoutées` : 'Photo souvenir ajoutée');
      setMemoryStep(null);
      setMemoryFiles([]);
      setMemoryCaption('');
    } catch (err) {
      if (photoIds.length > 0) {
        await Promise.allSettled(
          photoIds.map((photoId) => MemoryStorage.removePhoto(trip.id, photoId)),
        );
      }
      console.warn('[Parcours] Erreur ajout souvenir:', err);
      error('Impossible d’ajouter ce souvenir.');
    } finally {
      setMemorySaving(false);
    }
  };

  const selectedDaySteps = useMemo(
    () => trip.steps.filter((s) => s.day === selectedDay),
    [trip.steps, selectedDay],
  );

  const memories = trip.memories ?? [];

  const isSelectedDayEmpty = selectedDaySteps.length === 0;

  const hasMemoryForStep = (stepId: string): boolean =>
    memories.some((memory) => memory.stepId === stepId && memory.photoIds.length > 0);

  const normalizeForCompare = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isSimilarToExisting = (candidate: Step, existing: Step[]): boolean => {
    const candidateTitle = normalizeForCompare(candidate.title);
    if (!candidateTitle) return false;

    return existing.some((step) => {
      const title = normalizeForCompare(step.title);
      if (!title) return false;

      // Important roadtrip : le lieu est souvent volontairement la même ville
      // (ex: Kyoto). On ne le considère donc PAS comme un doublon à lui seul.
      // On compare seulement l'activité/titre.
      return (
        candidateTitle === title ||
        (candidateTitle.length > 8 && title.length > 8 && candidateTitle.includes(title)) ||
        (candidateTitle.length > 8 && title.length > 8 && title.includes(candidateTitle))
      );
    });
  };

  const mentionsAnotherRoadtripCity = (candidate: Step): boolean => {
    if (!trip.isRoadtrip || !currentCity || !trip.destinations) return false;
    const text = normalizeForCompare([
      candidate.title,
      candidate.place,
      candidate.notes ?? '',
    ].join(' '));
    const activeCity = normalizeForCompare(currentCity);

    return trip.destinations.some((dest) => {
      const city = normalizeForCompare(dest.city);
      return city !== activeCity && city.length > 2 && text.includes(city);
    });
  };

  const buildTargetPayload = (
    targetDays = 1,
    preferences?: AiGenerationPreferences,
    proximity?: ItineraryPayload['proximity'],
  ): ItineraryPayload => {
    const activeCity = currentCity?.trim();
    const shouldLockCity = !!trip.isRoadtrip && !!activeCity;

    return {
      trip: {
        destination: shouldLockCity ? activeCity : trip.destination,
        country:     trip.country,
        countryCode: trip.countryCode,
        days:        targetDays,
        budget:      Math.max(1, Math.round(trip.budget / Math.max(days, 1)) * targetDays),
        currency:    trip.currency,
        // En génération ciblée roadtrip, on force un mini-roadtrip d'un jour
        // pour que le Worker verrouille la ville via fromDay/toDay.
        isRoadtrip:  shouldLockCity,
        destinations: shouldLockCity
          ? [{ city: activeCity, fromDay: 1, toDay: targetDays }]
          : undefined,
      },
      style: travelStyle,
      proximity,
      preferences,
    };
  };

  const appendGeneratedSteps = (newSteps: Step[]) => {
    if (newSteps.length === 0) return;
    updateTrip(trip.id, { steps: [...trip.steps, ...newSteps] });
  };

  const generateDayItinerary = async (
    preferences?: AiGenerationPreferences,
    proximity?: ItineraryPayload['proximity'],
  ) => {
    if (generatingTarget || selectedDaySteps.length > 0) return;

    haptic([8, 30, 8]);
    setGeneratingTarget('day');
    info('ARIA prépare cette journée...');

    try {
      const result = await fetchItinerary(buildTargetPayload(1, preferences, proximity));
      if (!result.ok || result.steps.length === 0) {
        console.warn('[Parcours] Génération journée indisponible:', result);
        error('Impossible de générer cette journée.');
        return;
      }

      const allowedPeriods = preferences?.targetPeriods;
      const periodFilteredSteps = allowedPeriods?.length
        ? result.steps.filter((step) => allowedPeriods.includes(step.period))
        : result.steps;
      const sourceSteps = periodFilteredSteps.length > 0 ? periodFilteredSteps : result.steps;

      const mappedSteps = sourceSteps
        .slice(0, allowedPeriods?.length ?? 3)
        .map((step) => ({
          ...step,
          id: crypto.randomUUID(),
          day: selectedDay,
          place: currentCity ?? step.place,
          done: false,
        }));

      appendGeneratedSteps(mappedSteps);
      success(`${mappedSteps.length} étapes ajoutées au jour ${selectedDay}`);
    } catch (err) {
      console.warn('[Parcours] Erreur génération journée:', err);
      error('Erreur pendant la génération de la journée.');
    } finally {
      setGeneratingTarget(null);
    }
  };

  const buildPeriodSuggestion = async (
    period: StepPeriod,
    excludedSteps: Step[] = [],
    preferences?: AiGenerationPreferences,
    proximity?: ItineraryPayload['proximity'],
  ): Promise<Step | null> => {
    const fetchCandidate = async (): Promise<Step | null> => {
      const result = await fetchItinerary(buildTargetPayload(1, preferences, proximity));
      if (!result.ok || result.steps.length === 0) {
        console.warn('[Parcours] Génération moment indisponible:', result);
        return null;
      }

      const preferred = result.steps.filter((step) => step.period === period);
      const candidates = [
        ...preferred,
        ...result.steps.filter((step) => step.period !== period),
      ];

      const differentCandidate = candidates.find((candidate) => {
        const mapped: Step = {
          ...candidate,
          id: 'candidate',
          day: selectedDay,
          period,
          place: currentCity ?? candidate.place,
          done: false,
        };
        return !isSimilarToExisting(mapped, excludedSteps) && !mentionsAnotherRoadtripCity(mapped);
      });

      // Si tout semble trop proche, on garde quand même une proposition disponible :
      // mieux vaut laisser l'utilisateur décider dans la BottomSheet que bloquer l'UX.
      const candidate = differentCandidate ?? candidates[0] ?? null;
      if (!candidate) return null;

      return {
        ...candidate,
        id: crypto.randomUUID(),
        day: selectedDay,
        period,
        place: currentCity ?? candidate.place,
        done: false,
      };
    };

    const first = await fetchCandidate();
    if (first) return first;

    // Deuxième tentative si l'IA a proposé une activité trop proche de l'existant.
    return fetchCandidate();
  };

  const generatePeriodItinerary = async (
    period: StepPeriod,
    preferences?: AiGenerationPreferences,
    proximity?: ItineraryPayload['proximity'],
  ) => {
    const periodItems = stepsByPeriod[period];
    if (generatingTarget || periodItems.length > 0) return;

    haptic([8, 30, 8]);
    setGeneratingTarget(period);
    info('ARIA prépare ce moment...');

    try {
      const mappedStep = await buildPeriodSuggestion(period, [], preferences, proximity);
      if (!mappedStep) {
        error('Impossible de générer ce moment.');
        return;
      }

      appendGeneratedSteps([mappedStep]);
      success('1 étape ajoutée au parcours');
    } catch (err) {
      console.warn('[Parcours] Erreur génération moment:', err);
      error('Erreur pendant la génération du moment.');
    } finally {
      setGeneratingTarget(null);
    }
  };

  const requestPeriodSuggestion = async (period: StepPeriod) => {
    if (regenLoading || generatingTarget) return;

    haptic([6, 20, 6]);
    setRegenPeriod(period);
    setRegenSuggestion(null);
    setRegenLoading(true);

    try {
      const excluded = [
        ...stepsByPeriod[period],
        ...(regenSuggestion ? [regenSuggestion] : []),
      ];
      const suggestion = await buildPeriodSuggestion(period, excluded);
      if (!suggestion) {
        error('ARIA n’a pas trouvé d’alternative pour ce moment.');
        setRegenPeriod(null);
        return;
      }
      setRegenSuggestion(suggestion);
    } catch (err) {
      console.warn('[Parcours] Erreur régénération moment:', err);
      error('Erreur pendant la régénération.');
      setRegenPeriod(null);
    } finally {
      setRegenLoading(false);
    }
  };

  const acceptRegenSuggestion = () => {
    if (!regenSuggestion || !regenPeriod) return;
    haptic([8, 30, 8]);

    const remainingSteps = trip.steps.filter(
      (step) => !(step.day === selectedDay && step.period === regenPeriod),
    );

    updateTrip(trip.id, { steps: [...remainingSteps, regenSuggestion] });
    success('Moment remplacé par la suggestion ARIA');
    setRegenSuggestion(null);
    setRegenPeriod(null);
  };

  const closeRegenSheet = () => {
    if (regenLoading) return;
    setRegenSuggestion(null);
    setRegenPeriod(null);
  };

  const openAiSheet = (mode: AiSheetMode) => {
    haptic(5);
    setAiSheetMode(mode);
    setAiSelectedPeriods(['morning', 'afternoon', 'night']);
    setAiFamilies(['balanced']);
    setAiAvoid('');
    setAiProximityMode('city');
    setAiProximityLabel('');
    setAiProximityCoords(null);
    setAiProximityResults([]);
    setAiProximitySearching(false);
    setAiProximityLoading(false);
  };

  const closeAiSheet = () => {
    if (generatingItinerary || generatingTarget) return;
    setAiSheetMode(null);
  };

  const isCountryOnlyTrip = !trip.isRoadtrip && trip.destination.trim().toLowerCase() === trip.country.trim().toLowerCase();

  const defaultBaseLabel = trip.isRoadtrip
    ? `Ville du jour · ${currentCity ?? trip.country}`
    : isCountryOnlyTrip
      ? `Pays entier · ${trip.country}`
      : `Ville du voyage · ${trip.destination}`;

  const defaultBaseHelp = trip.isRoadtrip
    ? 'Pour un roadtrip, ARIA utilise la ville du jour sélectionné.'
    : isCountryOnlyTrip
      ? 'Pour un pays entier, indique idéalement une ville, un quartier ou un hôtel pour plus de précision.'
      : 'ARIA part de la ville du voyage. Tu peux préciser une ville proche, un quartier ou un hôtel.';

  const proximityPlaceholder = trip.isRoadtrip && currentCity
    ? `Ex : centre de ${currentCity}, hôtel, quartier...`
    : PROXIMITY_PLACEHOLDER_EXAMPLES[trip.countryCode.toUpperCase()]
      ?? (isCountryOnlyTrip
        ? `Ex : capitale, grande ville ou quartier en ${trip.country}...`
        : `Ex : centre de ${trip.destination}, hôtel, quartier...`);

  const getAiRadiusKm = () => {
    if (aiSheetMode === 'full') return 15;
    if (aiFamilies.some((family) => family === 'food' || family === 'shopping')) return 5;
    if (aiSelectedPeriods.length === 1) return 8;
    return 10;
  };

  useEffect(() => () => {
    if (aiProximityDebounceRef.current) clearTimeout(aiProximityDebounceRef.current);
    aiProximityAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (aiProximityMode !== 'custom') {
      setAiProximityResults([]);
      setAiProximitySearching(false);
      return;
    }

    const query = aiProximityLabel.trim();
    if (query.length < 2) {
      setAiProximityResults([]);
      setAiProximitySearching(false);
      return;
    }

    if (aiProximityDebounceRef.current) clearTimeout(aiProximityDebounceRef.current);
    aiProximityDebounceRef.current = setTimeout(async () => {
      aiProximityAbortRef.current?.abort();
      const controller = new AbortController();
      aiProximityAbortRef.current = controller;
      setAiProximitySearching(true);

      try {
        const url = new URL('https://photon.komoot.io/api/');
        const context = [currentCity ?? (!isCountryOnlyTrip ? trip.destination : ''), trip.country]
          .filter(Boolean)
          .join(' ');
        url.searchParams.set('q', `${query} ${context}`.trim());
        url.searchParams.set('limit', '6');
        url.searchParams.set('lang', 'fr');

        const biasLat = currentDestination?.lat ?? trip.lat;
        const biasLon = currentDestination?.lon ?? trip.lon;
        if (Number.isFinite(biasLat) && Number.isFinite(biasLon)) {
          url.searchParams.set('lat', String(biasLat));
          url.searchParams.set('lon', String(biasLon));
        }

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const mapped: LocalBaseResult[] = features
          .map((feature: any): LocalBaseResult | null => {
            const props = feature?.properties ?? {};
            const code = String(props.countrycode ?? '').toUpperCase();
            const coords = feature?.geometry?.coordinates;
            const lon = Array.isArray(coords) ? Number(coords[0]) : NaN;
            const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
            if (code !== trip.countryCode.toUpperCase()) return null;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const label = String(props.name ?? '').trim();
            if (!label) return null;
            const area = [props.city, props.county, props.state]
              .filter(Boolean)
              .map(String)
              .filter((item, index, arr) => arr.indexOf(item) === index)
              .join(' · ');
            return {
              label,
              subtitle: [area, props.country].filter(Boolean).join(' · ') || trip.country,
              countryCode: code,
              lat,
              lon,
            };
          })
          .filter((item: LocalBaseResult | null): item is LocalBaseResult => item !== null)
          .filter((item: LocalBaseResult, index: number, arr: LocalBaseResult[]) => (
            arr.findIndex((other: LocalBaseResult) => other.label === item.label && other.countryCode === item.countryCode) === index
          ))
          .slice(0, 4);

        setAiProximityResults(mapped);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setAiProximityResults([]);
      } finally {
        setAiProximitySearching(false);
      }
    }, 280);

    return () => {
      if (aiProximityDebounceRef.current) clearTimeout(aiProximityDebounceRef.current);
    };
  }, [aiProximityLabel, aiProximityMode, currentCity, currentDestination?.lat, currentDestination?.lon, isCountryOnlyTrip, trip.country, trip.countryCode, trip.destination, trip.lat, trip.lon]);

  const requestAiGps = () => {
    if (!navigator.geolocation || aiProximityLoading) {
      error('Localisation indisponible sur cet appareil.');
      return;
    }

    haptic(5);
    setAiProximityMode('gps');
    setAiProximityLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAiProximityCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setAiProximityLabel('Ma position actuelle');
        setAiProximityLoading(false);
        success('Position ajoutée au contexte ARIA');
      },
      () => {
        setAiProximityLoading(false);
        setAiProximityMode('custom');
        setAiProximityResults([]);
        setAiProximityCoords(null);
        info('Position non disponible. Indique plutôt ton quartier, hôtel ou ville proche.');
      },
      { timeout: 9000, maximumAge: 60000 },
    );
  };

  const buildAiProximity = async (): Promise<ItineraryPayload['proximity']> => {
    const radiusKm = getAiRadiusKm();

    if (aiProximityMode === 'gps' && aiProximityCoords) {
      return {
        mode: 'gps',
        label: aiProximityLabel || 'Ma position actuelle',
        lat: aiProximityCoords.lat,
        lon: aiProximityCoords.lon,
        radiusKm,
      };
    }

    if (aiProximityMode === 'custom' && aiProximityLabel.trim()) {
      const label = aiProximityLabel.trim();
      if (aiProximityCoords) {
        return {
          mode: 'custom',
          label,
          lat: aiProximityCoords.lat,
          lon: aiProximityCoords.lon,
          radiusKm,
        };
      }

      const query = [label, currentCity ?? (!isCountryOnlyTrip ? trip.destination : ''), trip.country].filter(Boolean).join(', ');
      const coords = await geocodePlace(query);
      return {
        mode: 'custom',
        label,
        lat: coords?.lat,
        lon: coords?.lon,
        radiusKm,
      };
    }

    return {
      mode: 'city',
      label: currentCity ?? (isCountryOnlyTrip ? trip.country : trip.destination),
      radiusKm,
    };
  };

  const buildAiPreferences = (): AiGenerationPreferences => {
    const allPeriodsSelected = aiSelectedPeriods.length === PERIODS.length;
    const scope = aiSheetMode === 'full'
      ? 'full'
      : allPeriodsSelected
        ? 'day'
        : 'period';

    return {
      scope,
      activityFamilies: aiFamilies,
      avoid: aiAvoid.trim() || undefined,
      targetPeriods: aiSheetMode === 'day' ? aiSelectedPeriods : undefined,
      targetDays: aiSheetMode === 'day' ? [selectedDay] : undefined,
    };
  };

  const toggleAiPeriod = (period: StepPeriod) => {
    setAiSelectedPeriods((current) => {
      if (current.includes(period)) {
        return current.length > 1 ? current.filter((item) => item !== period) : current;
      }
      return [...current, period];
    });
  };

  const toggleAiFamily = (family: AiActivityFamily) => {
    setAiFamilies((current) => {
      if (family === 'balanced') return ['balanced'];
      const withoutBalanced = current.filter((item) => item !== 'balanced');
      if (withoutBalanced.includes(family)) {
        const next = withoutBalanced.filter((item) => item !== family);
        return next.length > 0 ? next : ['balanced'];
      }
      return [...withoutBalanced, family];
    });
  };

  const runAiSheetGeneration = async () => {
    if (!aiSheetMode) return;
    const preferences = buildAiPreferences();
    setAiProximityLoading(true);
    const proximity = await buildAiProximity();
    setAiProximityLoading(false);
    setAiSheetMode(null);

    if (aiSheetMode === 'full') {
      await generateFullItinerary(preferences, proximity);
      return;
    }

    if (aiSelectedPeriods.length === 1) {
      await generatePeriodItinerary(aiSelectedPeriods[0], preferences, proximity);
    } else {
      await generateDayItinerary(preferences, proximity);
    }
  };

  const generateFullItinerary = async (
    preferences?: AiGenerationPreferences,
    proximity?: ItineraryPayload['proximity'],
  ) => {
    if (generatingItinerary || trip.steps.length > 0) return;

    haptic([8, 30, 8]);
    setGeneratingItinerary(true);
    info('ARIA prépare votre parcours...');

    try {
      const payload: ItineraryPayload = {
        trip: {
          destination:  trip.isRoadtrip ? trip.country : trip.destination,
          country:      trip.country,
          countryCode:  trip.countryCode,
          days,
          budget:       trip.budget,
          currency:     trip.currency,
          isRoadtrip:   !!trip.isRoadtrip,
          destinations: trip.destinations?.map((dest) => ({
            city:    dest.city,
            fromDay: dest.fromDay,
            toDay:   dest.toDay,
          })),
        },
        style: travelStyle,
        proximity,
        preferences,
      };

      const result = await fetchItinerary(payload);
      if (!result.ok || result.steps.length === 0) {
        console.warn('[Parcours] Génération IA indisponible:', result);
        error('Impossible de générer le parcours pour le moment.');
        return;
      }

      updateTrip(trip.id, { steps: result.steps });
      setSelectedDay(1);
      success(`${result.steps.length} étapes ajoutées au parcours`);
    } catch (err) {
      console.warn('[Parcours] Erreur génération IA:', err);
      error('Erreur pendant la génération du parcours.');
    } finally {
      setGeneratingItinerary(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Header Parcours ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/35 font-bold">
            Organisation
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tighter mt-0.5">
            Parcours
          </h2>
        </div>

        {trip.steps.length === 0 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => openAiSheet('full')}
            disabled={generatingItinerary}
            className="h-10 px-3.5 rounded-2xl font-semibold text-xs tap disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(124,140,255,0.22), rgba(236,72,153,0.14))',
              border:     '1px solid rgba(124,140,255,0.32)',
              color:      'var(--accent-label)',
              boxShadow:  '0 10px 30px rgba(124,140,255,0.14)',
            }}
          >
            {generatingItinerary ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-3.5 h-3.5 border border-white/20 border-t-white/80 rounded-full"
              />
            ) : (
              <Sparkles size={14} />
            )}
            <span>{generatingItinerary ? 'Génération...' : 'Générer avec l’IA'}</span>
          </motion.button>
        )}
      </div>

      {/* ── Sélecteur de jour ── */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2">
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
          const dateISO = addDaysISO(trip.startDate, d - 1);
          const active  = selectedDay === d;
          const dayCity = getCityForDay(d, trip.destinations);

          // ✅ Roadtrip → couleur de la ville
          // ✅ Voyage simple → couleur du thème via CSS variables
          const dayColor = trip.isRoadtrip && dayCity
            ? (cityColorMap[dayCity] ?? '#7c8cff')
            : null;

          // ✅ Pour voyage simple : on utilise les CSS variables directement
          // via style inline conditionnel
          const isFirstDayOfStop =
            trip.destinations?.some((dest) => dest.fromDay === d) ?? false;

          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className="flex-shrink-0 rounded-2xl px-4 py-3 tap min-w-[68px] transition relative"
              style={
                trip.isRoadtrip
                  ? {
                      // ── MODE ROADTRIP : couleur par ville ──────────────────
                      background: active
                        ? (dayColor ?? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)')
                        : dayColor
                        ? `${dayColor}18`
                        : 'rgba(255,255,255,0.06)',
                      border: active
                        ? 'none'
                        : dayColor
                        ? `1px solid ${dayColor}35`
                        : '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }
                  : {
                      // ── MODE VOYAGE SIMPLE : couleur du thème ─────────────
                      // ✅ Actif → gradient thème complet
                      // ✅ Inactif → teinte légère du thème à 15% d'opacité
                      background: active
                        ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                        : 'rgba(var(--accent-from-rgb), 0.13)',
                      border: active
                        ? 'none'
                        : '1px solid rgba(var(--accent-from-rgb), 0.28)',
                      color: '#ffffff',
                    }
              }
            >
              {/* ✅ Point indicateur premier jour d'un stop (roadtrip uniquement) */}
              {isFirstDayOfStop && trip.isRoadtrip && !active && dayColor && (
                <div
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: dayColor }}
                />
              )}
              <div className="text-[10px] uppercase tracking-wider opacity-65">Jour {d}</div>
              <div className="text-lg font-bold font-display tracking-tight">
                {fmtDate(dateISO, { day: '2-digit' })}
              </div>
              <div className="text-[10px] opacity-65">
                {fmtDate(dateISO, { weekday: 'short' })}
              </div>
              {/* ✅ Nom de ville affiché UNIQUEMENT en mode roadtrip */}
              {dayCity && trip.isRoadtrip && (
                <div
                  className="text-[9px] mt-0.5 font-semibold truncate max-w-[60px]"
                  style={{
                    color: active
                      ? 'rgba(255,255,255,0.75)'
                      : (dayColor ?? 'rgba(255,255,255,0.5)'),
                  }}
                >
                  {dayCity.split(' ')[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Séparateur de ville (roadtrip uniquement) ── */}
      <AnimatePresence mode="wait">
        {trip.isRoadtrip && currentCity && currentDestination && (
          <motion.div
            key={currentCity}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <CityDaySeparator
              city={currentCity}
              fromDay={currentDestination.fromDay}
              toDay={currentDestination.toDay}
              color={currentCityColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Aide IA journée vide ── */}
      {isSelectedDayEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(124,140,255,0.13), rgba(236,72,153,0.07))',
            border:     '1px solid rgba(124,140,255,0.24)',
            boxShadow:  '0 18px 50px rgba(124,140,255,0.10)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(124,140,255,0.14)',
                border:     '1px solid rgba(124,140,255,0.28)',
              }}
            >
              <Sparkles size={17} style={{ color: 'var(--accent-label)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white/92 tracking-tight">
                Journée libre
              </div>
              <div className="text-xs text-white/48 leading-relaxed mt-1">
                ARIA peut proposer une journée équilibrée pour {currentCity ?? trip.destination} sans toucher aux autres jours.
              </div>
              <button
                onClick={() => openAiSheet('day')}
                disabled={!!generatingTarget || generatingItinerary}
                className="mt-3 h-10 px-4 rounded-2xl text-xs font-semibold tap disabled:opacity-60 inline-flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                  color:      '#fff',
                  boxShadow:  '0 10px 28px rgba(var(--accent-from-rgb), 0.22)',
                }}
              >
                {generatingTarget === 'day' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-3.5 h-3.5 border border-white/25 border-t-white rounded-full"
                  />
                ) : (
                  <Sparkles size={14} />
                )}
                {generatingTarget === 'day' ? 'Génération...' : 'Générer cette journée'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Timeline ── */}
      <div className="space-y-4">
        {PERIODS.map((p) => {
          const dimmed =
            isToday &&
            ((p.key === 'morning' && currentPeriod !== 'morning') ||
              (p.key === 'afternoon' && currentPeriod === 'night'));

          const Icon  = p.icon;
          const items = stepsByPeriod[p.key];

          return (
            <div key={p.key} className="transition-opacity" style={{ opacity: dimmed ? 0.5 : 1 }}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${p.color}26` }}
                >
                  <Icon size={15} style={{ color: p.color }} />
                </div>
                <div
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: p.color }}
                >
                  {p.label}
                </div>
                <div className="flex-1 h-px" style={{ background: `${p.color}33` }} />
                <span className="text-xs text-white/45">{items.length}</span>
                {items.length > 0 && (
                  <button
                    onClick={() => requestPeriodSuggestion(p.key)}
                    disabled={regenLoading || !!generatingTarget || generatingItinerary}
                    className="w-8 h-8 rounded-full flex items-center justify-center tap disabled:opacity-45"
                    style={{
                      background: `${p.color}14`,
                      border:     `1px solid ${p.color}30`,
                      color:      p.color,
                    }}
                    aria-label={`Régénérer ${p.label.toLowerCase()} avec l’IA`}
                    title="Régénérer avec l’IA"
                  >
                    {regenLoading && regenPeriod === p.key ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="w-3.5 h-3.5 rounded-full"
                        style={{
                          border:         `1px solid ${p.color}40`,
                          borderTopColor: p.color,
                        }}
                      />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((step) => {
                    const tt = TYPES.find((t) => t.key === step.type);
                    return (
                      <motion.div
                        key={step.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <GlassCard
                          className="p-4 flex items-center gap-3"
                          onClick={() => {
                            haptic(4);
                            setInfoStep(step);
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic(8);
                              updateStep(trip.id, step.id, { done: !step.done });
                            }}
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center tap flex-shrink-0 transition"
                            style={{
                              background:  step.done ? '#56c5a4' : 'transparent',
                              borderColor: step.done ? '#56c5a4' : 'rgba(255,255,255,0.3)',
                            }}
                          >
                            {step.done && <Check size={14} className="text-black" strokeWidth={3} />}
                          </button>
                          <div className="text-xl">{tt?.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-semibold tracking-tight truncate ${
                                step.done ? 'line-through opacity-55' : ''
                              }`}
                            >
                              {step.title}
                            </div>
                            <div className="text-xs text-white/55 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {step.place}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMemorySheet(step);
                            }}
                            className="relative w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-white/55"
                            aria-label="Ajouter une photo souvenir"
                          >
                            <Camera size={13} />
                            {hasMemoryForStep(step.id) && (
                              <span
                                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                                style={{ background: '#56c5a4', boxShadow: '0 0 8px rgba(86,197,164,0.8)' }}
                              />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              detachMemoriesFromStep(trip.id, step.id);
                              removeStep(trip.id, step.id);
                            }}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-red-400/80"
                          >
                            <Trash2 size={13} />
                          </button>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {items.length === 0 ? (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => openAdder(p.key)}
                    className="w-full rounded-2xl p-3 flex items-center gap-3 text-left tap transition"
                    style={{
                      background: `${p.color}12`,
                      border:     `1px solid ${p.color}30`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${p.color}18`, color: p.color }}
                    >
                      <Plus size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: p.color }}>
                        Ajouter une étape
                      </div>
                      <div className="text-xs text-white/35 mt-0.5">
                        {p.label} libre
                      </div>
                    </div>
                  </motion.button>
                ) : (
                  <button
                    onClick={() => openAdder(p.key)}
                    className="w-full glass rounded-2xl p-3 flex items-center justify-center gap-2 text-white/55 tap hover:text-white transition"
                    style={{
                      borderColor: 'rgba(var(--accent-from-rgb), 0.20)',
                    }}
                  >
                    <Plus size={16} />
                    <span className="text-sm">Ajouter une étape</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet
        open={!!aiSheetMode}
        onClose={closeAiSheet}
        title={aiSheetMode === 'full' ? 'Générer le parcours' : 'Générer la journée'}
      >
        <div className="space-y-5">
          <div
            className="rounded-[24px] p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,140,255,0.16), rgba(236,72,153,0.08))',
              border: '1px solid rgba(124,140,255,0.24)',
            }}
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'var(--accent-to)' }} />
            <div className="relative flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-from-rgb),0.18)', border: '1px solid rgba(var(--accent-from-rgb),0.28)' }}
              >
                <Sparkles size={18} style={{ color: 'var(--accent-label)' }} />
              </div>
              <div>
                <div className="font-bold tracking-tight text-white/92">
                  {aiSheetMode === 'full' ? 'Préparer tout le voyage' : `Jour ${selectedDay} · ${currentCity ?? trip.destination}`}
                </div>
                <div className="text-xs text-white/45 leading-relaxed mt-1">
                  {aiSheetMode === 'full'
                    ? 'ARIA génère un parcours complet en gardant ton style de voyage.'
                    : 'Choisis toute la journée ou un moment précis, puis laisse ARIA proposer.'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Point de départ</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'city' as AiProximityMode, label: isCountryOnlyTrip ? 'Choisir ville' : trip.isRoadtrip ? 'Ville du jour' : 'Ville', emoji: '🏙️' },
                { key: 'gps' as AiProximityMode, label: 'Ma position', emoji: '📍' },
                { key: 'custom' as AiProximityMode, label: 'Lieu précis', emoji: '🏨' },
              ].map((item) => {
                const active = aiProximityMode === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === 'gps') requestAiGps();
                      else {
                        const nextMode = item.key === 'city' && isCountryOnlyTrip ? 'custom' : item.key;
                        setAiProximityMode(nextMode);
                        setAiProximityResults([]);
                        setAiProximityCoords(null);
                        if (nextMode === 'city') {
                          setAiProximityLabel('');
                        }
                      }
                    }}
                    className="rounded-2xl px-2.5 py-3 text-left tap transition disabled:opacity-60"
                    disabled={aiProximityLoading && item.key === 'gps'}
                    style={{
                      background: active ? 'rgba(var(--accent-from-rgb),0.16)' : 'rgba(255,255,255,0.05)',
                      border: active ? '1px solid rgba(var(--accent-from-rgb),0.32)' : '1px solid rgba(255,255,255,0.075)',
                    }}
                  >
                    <div className="text-lg leading-none mb-1">{item.emoji}</div>
                    <div className="text-[11px] font-semibold text-white/76">{item.label}</div>
                  </button>
                );
              })}
            </div>

            {aiProximityMode === 'city' && (
              <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xs font-semibold text-white/70">{defaultBaseLabel}</div>
                <div className="text-[11px] text-white/34 mt-1 leading-relaxed">{defaultBaseHelp}</div>
              </div>
            )}

            {aiProximityMode === 'custom' && (
              <div className="mt-3 space-y-2">
                <input
                  value={aiProximityLabel}
                  onChange={(event) => {
                    setAiProximityLabel(event.target.value);
                    setAiProximityCoords(null);
                  }}
                  placeholder={proximityPlaceholder}
                  className="w-full h-11 rounded-2xl px-4 bg-transparent outline-none text-sm placeholder-white/25"
                  style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}
                />

                {aiProximitySearching && (
                  <div className="text-[11px] text-white/32 px-1">Recherche du lieu…</div>
                )}

                {aiProximityResults.length > 0 && (
                  <div className="space-y-1.5">
                    {aiProximityResults.map((result) => (
                      <button
                        key={`${result.label}-${result.lat}-${result.lon}`}
                        type="button"
                        onClick={() => {
                          haptic(4);
                          setAiProximityLabel(result.label);
                          setAiProximityCoords({ lat: result.lat, lon: result.lon });
                          setAiProximityResults([]);
                        }}
                        className="w-full rounded-2xl px-3 py-2.5 text-left tap flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.075)' }}
                      >
                        <MapPin size={13} className="text-white/35 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white/74 truncate">{result.label}</div>
                          <div className="text-[11px] text-white/32 truncate">{result.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {aiProximityLabel.trim().length >= 2 && !aiProximitySearching && aiProximityResults.length === 0 && !aiProximityCoords && (
                  <div className="text-[11px] text-white/30 px-1 leading-relaxed">
                    Aucun lieu confirmé pour l’instant. Tu peux quand même générer, ARIA utilisera ce texte comme repère approximatif.
                  </div>
                )}

                {aiProximityCoords && (
                  <div className="text-[11px] text-white/35 px-1">
                    ✓ Lieu confirmé avec coordonnées
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-white/28 mt-2 px-1 leading-relaxed">
              ARIA privilégie les lieux proches : 2–5 km pour food/pratique, 5–10 km pour visites, jusqu’à 15 km pour une journée complète.
            </div>
          </div>

          {aiSheetMode === 'day' && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2 px-1">
                <div className="text-xs uppercase tracking-wider text-white/35">Moments à générer</div>
                <button
                  type="button"
                  onClick={() => setAiSelectedPeriods(['morning', 'afternoon', 'night'])}
                  className="text-[11px] font-semibold text-white/38 tap"
                >
                  Tout sélectionner
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map((period) => {
                  const active = aiSelectedPeriods.includes(period.key);
                  const emoji = period.key === 'morning' ? '🌅' : period.key === 'afternoon' ? '☀️' : '🌙';
                  return (
                    <button
                      key={period.key}
                      onClick={() => toggleAiPeriod(period.key)}
                      className="rounded-2xl px-3 py-3 text-left tap transition"
                      style={{
                        background: active ? `${period.color}20` : 'rgba(255,255,255,0.055)',
                        border: active ? `1px solid ${period.color}55` : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="text-lg leading-none mb-1">{emoji}</div>
                      <div className="text-xs font-semibold" style={{ color: active ? period.color : 'rgba(255,255,255,0.76)' }}>{period.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Ambiances</div>
            <div className="grid grid-cols-2 gap-2">
              {AI_ACTIVITY_FAMILIES.map((family) => {
                const active = aiFamilies.includes(family.key);
                return (
                  <button
                    key={family.key}
                    onClick={() => toggleAiFamily(family.key)}
                    className="rounded-2xl px-3 py-3 text-left tap transition"
                    style={{
                      background: active ? 'rgba(var(--accent-from-rgb),0.16)' : 'rgba(255,255,255,0.05)',
                      border: active ? '1px solid rgba(var(--accent-from-rgb),0.32)' : '1px solid rgba(255,255,255,0.075)',
                    }}
                  >
                    <div className="text-lg leading-none mb-1">{family.emoji}</div>
                    <div className="text-xs font-semibold text-white/76">{family.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">À éviter / consignes</div>
            <textarea
              value={aiAvoid}
              onChange={(event) => setAiAvoid(event.target.value)}
              placeholder="Ex : pas de musées, pas trop de marche, éviter le sport..."
              className="w-full min-h-[92px] rounded-2xl px-4 py-3 bg-transparent outline-none text-sm resize-none placeholder-white/25"
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
            <div className="text-[11px] text-white/28 mt-2 px-1 leading-relaxed">
              Les préférences sont envoyées avec la demande ARIA. On affinera encore leur impact côté Worker en phase 2.
            </div>
          </div>

          <button
            onClick={runAiSheetGeneration}
            disabled={generatingItinerary || !!generatingTarget || aiProximityLoading}
            className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', boxShadow: '0 12px 34px rgba(var(--accent-from-rgb),0.28)' }}
          >
            {generatingItinerary || generatingTarget ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-4 h-4 border border-white/25 border-t-white rounded-full"
              />
            ) : (
              <Sparkles size={16} />
            )}
            Générer avec ARIA
          </button>
        </div>
      </BottomSheet>

      <StepAdder
        open={adderOpen}
        onClose={() => setAdderOpen(false)}
        initialPeriod={adderPeriod}
        initialDay={selectedDay}
        cityHint={currentCity ?? undefined}
        cityColorMap={cityColorMap}
      />

      <BottomSheet
        open={!!memoryStep}
        onClose={closeMemorySheet}
        title="Ajouter un souvenir"
      >
        {memoryStep && (
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
                  <div className="font-bold tracking-tight text-white/92">{memoryStep.title}</div>
                  <div className="text-xs text-white/45 mt-1 flex items-center gap-1.5">
                    <MapPin size={11} /> Jour {memoryStep.day} · {memoryStep.place}
                  </div>
                  <div className="text-[11px] text-white/35 leading-relaxed mt-2">
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

            {memoryPreviewUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {memoryPreviewUrls.map((preview) => (
                  <div
                    key={preview.key}
                    className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

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
        )}
      </BottomSheet>

      <BottomSheet
        open={!!regenPeriod}
        onClose={closeRegenSheet}
        title="Suggestion ARIA"
      >
        <div className="space-y-4">
          <div
            className="rounded-[24px] p-4"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border:     '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border:     '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {regenLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-5 h-5 border border-white/20 border-t-white/80 rounded-full"
                  />
                ) : (
                  <Sparkles size={18} style={{ color: 'var(--accent-label)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] text-white/35 font-bold">
                  {regenPeriod
                    ? PERIODS.find((p) => p.key === regenPeriod)?.label
                    : 'Moment'}
                </div>
                <div className="font-bold tracking-tight text-white/92 mt-0.5">
                  {regenLoading
                    ? 'ARIA cherche une alternative...'
                    : regenSuggestion?.title ?? 'Suggestion indisponible'}
                </div>
                {regenSuggestion && (
                  <>
                    <div className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                      <MapPin size={11} />
                      Jour {selectedDay} · {regenSuggestion.place}
                    </div>
                    {regenSuggestion.notes && (
                      <div className="text-sm text-white/66 leading-relaxed mt-3">
                        {regenSuggestion.notes}
                      </div>
                    )}
                    <div className="text-[11px] text-white/35 leading-relaxed mt-3">
                      Valider remplacera les étapes actuelles de ce moment uniquement.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => regenPeriod && requestPeriodSuggestion(regenPeriod)}
              disabled={regenLoading}
              className="h-12 rounded-2xl font-semibold text-sm glass tap disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} />
              Relancer
            </button>
            <button
              onClick={acceptRegenSuggestion}
              disabled={regenLoading || !regenSuggestion}
              className="h-12 rounded-2xl font-semibold text-sm tap disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                color:      '#fff',
              }}
            >
              <RefreshCw size={15} />
              Remplacer
            </button>
          </div>

          <button
            onClick={closeRegenSheet}
            disabled={regenLoading}
            className="w-full h-11 rounded-2xl text-sm text-white/45 glass tap disabled:opacity-50"
          >
            Fermer
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!infoStep}
        onClose={() => setInfoStep(null)}
        title={infoStep?.title ?? 'Détails'}
      >
        {infoStep && (
          <div className="space-y-4">
            <div
              className="rounded-[24px] p-4"
              style={{
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {TYPES.find((t) => t.key === infoStep.type)?.emoji ?? '✨'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold tracking-tight">{infoStep.title}</div>
                  <div className="text-xs text-white/45 mt-1 flex items-center gap-1.5">
                    <MapPin size={11} />
                    Jour {infoStep.day} · {PERIODS.find((p) => p.key === infoStep.period)?.label ?? 'Moment'} · {infoStep.place}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl p-4 text-sm leading-relaxed text-white/68"
              style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {infoStep.notes ? (
                infoStep.notes
              ) : (
                <span className="text-white/35">Aucune note ajoutée pour cette étape.</span>
              )}
            </div>

            <button
              onClick={() => {
                const period = infoStep.period;
                setInfoStep(null);
                requestPeriodSuggestion(period);
              }}
              disabled={regenLoading || !!generatingTarget || generatingItinerary}
              className="w-full h-12 rounded-2xl font-semibold tap flex items-center justify-center gap-2 disabled:opacity-55"
              style={{
                background: 'rgba(var(--accent-from-rgb),0.14)',
                border: '1px solid rgba(var(--accent-from-rgb),0.28)',
                color: 'var(--accent-label)',
              }}
            >
              <RefreshCw size={15} />
              Changer cette suggestion
            </button>

            <button
              onClick={() => openStepInMaps(infoStep)}
              className="w-full h-12 rounded-2xl font-semibold tap flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                boxShadow: '0 12px 34px rgba(var(--accent-from-rgb), 0.24)',
              }}
            >
              <MapPin size={16} />
              Ouvrir dans Plans
              <ExternalLink size={13} className="opacity-70" />
            </button>

            <button
              onClick={() => openStepActivity(infoStep)}
              className="w-full h-12 rounded-2xl font-semibold tap flex items-center justify-center gap-2"
              style={{
                background: 'rgba(236,72,153,0.12)',
                border: '1px solid rgba(236,72,153,0.24)',
                color: '#f9a8d4',
              }}
            >
              <span>🎟️</span>
              Réserver une activité
              <ExternalLink size={13} className="opacity-70" />
            </button>

            <button
              onClick={() => setInfoStep(null)}
              className="w-full h-12 rounded-2xl font-semibold tap"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              Fermer
            </button>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StepAdder — Flow 3 étapes iOS
// ─────────────────────────────────────────────────────────────────────────────
const StepAdder = ({
  open,
  onClose,
  initialPeriod,
  initialDay,
  cityHint,
  cityColorMap,
}: {
  open:          boolean;
  onClose:       () => void;
  initialPeriod: StepPeriod;
  initialDay:    number;
  cityHint?:     string;
  cityColorMap:  Record<string, string>;
}) => {
  const { trip }         = useTripContext();
  const addStep          = useTripStore((s) => s.addStep);
  const travelStyle      = useTripStore((s) => s.travelStyle);
  const aiSuggestionsRaw = useTripStore((s) => s.aiSuggestions[trip.id]);
  const aiSuggestions    = aiSuggestionsRaw ?? [];
  const days             = daysBetween(trip.startDate, trip.endDate);
  const { info, error }  = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [type,        setType]        = useState<StepType>('sight');
  const [title,       setTitle]       = useState('');
  const [place,       setPlace]       = useState(cityHint ?? trip.destination);
  const [notes,       setNotes]       = useState('');
  const [day,         setDay]         = useState(initialDay);
  const [period,      setPeriod]      = useState<StepPeriod>(initialPeriod);
  const [ariaLoading, setAriaLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDay(initialDay);
      setPeriod(initialPeriod);
      setPlace(cityHint ?? trip.destination);
    }
  }, [open, initialDay, initialPeriod, cityHint, trip.destination]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrentStep(1);
        setTitle('');
        setNotes('');
        setType('sight');
      }, 300);
    }
  }, [open]);

  const canStep2 = type !== undefined;
  const canStep3 = title.trim().length > 0 && place.trim().length > 0;

  const suggestStepWithAria = async () => {
    if (ariaLoading) return;

    const activeCity = getCityForDay(day, trip.destinations) ?? cityHint ?? place ?? trip.destination;
    const shouldLockCity = !!trip.isRoadtrip && !!activeCity;

    haptic([6, 20, 6]);
    setAriaLoading(true);
    info('ARIA prépare une idée...');

    try {
      const result = await fetchItinerary({
        trip: {
          destination: shouldLockCity ? activeCity : trip.destination,
          country:     trip.country,
          countryCode: trip.countryCode,
          days:        1,
          budget:      Math.max(1, Math.round(trip.budget / Math.max(days, 1))),
          currency:    trip.currency,
          isRoadtrip:  shouldLockCity,
          destinations: shouldLockCity
            ? [{ city: activeCity, fromDay: 1, toDay: 1 }]
            : undefined,
        },
        style: travelStyle,
      });

      if (!result.ok || result.steps.length === 0) {
        console.warn('[StepAdder] Suggestion ARIA indisponible:', result);
        error('ARIA n’a pas trouvé d’idée pour ce moment.');
        return;
      }

      const suggestion =
        result.steps.find((step) => step.period === period) ??
        result.steps[0];

      setType(suggestion.type);
      setTitle(suggestion.title);
      setPlace(shouldLockCity ? activeCity : suggestion.place);
      setNotes(suggestion.notes ?? '');
      setCurrentStep(2);
    } catch (err) {
      console.warn('[StepAdder] Erreur suggestion ARIA:', err);
      error('Erreur pendant la suggestion ARIA.');
    } finally {
      setAriaLoading(false);
    }
  };

  const submit = () => {
    if (!canStep3) return;
    haptic([5, 20, 5]);
    addStep(trip.id, {
      id:     crypto.randomUUID(),
      day,
      period,
      type,
      title:  title.trim(),
      place:  place.trim(),
      notes:  notes.trim() || undefined,
      done:   false,
    });
    onClose();
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-300"
            style={{
              width:      currentStep >= n ? 28 : 24,
              height:     currentStep >= n ? 28 : 24,
              // ✅ CSS variables thème pour les indicateurs d'étapes
              background: currentStep > n
                ? '#56c5a4'
                : currentStep === n
                ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                : 'rgba(255,255,255,0.1)',
              color: currentStep >= n ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            {currentStep > n ? <Check size={12} strokeWidth={3} /> : n}
          </div>
          {n < 3 && (
            <div
              className="h-px w-8 transition-all duration-300"
              style={{ background: currentStep > n ? '#56c5a4' : 'rgba(255,255,255,0.15)' }}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Nouvelle étape">
      <StepIndicator />

      <AnimatePresence mode="wait">

        {/* ══ ÉTAPE 1 — TYPE ══ */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Quel type d'étape ?</div>
              <div className="text-xs text-white/45 mt-0.5">Sélectionnez la catégorie</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className="rounded-2xl p-4 flex flex-col items-center gap-2 tap transition"
                    style={{
                      background: active ? `${t.color}20` : 'rgba(255,255,255,0.05)',
                      border: active
                        ? `2px solid ${t.color}60`
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-3xl">{t.emoji}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: active ? t.color : 'rgba(255,255,255,0.7)' }}
                    >
                      {t.label}
                    </span>
                    {active && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}
                      >
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}

              <button
                onClick={suggestStepWithAria}
                disabled={ariaLoading}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 tap transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,140,255,0.16), rgba(236,72,153,0.09))',
                  border:     '1px solid rgba(124,140,255,0.28)',
                  boxShadow:  '0 14px 36px rgba(124,140,255,0.10)',
                }}
              >
                {ariaLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-8 h-8 border border-white/20 border-t-white/80 rounded-full"
                  />
                ) : (
                  <span className="text-3xl">✨</span>
                )}
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--accent-label)' }}
                >
                  ARIA
                </span>
                <span className="text-[10px] text-white/35 -mt-1">suggérer</span>
              </button>
            </div>
            {/* ✅ Bouton Suivant — CSS variables thème */}
            <button
              disabled={!canStep2}
              onClick={() => setCurrentStep(2)}
              className="w-full h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2 mt-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
              }}
            >
              Suivant <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ══ ÉTAPE 2 — DÉTAILS ══ */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Détails de l'étape</div>
              <div className="text-xs text-white/45 mt-0.5">
                {TYPES.find((t) => t.key === type)?.emoji}{' '}
                {TYPES.find((t) => t.key === type)?.label}
              </div>
            </div>

            {cityHint && trip.isRoadtrip && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: `${cityColorMap[cityHint] ?? '#7c8cff'}15`,
                  border:     `1px solid ${cityColorMap[cityHint] ?? '#7c8cff'}35`,
                }}
              >
                <Map size={12} style={{ color: cityColorMap[cityHint] ?? '#7c8cff' }} />
                <span className="text-xs text-white/55">
                  Étape à{' '}
                  <span
                    className="font-semibold"
                    style={{ color: cityColorMap[cityHint] ?? '#7c8cff' }}
                  >
                    {cityHint}
                  </span>
                </span>
              </div>
            )}

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Titre *
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Visite du Colisée"
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
              />
            </label>

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Ville / Quartier *
                {cityHint && trip.isRoadtrip && (
                  <span className="ml-1 normal-case text-white/30">(pré-rempli)</span>
                )}
              </div>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder={`Ex: Centre de ${trip.destination}`}
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium"
              />
            </label>

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                Notes (optionnel)
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Réservation, prix, infos..."
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
            </label>

            {aiSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-white/55 mb-2 px-1">
                  <Sparkles size={11} style={{ color: 'var(--accent-from)' }} /> Suggestions IA
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.slice(0, 5).map((s, index) => (
                    <button
                      key={`${s}-${index}`}
                      onClick={() => setTitle(s)}
                      className="pill px-3 py-1.5 text-xs glass tap text-white/75 transition hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="h-12 px-5 rounded-2xl glass tap font-medium text-sm"
              >
                ← Retour
              </button>
              {/* ✅ Bouton Suivant étape 2 — CSS variables thème */}
              <button
                disabled={!canStep3}
                onClick={() => setCurrentStep(3)}
                className="flex-1 h-12 rounded-2xl font-semibold text-white tap disabled:opacity-30 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                }}
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ ÉTAPE 3 — QUAND ══ */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-base font-semibold tracking-tight">Quand ?</div>
              <div className="text-xs text-white/45 mt-0.5">Choisissez le jour et le moment</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                📅 Jour
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                  const dateISO = addDaysISO(trip.startDate, d - 1);
                  const active  = day === d;
                  const dCity   = getCityForDay(d, trip.destinations);

                  // ✅ Même logique que le sélecteur principal
                  const dColor = trip.isRoadtrip && dCity
                    ? (cityColorMap[dCity] ?? '#7c8cff')
                    : null;

                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setDay(d);
                        if (trip.isRoadtrip && dCity) {
                          setPlace(dCity);
                        }
                      }}
                      className="flex-shrink-0 rounded-2xl px-3 py-2.5 tap min-w-[56px] text-center transition"
                      style={
                        trip.isRoadtrip
                          ? {
                              // ── MODE ROADTRIP ──────────────────────────────
                              background: active
                                ? (dColor ?? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)')
                                : dColor
                                ? `${dColor}18`
                                : 'rgba(255,255,255,0.06)',
                              border: active
                                ? 'none'
                                : dColor
                                ? `1px solid ${dColor}30`
                                : '1px solid rgba(255,255,255,0.1)',
                            }
                          : {
                              // ── MODE VOYAGE SIMPLE : couleur thème ─────────
                              background: active
                                ? 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)'
                                : 'rgba(var(--accent-from-rgb), 0.13)',
                              border: active
                                ? 'none'
                                : '1px solid rgba(var(--accent-from-rgb), 0.28)',
                            }
                      }
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-75">J{d}</div>
                      <div className="text-sm font-bold font-display">
                        {new Date(dateISO).getDate()}
                      </div>
                      {dCity && trip.isRoadtrip && (
                        <div
                          className="text-[8px] mt-0.5 truncate font-semibold"
                          style={{
                            color: active
                              ? 'rgba(255,255,255,0.75)'
                              : (dColor ?? 'rgba(255,255,255,0.5)'),
                          }}
                        >
                          {dCity.split(' ')[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-white/55 mb-2 px-1">
                🕐 Moment
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map((p) => {
                  const Icon   = p.icon;
                  const active = period === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className="rounded-2xl p-3 flex flex-col items-center gap-1.5 tap transition"
                      style={{
                        background: active ? `${p.color}25` : 'rgba(255,255,255,0.05)',
                        border: active
                          ? `1px solid ${p.color}60`
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Icon size={20} style={{ color: active ? p.color : 'rgba(255,255,255,0.5)' }} />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: active ? p.color : 'rgba(255,255,255,0.55)' }}
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

            {/* Récap */}
            <div
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{
                background: 'rgba(var(--accent-from-rgb), 0.08)',
                border:     '1px solid rgba(var(--accent-from-rgb), 0.15)',
              }}
            >
              <span className="text-xl">{TYPES.find((t) => t.key === type)?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{title}</div>
                <div className="text-xs text-white/50">
                  📍 {place} · Jour {day} · {PERIODS.find((p) => p.key === period)?.label}
                  {trip.isRoadtrip && getCityForDay(day, trip.destinations) && (
                    <span
                      className="ml-1"
                      style={{
                        color: cityColorMap[getCityForDay(day, trip.destinations)!] ?? '#7c8cff',
                      }}
                    >
                      · {getCityForDay(day, trip.destinations)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="h-12 px-5 rounded-2xl glass tap font-medium text-sm"
              >
                ← Retour
              </button>
              {/* ✅ Bouton final "Ajouter l'étape" — CSS variables thème */}
              <button
                onClick={submit}
                className="flex-1 h-12 rounded-2xl font-semibold text-white tap flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                }}
              >
                <Check size={16} /> Ajouter l'étape
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
};
