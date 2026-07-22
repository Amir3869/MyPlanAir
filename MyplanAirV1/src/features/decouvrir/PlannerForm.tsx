// src/features/decouvrir/PlannerForm.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Planificateur IA — Découvrir V2.1
// Un seul moteur : destination + inspiration + budget + durée + style.
// Online-only : pas de fausse IA hors-ligne.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Minus, Plus, RefreshCw, Search, Sparkles, WifiOff, X } from 'lucide-react';
import type { TravelStyle } from '../../store/types';
import { searchAll, type CityEntry } from '../../api/countries';
import { Flag } from '../../shared/Flag';
import { haptic } from '../../utils/haptic';
import { pickInspirations, type InspirationDestination } from './inspirationData';
import {
  PLANNER_DURATIONS,
  PLANNER_MOODS,
  type PlannerDestination,
  type PlannerMood,
  type PlannerRequest,
  type PlannerTripMode,
} from './plannerTypes';

const TRAVEL_STYLES: { key: TravelStyle; label: string; emoji: string }[] = [
  { key: 'solo',     label: 'Solo',     emoji: '🧳' },
  { key: 'couple',   label: 'Couple',   emoji: '💞' },
  { key: 'family',   label: 'Famille',  emoji: '👨‍👩‍👧‍👦' },
  { key: 'business', label: 'Business', emoji: '💼' },
];

const MOOD_PROMPTS: Record<PlannerMood, string> = {
  sun: 'Soleil, plage, chaleur, budget maîtrisé',
  city: 'City trip, beaux quartiers, restaurants, culture',
  nature: 'Nature, paysages, randonnée, calme',
  roadtrip: 'Aventures, liberté, plusieurs étapes, beaux paysages',
  culture: 'Culture, histoire, musées, gastronomie locale',
  surprise: 'Destination originale, bon rapport expérience/prix',
};

type Props = {
  online: boolean;
  expanded: boolean;
  homeCurrency: string;
  homeCity: string;
  homeLat: number;
  homeLon: number;
  defaultStyle: TravelStyle | null;
  loading?: boolean;
  children?: ReactNode;
  onExpandedChange: (expanded: boolean) => void;
  onGenerate: (request: PlannerRequest) => void;
};

const cityEntryToPlannerDestination = (entry: CityEntry): PlannerDestination => ({
  label: entry.type === 'city' ? entry.city : entry.country,
  country: entry.country,
  countryCode: entry.countryCode,
  currency: entry.currency,
  capital: entry.capital,
  lat: entry.lat,
  lon: entry.lon,
  type: entry.type,
});

