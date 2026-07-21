// src/store/tripStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Step,
  Expense,
  ChecklistItem,
  TripDocument,
  TripMemory,
  Participant,
  Trip,
  ChatMessage,
  AppNotification,
  AppTheme,
  TravelStyle,
} from './types';
import { USER_EMOJIS as _USER_EMOJIS } from './types';

// Ré-exporter les types et constantes pour compatibilité descendante
// (les fichiers existants importent depuis tripStore, pas encore depuis types.ts)
export type {
  StepPeriod,
  StepType,
  AppTheme,
  TravelStyle,
  AppNotification,
  TripDestination,
  Step,
  Expense,
  ChecklistItem,
  Trip,
  ChatMessage,
  TripDocument,
  TripMemory,
  Participant,
  ExpenseCategory,
} from './types';
export { USER_EMOJIS, nameToHue, nameToInitials } from './types';
// _USER_EMOJIS alias ensures the import is used (re-exported above)
void _USER_EMOJIS;

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

type State = {
  // ── Données utilisateur ────────────────────────────────────────────────
  trips:           Trip[];
  homeCurrency:    string;
  authed:          boolean;
  userName:        string;
  userEmoji:       string;                // Compatibilité V4 — l'UI V5 utilise initiales
  userPhotoUrl:    string | null;         // ✅ V5 — Photo de profil (Clerk upload)
  theme:           AppTheme;
  onboardingDone:  boolean;
  travelStyle:     TravelStyle | null;

  // ── Ville de résidence (domicile) ──────────────────────────────────────
  homeCity:        string;                // ✅ V5.2 — Nom affiché (ex: "Paris")
  homeCountryCode: string;                // ✅ V5.2 — ISO alpha-2 (ex: "FR")
  homeLat:         number;                // ✅ V5.2 — Latitude domicile
  homeLon:         number;                // ✅ V5.2 — Longitude domicile
  setHomeCity:     (city: string, countryCode: string, lat: number, lon: number) => void;

  // ── Voyages épinglés ──────────────────────────────────────────────────
  pinnedTripIds:   string[];              // ✅ V5 — Voyages épinglés (page Voyages)

  // ── Collaboration ─────────────────────────────────────────────────────
  participants:    Record<string, Participant[]>;  // ✅ V5 — tripId → participants

  // ── Notifications ─────────────────────────────────────────────────────
  notifications:          AppNotification[];
  notificationsEnabled:   boolean;
  notifDisabledTrips:     string[];

  // ── Chat ──────────────────────────────────────────────────────────────
  chatHistories: Record<string, ChatMessage[]>;

  // ── AI Suggestions ────────────────────────────────────────────────────
  aiSuggestions:   Record<string, string[]>;
  usedSuggestions: Record<string, string[]>;

  // ── Auth actions ──────────────────────────────────────────────────────
  setAuthed:    (v: boolean, name?: string) => void;
  setUserName:  (name: string) => void;
  setUserEmoji: (emoji: string) => void;
  setUserPhotoUrl: (url: string | null) => void;        // ✅ V5

  // ── Preferences ───────────────────────────────────────────────────────
  setHomeCurrency: (c: string) => void;
  setTheme:        (t: AppTheme) => void;
  setTravelStyle:  (s: TravelStyle | null) => void;

  // ── Onboarding ────────────────────────────────────────────────────────
  completeOnboarding: (data: {
    userName:     string;
    travelStyle:  TravelStyle;
    homeCurrency: string;
    theme:        AppTheme;
  }) => void;

  // ── Trips CRUD ────────────────────────────────────────────────────────
  addTrip:    (t: Trip) => void;
  removeTrip: (id: string) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;

  // ── Pin / Unpin ───────────────────────────────────────────────────────
  pinTrip:   (id: string) => void;                      // ✅ V5
  unpinTrip: (id: string) => void;                      // ✅ V5

  // ── Steps ─────────────────────────────────────────────────────────────
  addStep:    (tripId: string, step: Step) => void;
  updateStep: (tripId: string, stepId: string, patch: Partial<Step>) => void;
  removeStep: (tripId: string, stepId: string) => void;

  // ── Expenses ──────────────────────────────────────────────────────────
  addExpense:    (tripId: string, e: Expense) => void;
  updateExpense: (tripId: string, id: string, patch: Partial<Expense>) => void;
  removeExpense: (tripId: string, id: string) => void;

  // ── Checklist ─────────────────────────────────────────────────────────
  toggleChecklist:     (tripId: string, id: string) => void;
  addChecklistItem:    (tripId: string, label: string) => void;
  removeChecklistItem: (tripId: string, id: string) => void;
  setChecklist:        (tripId: string, items: ChecklistItem[]) => void;

  // ── Documents ─────────────────────────────────────────────────────────
  addDocument:    (tripId: string, doc: TripDocument) => void;      // ✅ V5
  removeDocument: (tripId: string, docId: string) => void;          // ✅ V5

  // ── Souvenirs ─────────────────────────────────────────────────────────
  addMemory:    (tripId: string, memory: TripMemory) => void;
  removeMemory: (tripId: string, memoryId: string) => void;
  detachMemoriesFromStep: (tripId: string, stepId: string) => void;

  // ── Notes ─────────────────────────────────────────────────────────────
  setNotes: (tripId: string, notes: string) => void;

  // ── AI Suggestions ────────────────────────────────────────────────────
  setAiSuggestions:     (key: string, suggestions: string[]) => void;
  markSuggestionUsed:   (key: string, suggestion: string) => void;
  clearUsedSuggestions: (key: string) => void;

  // ── Notifications actions ─────────────────────────────────────────────
  addNotification:          (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  replaceOrAddNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>, matchKey: string) => void;
  markNotifRead:            (id: string) => void;
  markAllNotifsRead:        () => void;
  removeNotification:       (id: string) => void;
  clearNotifications:       () => void;
  setNotificationsEnabled:  (v: boolean) => void;
  toggleNotifForTrip:       (tripId: string) => void;

  // ── Chat actions ──────────────────────────────────────────────────────
  addChatMessage:   (tripId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  clearChatHistory: (tripId: string) => void;

  // ── FAB trigger (NavTabBar → TripsHub) ───────────────────────────────
  fabCreateTrip:      boolean;
  triggerFabCreate:   () => void;
  consumeFabCreate:   () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useTripStore = create<State>()(
  persist(
    (set) => ({
      // ── Données utilisateur ──────────────────────────────────────────
      trips:           [],
      homeCurrency:    'EUR',
      authed:          false,
      userName:        'Voyageur',
      userEmoji:       '✈️',
      userPhotoUrl:    null,               // ✅ V5
      theme:           'myplanair',
      onboardingDone:  false,
      travelStyle:     null,

      // ── Ville de résidence ───────────────────────────────────────────
      homeCity:        'Paris',            // ✅ V5.2
      homeCountryCode: 'FR',               // ✅ V5.2
      homeLat:         48.8566,            // ✅ V5.2
      homeLon:         2.3522,             // ✅ V5.2

      // ── Voyages épinglés ─────────────────────────────────────────────
      pinnedTripIds:   [],                 // ✅ V5

      // ── Collaboration ────────────────────────────────────────────────
      participants:    {},                 // ✅ V5

      // ── Notifications ────────────────────────────────────────────────
      notifications:        [],
      notificationsEnabled: true,
      notifDisabledTrips:   [],

      // ── Chat & AI ────────────────────────────────────────────────────
      chatHistories:   {},
      aiSuggestions:   {},
      usedSuggestions: {},

      // ── FAB trigger ─────────────────────────────────────────────────
      fabCreateTrip: false,

      // ══════════════════════════════════════════════════════════════════
      //  ACTIONS
      // ══════════════════════════════════════════════════════════════════

      // ── Auth ──────────────────────────────────────────────────────────
      setAuthed:       (v, name) => set((s) => ({ authed: v, userName: name ?? s.userName })),
      setUserName:     (name)    => set({ userName: name }),
      setUserEmoji:    (emoji)   => set({ userEmoji: emoji }),
      setUserPhotoUrl: (url)     => set({ userPhotoUrl: url }),           // ✅ V5

      // ── Preferences ───────────────────────────────────────────────────
      setHomeCurrency: (c) => set({ homeCurrency: c }),
      setTheme:        (t) => set({ theme: t }),
      setTravelStyle:  (s) => set({ travelStyle: s }),
      setHomeCity:     (city, countryCode, lat, lon) => set({
        homeCity: city, homeCountryCode: countryCode, homeLat: lat, homeLon: lon,
      }),

      // ── Onboarding ────────────────────────────────────────────────────
      completeOnboarding: ({ userName, travelStyle, homeCurrency, theme }) =>
        set({ userName, travelStyle, homeCurrency, theme, onboardingDone: true }),

      // ── Trips CRUD ────────────────────────────────────────────────────
      addTrip:    (t)         => set((s) => ({ trips: [t, ...s.trips] })),
      removeTrip: (id)        => set((s) => ({
        trips: s.trips.filter((t) => t.id !== id),
        // Nettoyer aussi les refs liées
        pinnedTripIds: s.pinnedTripIds.filter((pid) => pid !== id),
        participants:  (() => { const { [id]: _, ...rest } = s.participants; return rest; })(),
      })),
      updateTrip: (id, patch) => set((s) => ({
        trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),

      // ── Pin / Unpin ──────────────────────────────────────────────────
      pinTrip:   (id) => set((s) => ({
        pinnedTripIds: s.pinnedTripIds.includes(id) ? s.pinnedTripIds : [...s.pinnedTripIds, id],
      })),
      unpinTrip: (id) => set((s) => ({
        pinnedTripIds: s.pinnedTripIds.filter((pid) => pid !== id),
      })),

      // ── Steps ─────────────────────────────────────────────────────────
      addStep: (tripId, step) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, steps: [...t.steps, step] } : t,
        ),
      })),
      updateStep: (tripId, stepId, patch) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, steps: t.steps.map((st) => st.id === stepId ? { ...st, ...patch } : st) }
            : t,
        ),
      })),
      removeStep: (tripId, stepId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, steps: t.steps.filter((st) => st.id !== stepId) }
            : t,
        ),
      })),

      // ── Expenses ──────────────────────────────────────────────────────
      addExpense: (tripId, e) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, expenses: [e, ...t.expenses] } : t,
        ),
      })),
      updateExpense: (tripId, id, patch) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, expenses: t.expenses.map((e) => e.id === id ? { ...e, ...patch } : e) }
            : t,
        ),
      })),
      removeExpense: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, expenses: t.expenses.filter((e) => e.id !== id) }
            : t,
        ),
      })),

      // ── Checklist ─────────────────────────────────────────────────────
      toggleChecklist: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: t.checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c) }
            : t,
        ),
      })),
      addChecklistItem: (tripId, label) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: [...t.checklist, { id: crypto.randomUUID(), label, done: false }] }
            : t,
        ),
      })),
      removeChecklistItem: (tripId, id) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, checklist: t.checklist.filter((c) => c.id !== id) }
            : t,
        ),
      })),
      setChecklist: (tripId, items) => set((s) => ({
        trips: s.trips.map((t) => t.id === tripId ? { ...t, checklist: items } : t),
      })),

      // ── Documents ─────────────────────────────────────────────────────
      addDocument: (tripId, doc) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, documents: [...(t.documents ?? []), doc] } : t,
        ),
      })),
      removeDocument: (tripId, docId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, documents: (t.documents ?? []).filter((d) => d.id !== docId) }
            : t,
        ),
      })),

      // ── Souvenirs ─────────────────────────────────────────────────────
      addMemory: (tripId, memory) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId ? { ...t, memories: [...(t.memories ?? []), memory] } : t,
        ),
      })),
      removeMemory: (tripId, memoryId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, memories: (t.memories ?? []).filter((m) => m.id !== memoryId) }
            : t,
        ),
      })),
      detachMemoriesFromStep: (tripId, stepId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                memories: (t.memories ?? []).map((memory) =>
                  memory.stepId === stepId
                    ? { ...memory, stepId: undefined }
                    : memory,
                ),
              }
            : t,
        ),
      })),

      // ── Notes ─────────────────────────────────────────────────────────
      setNotes: (tripId, notes) => set((s) => ({
        trips: s.trips.map((t) => t.id === tripId ? { ...t, notes } : t),
      })),

      // ── AI Suggestions ────────────────────────────────────────────────
      setAiSuggestions: (key, suggestions) => set((s) => ({
        aiSuggestions: { ...s.aiSuggestions, [key]: suggestions },
      })),
      markSuggestionUsed: (key, suggestion) => set((s) => ({
        usedSuggestions: {
          ...s.usedSuggestions,
          [key]: [...(s.usedSuggestions[key] ?? []), suggestion],
        },
      })),
      clearUsedSuggestions: (key) => set((s) => ({
        usedSuggestions: { ...s.usedSuggestions, [key]: [] },
      })),

      // ── Notifications ─────────────────────────────────────────────────
      addNotification: (n) => set((s) => {
        if (!s.notificationsEnabled) return s;
        if (n.tripId && s.notifDisabledTrips.includes(n.tripId)) return s;

        const newNotif: AppNotification = {
          ...n,
          id:        crypto.randomUUID(),
          read:      false,
          createdAt: new Date().toISOString(),
        };

        if (n.dedupeKey) {
          const existingIndex = s.notifications.findIndex((existing) => existing.dedupeKey === n.dedupeKey);
          if (existingIndex !== -1) {
            const updated = [...s.notifications];
            updated[existingIndex] = newNotif;
            return { notifications: updated };
          }
        }

        return {
          notifications: [newNotif, ...s.notifications].slice(0, 50),
        };
      }),

      replaceOrAddNotification: (n, matchKey) => set((s) => {
        if (!s.notificationsEnabled) return s;
        if (n.tripId && s.notifDisabledTrips.includes(n.tripId)) return s;

        const existingIndex = s.notifications.findIndex((existing) => {
          if (n.dedupeKey && existing.dedupeKey === n.dedupeKey) return true;
          return existing.tripId === n.tripId &&
            existing.type === n.type &&
            existing.title.includes(matchKey);
        });

        const newNotif: AppNotification = {
          ...n,
          id:        crypto.randomUUID(),
          read:      false,
          createdAt: new Date().toISOString(),
        };

        if (existingIndex !== -1) {
          const updated = [...s.notifications];
          updated[existingIndex] = newNotif;
          return { notifications: updated };
        }

        return {
          notifications: [newNotif, ...s.notifications].slice(0, 50),
        };
      }),

      markNotifRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      })),

      markAllNotifsRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),

      removeNotification: (id) => set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      })),

      clearNotifications: () => set({ notifications: [] }),

      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),

      toggleNotifForTrip: (tripId) => set((s) => {
        const disabled = s.notifDisabledTrips;
        if (disabled.includes(tripId)) {
          return { notifDisabledTrips: disabled.filter((id) => id !== tripId) };
        }
        return { notifDisabledTrips: [...disabled, tripId] };
      }),

      // ── Chat ──────────────────────────────────────────────────────────
      addChatMessage: (tripId, msg) => set((s) => ({
        chatHistories: {
          ...s.chatHistories,
          [tripId]: [
            ...(s.chatHistories[tripId] ?? []),
            {
              ...msg,
              id:        crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ].slice(-100),
        },
      })),

      clearChatHistory: (tripId) => set((s) => ({
        chatHistories: { ...s.chatHistories, [tripId]: [] },
      })),

      // ── FAB trigger ─────────────────────────────────────────────────
      triggerFabCreate: () => set({ fabCreateTrip: true }),
      consumeFabCreate: () => set({ fabCreateTrip: false }),
    }),

    {
      name:    'mytrip-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trips:                state.trips,
        homeCurrency:         state.homeCurrency,
        authed:               state.authed,
        userName:             state.userName,
        userEmoji:            state.userEmoji,
        userPhotoUrl:         state.userPhotoUrl,           // ✅ V5
        theme:                state.theme,
        onboardingDone:       state.onboardingDone,
        travelStyle:          state.travelStyle,
        homeCity:             state.homeCity,               // ✅ V5.2
        homeCountryCode:      state.homeCountryCode,         // ✅ V5.2
        homeLat:              state.homeLat,                // ✅ V5.2
        homeLon:              state.homeLon,                // ✅ V5.2
        pinnedTripIds:        state.pinnedTripIds,           // ✅ V5
        participants:         state.participants,            // ✅ V5
        notifications:        state.notifications,
        notificationsEnabled: state.notificationsEnabled,
        notifDisabledTrips:   state.notifDisabledTrips,
        chatHistories:        state.chatHistories,
      }),

      // ✅ Migration automatique : si l'utilisateur avait le store V1,
      // on le transforme en V2 (nouvelles propriétés ajoutées avec défauts)
      version: 2,

      migrate: (persistedState: unknown, version: number): State => {
        const state = persistedState as Record<string, unknown>;

        // Si on vient de la V1 (ou version non versionnée = 0/undefined)
        if (!version || version < 2) {
          return {
            trips:                (state.trips as Trip[])?.map((trip) => ({
              ...trip,
                // Migrer les documents : ajouter category/size/fileType/createdAt si manquants
              documents: (trip.documents ?? []).map((d) => ({
                ...d,
                category:  (d as Record<string, unknown>).category  as string ?? 'other',
                size:      (d as Record<string, unknown>).size      as number ?? 0,
                fileType:  (d as Record<string, unknown>).fileType  as string ?? 'other',
                createdAt: (d as Record<string, unknown>).createdAt as string ?? trip.createdAt,
              })),
              // Ajouter les champs multi-devises manquants sur chaque dépense
              expenses: (trip.expenses as Expense[])?.map((e) => ({
                ...e,
                currency:     (e as Record<string, unknown>).currency     as string ?? trip.currency,
                amountHome:   (e as Record<string, unknown>).amountHome   as number ?? e.amount,
                homeCurrency: (e as Record<string, unknown>).homeCurrency as string ?? trip.homeCurrency,
                exchangeRate: (e as Record<string, unknown>).exchangeRate as number ?? 1,
              })) ?? [],
            })) ?? [],
            homeCurrency:         (state.homeCurrency         as string)            ?? 'EUR',
            authed:               (state.authed               as boolean)           ?? false,
            userName:             (state.userName             as string)            ?? 'Voyageur',
            userEmoji:            (state.userEmoji            as string)            ?? '✈️',
            userPhotoUrl:         (state.userPhotoUrl         as string | null)     ?? null,
            theme:                (state.theme                as AppTheme)          ?? 'myplanair',
            onboardingDone:       (state.onboardingDone       as boolean)           ?? false,
            travelStyle:          (state.travelStyle          as TravelStyle | null) ?? null,
            homeCity:             (state.homeCity             as string)            ?? 'Paris',
            homeCountryCode:      (state.homeCountryCode      as string)            ?? 'FR',
            homeLat:              (state.homeLat              as number)            ?? 48.8566,
            homeLon:              (state.homeLon              as number)            ?? 2.3522,
            pinnedTripIds:        (state.pinnedTripIds        as string[])          ?? [],
            participants:         (state.participants         as Record<string, Participant[]>) ?? {},
            notifications:        (state.notifications        as AppNotification[]) ?? [],
            notificationsEnabled: (state.notificationsEnabled as boolean)           ?? true,
            notifDisabledTrips:   (state.notifDisabledTrips   as string[])          ?? [],
            chatHistories:        (state.chatHistories        as Record<string, ChatMessage[]>) ?? {},
            aiSuggestions:        (state.aiSuggestions        as Record<string, string[]>) ?? {},
            usedSuggestions:      (state.usedSuggestions      as Record<string, string[]>) ?? {},
            // Actions — seront remplies par Zustand, mais on doit les stubber
            setAuthed:              () => {},
            setUserName:            () => {},
            setUserEmoji:           () => {},
            setUserPhotoUrl:        () => {},
            setHomeCurrency:        () => {},
            setTheme:               () => {},
            setTravelStyle:         () => {},
            setHomeCity:            () => {},
            completeOnboarding:     () => {},
            addTrip:                () => {},
            removeTrip:             () => {},
            updateTrip:             () => {},
            pinTrip:                () => {},
            unpinTrip:              () => {},
            addStep:                () => {},
            updateStep:             () => {},
            removeStep:             () => {},
            addExpense:             () => {},
            updateExpense:          () => {},
            removeExpense:          () => {},
            toggleChecklist:        () => {},
            addChecklistItem:       () => {},
            removeChecklistItem:    () => {},
            setChecklist:           () => {},
            addDocument:            () => {},
            removeDocument:         () => {},
            addMemory:              () => {},
            removeMemory:           () => {},
            detachMemoriesFromStep: () => {},
            setNotes:               () => {},
            setAiSuggestions:       () => {},
            markSuggestionUsed:     () => {},
            clearUsedSuggestions:   () => {},
            addNotification:        () => {},
            replaceOrAddNotification: () => {},
            markNotifRead:          () => {},
            markAllNotifsRead:      () => {},
            removeNotification:     () => {},
            clearNotifications:     () => {},
            setNotificationsEnabled: () => {},
            toggleNotifForTrip:     () => {},
            addChatMessage:         () => {},
            clearChatHistory:       () => {},
            // ── FAB trigger ─────────────────────────────────────────
            fabCreateTrip:        false,
            triggerFabCreate:     () => {},
            consumeFabCreate:     () => {},
          } as State;
        }

        return state as unknown as State;
      },
    },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// Hooks utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/** Récupère un trip par ID */
export const useTrip = (id?: string): Trip | undefined =>
  useTripStore((s) => s.trips.find((t) => t.id === id));
