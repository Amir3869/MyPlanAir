// src/features/essentials/Essentials.tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Plus, Trash2, ListChecks, FileText,
  Save, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTripContext } from '../cockpit/useTripContext';
import { useTripStore } from '../../store/tripStore';
import { GlassCard } from '../../shared/GlassCard';
import { haptic } from '../../utils/haptic';
import { useToast } from '../../shared/Toast';

type Tab = 'checklist' | 'notes';

type Category = {
  key:   string;
  label: string;
  emoji: string;
  color: string;
  items: string[];
};

const SUGGESTION_CATEGORIES: Category[] = [
  {
    key:   'docs',
    label: 'Documents',
    emoji: '🛂',
    color: '#7c8cff',
    items: [
      "Passeport",
      "Carte d'identité",
      "Visa (si requis)",
      "Permis de conduire international",
      "Photocopies des documents",
      "Assurance voyage",
      "Billets d'avion / train imprimés",
      "Réservations hôtel",
    ],
  },
  {
    key:   'health',
    label: 'Santé',
    emoji: '🏥',
    color: '#56c5a4',
    items: [
      "Trousse à pharmacie",
      "Médicaments habituels",
      "Anti-douleurs",
      "Anti-diarrhéiques",
      "Crème solaire",
      "Anti-moustiques",
      "Vaccins à jour",
      "Masques FFP2",
      "Gel hydroalcoolique",
    ],
  },
  {
    key:   'luggage',
    label: 'Bagages',
    emoji: '👗',
    color: '#f0b24a',
    items: [
      "Vêtements adaptés à la météo",
      "Sous-vêtements (1/jour)",
      "Chaussures confortables",
      "Veste imperméable",
      "Maillot de bain",
      "Adaptateur de prise",
      "Cadenas pour bagage",
      "Sac à dos léger",
      "Tenue décontractée",
    ],
  },
  {
    key:   'finance',
    label: 'Finance',
    emoji: '💳',
    color: '#ec4899',
    items: [
      "Carte bancaire internationale",
      "Espèces locales",
      "Carte de secours",
      "Prévenir sa banque du voyage",
      "Carte Revolut / Wise",
      "Budget quotidien établi",
      "Numéros d'urgence banque",
    ],
  },
  {
    key:   'tech',
    label: 'Tech',
    emoji: '📱',
    color: '#a78bfa',
    items: [
      "Smartphone chargé",
      "Chargeur téléphone",
      "Power bank",
      "Écouteurs",
      "Appareil photo",
      "Carte SIM locale / eSIM",
      "Câble de recharge universel",
      "Téléchargement cartes hors-ligne",
    ],
  },
];

const normalizeChecklistLabel = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const NOTE_SHORTCUTS = [
  { key: 'address',     label: 'Adresse',     emoji: '📍', color: '#7c8cff', text: '📍 Adresse :' },
  { key: 'booking',     label: 'Réservation', emoji: '🎫', color: '#f0b24a', text: `🎫 Réservation
Nom :
Date / heure :
Référence :` },
  { key: 'transport',   label: 'Transport',   emoji: '🚆', color: '#56c5a4', text: `🚆 Transport
Départ :
Arrivée :
Heure :` },
  { key: 'try',         label: 'À tester',    emoji: '⭐', color: '#ec4899', text: '⭐ À tester :' },
  { key: 'important',   label: 'Important',   emoji: '⚠️', color: '#ff6b35', text: '⚠️ Important :' },
  { key: 'contact',     label: 'Contact',     emoji: '👤', color: '#a78bfa', text: `👤 Contact
Nom :
Téléphone :
Note :` },
] as const;