export const PlannerForm = ({
  online,
  expanded,
  homeCurrency,
  homeCity,
  homeLat,
  homeLon,
  defaultStyle,
  loading = false,
  children,
  onExpandedChange,
  onGenerate,
}: Props) => {
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationSearching, setDestinationSearching] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<CityEntry[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<PlannerDestination | null>(null);

  const [mood, setMood] = useState<PlannerMood>('sun');
  const [prompt, setPrompt] = useState(MOOD_PROMPTS.sun);
  const [budget, setBudget] = useState(1200);
  const [days, setDays] = useState(7);
  const [style, setStyle] = useState<TravelStyle>(defaultStyle ?? 'solo');
  const [tripMode, setTripMode] = useState<PlannerTripMode>('auto');
  const [preferredCityInput, setPreferredCityInput] = useState('');
  const [preferredCitySearching, setPreferredCitySearching] = useState(false);
  const [preferredCitySuggestions, setPreferredCitySuggestions] = useState<CityEntry[]>([]);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [inspirationSeed, setInspirationSeed] = useState(() => Math.floor(Math.random() * 1000));

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const preferredDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferredAbortRef = useRef<AbortController | null>(null);

  const inspirations = useMemo(() => pickInspirations(inspirationSeed, 6), [inspirationSeed]);
  useEffect(() => {
    if (selectedDestination?.type === 'country') {
      setTripMode((mode) => mode === 'auto' ? 'city' : mode);
      return;
    }

    setTripMode('auto');
    setPreferredCities([]);
    setPreferredCityInput('');
  }, [selectedDestination]);

  useEffect(() => {
    const q = destinationQuery.trim();
    if (q.length < 2 || selectedDestination?.label === q) {
      setDestinationSuggestions([]);
      setDestinationSearching(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      searchAbortRef.current = new AbortController();
      setDestinationSearching(true);
      try {
        const results = await searchAll(q, searchAbortRef.current.signal, 6);
        setDestinationSuggestions(results);
      } catch {
        setDestinationSuggestions([]);
      } finally {
        setDestinationSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [destinationQuery, selectedDestination]);

  useEffect(() => {
    const q = preferredCityInput.trim();
    if (tripMode !== 'roadtrip' || selectedDestination?.type !== 'country' || q.length < 2) {
      setPreferredCitySuggestions([]);
      setPreferredCitySearching(false);
      return;
    }

    if (preferredDebounceRef.current) clearTimeout(preferredDebounceRef.current);
    preferredDebounceRef.current = setTimeout(async () => {
      if (preferredAbortRef.current) preferredAbortRef.current.abort();
      preferredAbortRef.current = new AbortController();
      setPreferredCitySearching(true);
      try {
        const results = await searchAll(q, preferredAbortRef.current.signal, 8);
        const filtered = results.filter((entry) =>
          entry.type === 'city' && entry.countryCode === selectedDestination.countryCode,
        );
        setPreferredCitySuggestions(filtered.slice(0, 5));
      } catch {
        setPreferredCitySuggestions([]);
      } finally {
        setPreferredCitySearching(false);
      }
    }, 280);

    return () => {
      if (preferredDebounceRef.current) clearTimeout(preferredDebounceRef.current);
    };
  }, [preferredCityInput, selectedDestination, tripMode]);

  const handleMoodSelect = (nextMood: PlannerMood) => {
    haptic(4);
    setMood(nextMood);
    setPrompt(MOOD_PROMPTS[nextMood]);
  };

  const selectDestination = (entry: CityEntry) => {
    haptic(8);
    const destination = cityEntryToPlannerDestination(entry);
    setSelectedDestination(destination);
    setDestinationQuery(destination.label);
    setDestinationSuggestions([]);
  };

  const selectInspiration = (item: InspirationDestination) => {
    haptic(8);
    setDestinationQuery(item.name);
    setSelectedDestination({ label: item.name, type: 'free' });
    setPrompt(item.prompt);
    setDestinationSuggestions([]);
    onExpandedChange(true);
  };

  const refreshInspirations = () => {
    haptic(4);
    setInspirationSeed((seed) => seed + 1);
  };

  const addPreferredCity = (entry?: CityEntry) => {
    const city = entry?.city ?? preferredCitySuggestions[0]?.city;
    if (!city) return;
    if (preferredCities.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
      setPreferredCityInput('');
      setPreferredCitySuggestions([]);
      return;
    }
    haptic(4);
    setPreferredCities((items) => [...items, city].slice(0, 6));
    setPreferredCityInput('');
    setPreferredCitySuggestions([]);
  };

  const removePreferredCity = (city: string) => {
    haptic(3);
    setPreferredCities((items) => items.filter((item) => item !== city));
  };

  const handleGenerate = () => {
    if (!online || loading) return;

    let destination = selectedDestination ?? undefined;
    const q = destinationQuery.trim();
    if (!destination && q.length > 0) {
      destination = { label: q, type: 'free' };
      setSelectedDestination(destination);
    }

    haptic([8, 24, 8]);
    onExpandedChange(true);
    onGenerate({
      mood,
      prompt: prompt.trim(),
      destination,
      tripMode: selectedDestination?.type === 'country' ? tripMode : 'auto',
      preferredCities: selectedDestination?.type === 'country' && tripMode === 'roadtrip' ? preferredCities : [],
      origin: {
        city: homeCity,
        lat: homeLat,
        lon: homeLon,
      },
      budget,
      days,
      travelStyle: style,
      currency: homeCurrency,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-[28px] p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(var(--accent-from-rgb), 0.15) 0%, rgba(255,255,255,0.055) 52%, rgba(255,255,255,0.035) 100%)',
        border: '1px solid rgba(var(--accent-from-rgb), 0.24)',
        backdropFilter: 'blur(28px) saturate(170%)',
        boxShadow: '0 22px 70px rgba(0,0,0,0.32)',
      }}
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(var(--accent-from-rgb), 0.20)' }} />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.11)' }} />

      <button
        type="button"
        onClick={() => { haptic(5); onExpandedChange(!expanded); }}
        className="relative w-full flex items-center gap-3 text-left tap"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--accent-from-rgb), 0.22)', border: '1px solid rgba(var(--accent-from-rgb), 0.32)', boxShadow: '0 10px 30px rgba(var(--accent-from-rgb),0.18)' }}>
          <Sparkles size={22} style={{ color: 'var(--accent-label)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold tracking-tight">Planificateur IA</div>
          <div className="text-xs text-white/45 mt-1 leading-relaxed">
            Destination, budget, durée : ARIA te propose des idées réalistes.
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.11)' }}
        >
          <ChevronDown size={17} className="text-white/55" />
        </motion.div>
      </button>

      {!expanded && (
        <div className="relative mt-4 text-[11px] text-white/32 leading-relaxed">
          Recherche une destination, ajuste ton budget, puis laisse ARIA proposer un voyage réaliste.
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="planner-body"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative overflow-hidden"
          >
            <div className="pt-5 space-y-4">
              {!online && (
                <div
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(240,178,74,0.10)', border: '1px solid rgba(240,178,74,0.24)' }}
                >
                  <WifiOff size={18} style={{ color: '#f0b24a' }} />
                  <div>
                    <div className="text-sm font-semibold text-[#f0b24a]">Connexion requise</div>
                    <div className="text-xs text-white/45 mt-1 leading-relaxed">
                      Le planificateur utilise l’IA en ligne. Hors connexion, My Plan’Air ne génère pas de fausses recommandations.
                    </div>
                  </div>
                </div>
              )}

              {/* Destination */}
              <div>
                <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Où veux-tu aller ?</div>
                <div
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.095)',
                  }}
                >
                  <Search size={17} style={{ color: 'rgba(255,255,255,0.38)' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={destinationQuery}
                    onChange={(e) => {
                      setDestinationQuery(e.target.value);
                      setSelectedDestination(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerate();
                    }}
                    disabled={!online}
                    placeholder="Paris, Japon, Bali, Alger..."
                    className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-white/25 disabled:opacity-45"
                  />
                  {destinationSearching && (
                    <span className="block w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  )}
                  {destinationQuery && !destinationSearching && (
                    <button
                      onClick={() => {
                        setDestinationQuery('');
                        setSelectedDestination(null);
                        setDestinationSuggestions([]);
                        searchInputRef.current?.focus();
                      }}
                      className="tap p-1"
                    >
                      <X size={14} className="text-white/30" />
                    </button>
                  )}
                </div>

                {destinationSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-2"
                  >
                    {destinationSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.countryCode}-${suggestion.city}-${suggestion.lat}`}
                        onClick={() => selectDestination(suggestion)}
                        className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 tap text-left"
                        style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.085)' }}
                      >
                        <Flag code={suggestion.countryCode} size={19} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold tracking-tight truncate">{suggestion.city}</div>
                          <div className="text-xs text-white/40 truncate">
                            {suggestion.type === 'city'
                              ? `${suggestion.country} · ${suggestion.currency}`
                              : `Pays · ${suggestion.currency}`}
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: suggestion.type === 'city' ? 'rgba(124,140,255,0.18)' : 'rgba(86,197,164,0.18)',
                            color: suggestion.type === 'city' ? '#a5b4fc' : '#56c5a4',
                          }}
                        >
                          {suggestion.type === 'city' ? 'Ville' : 'Pays'}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Inspirations — visibles tant qu'aucune destination n'est ciblée */}
              {!selectedDestination && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider text-white/35">Inspirations rapides</div>
                    <button
                      onClick={refreshInspirations}
                      className="w-8 h-8 rounded-full tap flex items-center justify-center"
                      aria-label="Renouveler les inspirations"
                      title="Renouveler"
                      style={{
                        background: 'rgba(var(--accent-from-rgb), 0.16)',
                        border: '1px solid rgba(var(--accent-from-rgb), 0.28)',
                        color: 'var(--accent-label)',
                        boxShadow: '0 8px 24px rgba(var(--accent-from-rgb), 0.16)',
                      }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inspirations.map((dest) => (
                      <button
                        key={`${dest.family}-${dest.name}`}
                        onClick={() => selectInspiration(dest)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tap text-xs font-semibold transition-all"
                        style={{ background: 'rgba(255,255,255,0.065)', border: '1px solid rgba(255,255,255,0.095)', color: 'rgba(255,255,255,0.68)' }}
                      >
                        <span>{dest.emoji}</span>
                        <span>{dest.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDestination && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                  style={{ background: 'rgba(var(--accent-from-rgb),0.12)', border: '1px solid rgba(var(--accent-from-rgb),0.22)' }}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/30">Destination ciblée</div>
                    <div className="text-sm font-bold tracking-tight mt-0.5">
                      {selectedDestination.label}
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--accent-label)' }}>
                    {selectedDestination.type === 'country' ? 'Pays' : selectedDestination.type === 'city' ? 'Ville' : 'Recherche'}
                  </div>
                </div>
              )}

              {selectedDestination?.type === 'country' && (
                <div className="rounded-2xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Type de voyage</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'city' as PlannerTripMode, label: 'Séjour simple', emoji: '🏙️' },
                        { key: 'roadtrip' as PlannerTripMode, label: 'Roadtrip IA', emoji: '🗺️' },
                      ].map((item) => {
                        const active = tripMode === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => { haptic(4); setTripMode(item.key); }}
                            className="rounded-2xl px-3 py-2.5 tap text-xs font-semibold"
                            style={{
                              background: active ? 'rgba(var(--accent-from-rgb), 0.18)' : 'rgba(255,255,255,0.05)',
                              border: active ? '1px solid rgba(var(--accent-from-rgb), 0.32)' : '1px solid rgba(255,255,255,0.08)',
                              color: active ? 'var(--accent-label)' : 'rgba(255,255,255,0.58)',
                            }}
                          >
                            <span className="mr-1">{item.emoji}</span>{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {tripMode === 'roadtrip' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs uppercase tracking-wider text-white/35">Villes souhaitées</div>
                        <div className="text-[10px] text-white/30">
                          Recommandé : {days <= 7 ? 2 : days <= 12 ? 3 : days <= 18 ? 4 : 5} villes
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={preferredCityInput}
                          onChange={(e) => setPreferredCityInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addPreferredCity(); }}
                          placeholder="Rechercher une ville du pays…"
                          className="flex-1 rounded-2xl px-3 py-2.5 bg-transparent outline-none text-sm placeholder:text-white/25"
                          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                        <button
                          onClick={() => addPreferredCity()}
                          disabled={preferredCitySuggestions.length === 0}
                          className="px-3 rounded-2xl text-xs font-bold tap disabled:opacity-35"
                          style={{ background: 'rgba(var(--accent-from-rgb),0.16)', border: '1px solid rgba(var(--accent-from-rgb),0.26)', color: 'var(--accent-label)' }}
                        >
                          Ajouter
                        </button>
                      </div>

                      {preferredCitySearching && (
                        <div className="text-[10px] text-white/30 mt-2">Recherche des villes…</div>
                      )}

                      {preferredCitySuggestions.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {preferredCitySuggestions.map((city) => (
                            <button
                              key={`${city.countryCode}-${city.city}-${city.lat}`}
                              onClick={() => addPreferredCity(city)}
                              className="w-full rounded-xl px-3 py-2 flex items-center gap-2 text-left tap"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.075)' }}
                            >
                              <Flag code={city.countryCode} size={16} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{city.city}</div>
                                <div className="text-[10px] text-white/35 truncate">{city.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {preferredCities.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {preferredCities.map((city) => (
                            <button
                              key={city}
                              onClick={() => removePreferredCity(city)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-semibold tap"
                              style={{ background: 'rgba(124,140,255,0.14)', border: '1px solid rgba(124,140,255,0.24)', color: '#a5b4fc' }}
                            >
                              {city} ×
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/28 mt-2">
                          Laisse vide pour laisser ARIA choisir un roadtrip logique et faisable.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Humeur */}
              <div>
                <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Humeur</div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {PLANNER_MOODS.map((item) => {
                    const active = mood === item.key;
                    return (
                      <button
                        key={item.key}
                        disabled={!online}
                        onClick={() => handleMoodSelect(item.key)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap tap transition-all disabled:opacity-40"
                        style={{
                          background: active ? 'rgba(var(--accent-from-rgb), 0.22)' : 'rgba(255,255,255,0.055)',
                          border: active ? '1px solid rgba(var(--accent-from-rgb), 0.36)' : '1px solid rgba(255,255,255,0.08)',
                          color: active ? 'var(--accent-label)' : 'rgba(255,255,255,0.62)',
                        }}
                      >
                        <span>{item.emoji}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Budget</div>
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      disabled={!online}
                      value={budget}
                      onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-transparent outline-none text-base font-bold tracking-tighter disabled:opacity-45"
                    />
                    <div className="text-[10px] text-white/30 mt-0.5">{homeCurrency}</div>
                  </div>
                </label>

                <div>
                  <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Durée</div>
                  <div className="rounded-2xl px-2.5 py-2.5" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        disabled={!online || days <= 2}
                        onClick={() => setDays((v) => Math.max(2, v - 1))}
                        className="w-7 h-7 rounded-xl flex items-center justify-center tap disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                      >
                        <Minus size={13} />
                      </button>
                      <div className="text-center">
                        <div className="text-base font-bold tracking-tighter">{days}</div>
                        <div className="text-[10px] text-white/30">jours</div>
                      </div>
                      <button
                        disabled={!online || days >= 30}
                        onClick={() => setDays((v) => Math.min(30, v + 1))}
                        className="w-7 h-7 rounded-xl flex items-center justify-center tap disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {PLANNER_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    disabled={!online}
                    onClick={() => { haptic(4); setDays(duration); }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tap disabled:opacity-40"
                    style={{
                      background: days === duration ? 'rgba(var(--accent-from-rgb), 0.20)' : 'rgba(255,255,255,0.055)',
                      border: days === duration ? '1px solid rgba(var(--accent-from-rgb), 0.32)' : '1px solid rgba(255,255,255,0.08)',
                      color: days === duration ? 'var(--accent-label)' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {duration}j{duration === 7 ? ' · recommandé' : ''}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Style</div>
                <div className="grid grid-cols-4 gap-2">
                  {TRAVEL_STYLES.map((item) => {
                    const active = style === item.key;
                    return (
                      <button
                        key={item.key}
                        disabled={!online}
                        onClick={() => { haptic(4); setStyle(item.key); }}
                        className="rounded-2xl p-2.5 tap disabled:opacity-40"
                        style={{
                          background: active ? 'rgba(var(--accent-from-rgb), 0.18)' : 'rgba(255,255,255,0.05)',
                          border: active ? '1px solid rgba(var(--accent-from-rgb), 0.34)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="text-lg">{item.emoji}</div>
                        <div className="text-[10px] text-white/55 mt-1">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!online || loading || budget <= 0 || prompt.trim().length < 3}
                className="w-full h-[50px] rounded-2xl font-bold text-sm tap disabled:opacity-45 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                  boxShadow: online ? '0 14px 40px rgba(var(--accent-from-rgb), 0.32)' : 'none',
                }}
              >
                {loading ? '✨ ARIA prépare tes idées…' : '✨ Générer des idées'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children && (
        <div className="relative mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {children}
        </div>
      )}
    </motion.div>
  );
};