export const Essentials = () => {
  const { trip }      = useTripContext();
  const [tab, setTab] = useState<Tab>('checklist');

  const toggleChecklist = useTripStore((s) => s.toggleChecklist);
  const addItem         = useTripStore((s) => s.addChecklistItem);
  const removeItem      = useTripStore((s) => s.removeChecklistItem);
  const setNotes        = useTripStore((s) => s.setNotes);
  const { success, info } = useToast();

  const [newItem,        setNewItem]        = useState('');
  const [suggestOpen,    setSuggestOpen]    = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const done  = trip.checklist.filter((c) => c.done).length;
  const total = trip.checklist.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const [draft,   setDraft]   = useState(trip.notes);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const pendingSaveRef = useRef<{
    tripId: string;
    draft: string;
    savedNotes: string;
  } | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    const pending = pendingSaveRef.current;
    if (pending && pending.draft !== pending.savedNotes) {
      setNotes(pending.tripId, pending.draft);
    }
    pendingSaveRef.current = null;
  }, [trip.id, setNotes]);

  useEffect(() => {
    setDraft(trip.notes);
    setSavedAt(null);
    pendingSaveRef.current = null;
  }, [trip.id]); // eslint-disable-line

  useEffect(() => {
    if (draft === trip.notes) {
      pendingSaveRef.current = null;
      return;
    }

    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }

    pendingSaveRef.current = {
      tripId: trip.id,
      draft,
      savedNotes: trip.notes,
    };

    timerRef.current = window.setTimeout(() => {
      const pending = pendingSaveRef.current;
      if (pending && pending.draft !== pending.savedNotes) {
        setNotes(pending.tripId, pending.draft);
        setSavedAt(new Date());
      }
      pendingSaveRef.current = null;
      timerRef.current = undefined;
    }, 2000);

    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [draft, trip.id, trip.notes, setNotes]);

  const addSuggestion = (label: string) => {
    haptic(8);
    addItem(trip.id, label);
  };

  const addCategory = (cat: Category) => {
    const existing = new Set(
      trip.checklist.map((c) => normalizeChecklistLabel(c.label)),
    );
    const toAdd = cat.items.filter(
      (item) => !existing.has(normalizeChecklistLabel(item)),
    );
    if (toAdd.length === 0) {
      info('Tous ces éléments sont déjà dans ta liste.');
      return;
    }
    toAdd.forEach((label) => addItem(trip.id, label));
    success(`${toAdd.length} élément${toAdd.length > 1 ? 's' : ''} ajouté${toAdd.length > 1 ? 's' : ''} !`);
    haptic([5, 20, 5]);
  };

  const existingLabels = new Set(
    trip.checklist.map((c) => normalizeChecklistLabel(c.label)),
  );

  const getAvailableItems = (cat: Category) =>
    cat.items.filter(
      (item) => !existingLabels.has(normalizeChecklistLabel(item)),
    );

  const addManualItem = () => {
    const label = newItem.trim();
    if (!label) return;

    if (existingLabels.has(normalizeChecklistLabel(label))) {
      haptic(4);
      info('Déjà dans ta checklist.');
      return;
    }

    haptic([5, 20, 5]);
    addItem(trip.id, label);
    setNewItem('');
    success('Ajouté à la checklist');
  };

  const insertNoteShortcut = (text: string) => {
    haptic(4);
    const current = draft;
    const separator = current.trim().length > 0 ? '\n\n' : '';
    const next = `${current}${separator}${text}`;
    setDraft(next);

    window.setTimeout(() => {
      const el = notesRef.current;
      if (!el) return;
      el.focus();
      const position = next.length;
      el.setSelectionRange(position, position);
    }, 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ✅ Tab switcher — CSS variables thème */}
      <div className="glass-strong rounded-full p-1 flex relative">
        <motion.div
          layout
          className="absolute top-1 bottom-1 rounded-full"
          style={{
            // ✅ CSS variables thème au lieu de rgba(124,140,255,0.4) hardcodé
            background: 'rgba(var(--accent-from-rgb), 0.38)',
            border:     '1px solid rgba(var(--accent-from-rgb), 0.28)',
            width:      'calc(50% - 4px)',
            left:       tab === 'checklist' ? 4 : 'calc(50%)',
          }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        />
        <button
          onClick={() => setTab('checklist')}
          className={`relative flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 tap ${
            tab === 'checklist' ? 'text-white' : 'text-white/55'
          }`}
        >
          <ListChecks size={15} /> Checklist
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`relative flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 tap ${
            tab === 'notes' ? 'text-white' : 'text-white/55'
          }`}
        >
          <FileText size={15} /> Notes
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ══ CHECKLIST ══ */}
        {tab === 'checklist' && (
          <motion.div
            key="cl"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Progress */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold tracking-tight">
                  Préparation
                </div>
                <div className="text-2xl font-bold font-display">{pct}%</div>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{
                    // ✅ CSS variables thème
                    background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
                  }}
                />
              </div>
              <div className="text-xs text-white/55 mt-2">
                {done} / {total} éléments cochés
              </div>
            </GlassCard>

            {/* Bouton suggestions */}
            <button
              onClick={() => {
                setSuggestOpen((open) => !open);
                setActiveCategory(null);
              }}
              className="w-full glass rounded-2xl px-4 py-3 flex items-center gap-3 tap transition"
              style={{
                background: suggestOpen
                  ? 'rgba(var(--accent-from-rgb), 0.12)'
                  : 'rgba(255,255,255,0.05)',
                border: suggestOpen
                  ? '1px solid rgba(var(--accent-from-rgb), 0.30)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Sparkles size={16} style={{ color: 'var(--accent-from)' }} />
              <span className="flex-1 text-left text-sm font-semibold">
                Suggestions par catégorie
              </span>
              {suggestOpen ? (
                <ChevronUp size={16} className="text-white/45" />
              ) : (
                <ChevronDown size={16} className="text-white/45" />
              )}
            </button>

            {/* Panel suggestions */}
            <AnimatePresence>
              {suggestOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3">
                    {SUGGESTION_CATEGORIES.map((cat) => {
                      const available = getAvailableItems(cat);
                      const isActive  = activeCategory === cat.key;

                      return (
                        <div
                          key={cat.key}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border:     '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div className="w-full flex items-center gap-2 px-4 py-3">
                            <button
                              onClick={() =>
                                setActiveCategory(isActive ? null : cat.key)
                              }
                              className="min-w-0 flex-1 flex items-center gap-3 tap text-left"
                              aria-expanded={isActive}
                            >
                              <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                              <span
                                className="flex-1 min-w-0 font-semibold text-sm truncate"
                                style={{ color: cat.color }}
                              >
                                {cat.label}
                              </span>
                              <span className="text-xs text-white/40 flex-shrink-0">
                                {available.length} disponible
                                {available.length !== 1 ? 's' : ''}
                              </span>
                              {isActive ? (
                                <ChevronUp size={14} className="text-white/40 flex-shrink-0" />
                              ) : (
                                <ChevronDown size={14} className="text-white/40 flex-shrink-0" />
                              )}
                            </button>
                            {available.length > 0 && (
                              <button
                                onClick={() => addCategory(cat)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full tap flex-shrink-0"
                                style={{
                                  background: `${cat.color}20`,
                                  color:      cat.color,
                                  border:     `1px solid ${cat.color}40`,
                                }}
                              >
                                + Tout
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 space-y-1">
                                  {cat.items.map((item) => {
                                    const alreadyAdded = existingLabels.has(
                                      normalizeChecklistLabel(item),
                                    );
                                    return (
                                      <div
                                        key={item}
                                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                                        style={{
                                          background: alreadyAdded
                                            ? 'rgba(86,197,164,0.08)'
                                            : 'rgba(255,255,255,0.03)',
                                        }}
                                      >
                                        <span
                                          className="text-sm flex items-center gap-2"
                                          style={{
                                            color: alreadyAdded
                                              ? '#56c5a4'
                                              : 'rgba(255,255,255,0.75)',
                                          }}
                                        >
                                          {alreadyAdded && (
                                            <Check size={12} style={{ color: '#56c5a4' }} />
                                          )}
                                          {item}
                                        </span>
                                        {!alreadyAdded && (
                                          <button
                                            onClick={() => addSuggestion(item)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center tap flex-shrink-0"
                                            style={{
                                              background: `${cat.color}20`,
                                              border:     `1px solid ${cat.color}30`,
                                            }}
                                          >
                                            <Plus size={13} style={{ color: cat.color }} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ajouter manuellement */}
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addManualItem();
                  }
                }}
                placeholder="Ajouter un élément..."
                className="flex-1 glass rounded-xl px-4 py-3 bg-transparent outline-none font-medium text-sm"
              />
              <button
                onClick={addManualItem}
                className="w-12 h-12 rounded-xl flex items-center justify-center tap text-white"
                style={{
                  // ✅ CSS variables thème
                  background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Liste des items */}
            <div className="space-y-2">
              <AnimatePresence>
                {trip.checklist.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <GlassCard className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => {
                          haptic(8);
                          toggleChecklist(trip.id, item.id);
                        }}
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center tap flex-shrink-0 transition"
                        style={{
                          background:  item.done ? '#56c5a4' : 'transparent',
                          borderColor: item.done
                            ? '#56c5a4'
                            : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {item.done && (
                          <Check size={14} className="text-black" strokeWidth={3} />
                        )}
                      </button>
                      <div
                        className={`flex-1 font-medium tracking-tight ${
                          item.done ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {item.label}
                      </div>
                      <button
                        onClick={() => removeItem(trip.id, item.id)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center tap text-red-400/80"
                      >
                        <Trash2 size={13} />
                      </button>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>

              {trip.checklist.length === 0 && (
                <div className="text-center py-8 text-white/35 text-sm">
                  Ta liste est vide.
                  <br />
                  Ajoute des éléments ou utilise les suggestions.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ NOTES ══ */}
        {tab === 'notes' && (
          <motion.div
            key="nt"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles size={13} style={{ color: 'var(--accent-label)' }} />
                <div className="text-[10px] uppercase tracking-wider text-white/55 flex-1">
                  Raccourcis
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {NOTE_SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.key}
                    type="button"
                    onClick={() => insertNoteShortcut(shortcut.text)}
                    className="h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap tap flex items-center gap-1.5"
                    style={{
                      background: `${shortcut.color}16`,
                      border:     `1px solid ${shortcut.color}30`,
                      color:      'rgba(255,255,255,0.78)',
                    }}
                  >
                    <span>{shortcut.emoji}</span>
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </GlassCard>

            <div
              className="relative rounded-[28px] p-5 min-h-[56vh] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))',
                border:     '1px solid rgba(255,255,255,0.12)',
                boxShadow:  '0 22px 60px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(24px) saturate(170%)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-5 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)' }}
              />
              <textarea
                ref={notesRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écris ici tes adresses, rappels, idées et détails importants…"
                className="w-full min-h-[50vh] pb-10 bg-transparent outline-none resize-none text-[16px] leading-7 text-white/88 placeholder-white/28 tracking-tight"
              />
              <div
                className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border:     '1px solid rgba(255,255,255,0.10)',
                  color:      'rgba(255,255,255,0.52)',
                }}
              >
                <Save size={11} />
                {savedAt
                  ? `Sauvegardé à ${savedAt.toLocaleTimeString('fr-FR', {
                      hour:   '2-digit',
                      minute: '2-digit',
                    })}`
                  : draft !== trip.notes
                    ? 'Sauvegarde…'
                    : 'À jour'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};