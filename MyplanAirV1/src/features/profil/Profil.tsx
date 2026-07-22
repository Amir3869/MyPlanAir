// src/features/profil/Profil.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Page Profil — Route "/profil"
// Avatar + Photo upload + Stats + Réglages + Abonnement + Déconnexion
// CONFORME au Plan d'Action validé — tous les éléments présents
// + Édition nom inline premium + Emoji avatar + Méthode connexion + PDF bientôt
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Coins, Luggage, Bell, LogOut,
  Download, Trash2, ChevronRight, Check,
  Shield, Star, Camera, Image,
  Pencil, FileText, Home, MapPin, Search,
  Activity,
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useTripStore, type AppTheme, type TravelStyle } from '../../store/tripStore';
import { USER_EMOJIS, nameToHue, nameToInitials } from '../../store/types';
import { GlassCard } from '../../shared/GlassCard';
import { ImageCropSheet } from '../../shared/ImageCropSheet';
import { CURRENCIES } from '../../api/countries';
import { tripStatus } from '../../utils/dateHelpers';
import { haversineKm } from '../../utils/geo';
import { useToast } from '../../shared/Toast';
import { haptic } from '../../utils/haptic';
import { DocStorage } from '../../utils/docStorage';
import { MemoryStorage } from '../../utils/memoryStorage';
import { recordLocalUsage } from '../../utils/usageTelemetry';

// ─── Thèmes ──────────────────────────────────────────────────────────────────

const THEMES: {
  key: AppTheme; label: string; emoji: string;
  base: string; accentFrom: string; accentTo: string; accentRgb: string; accentLbl: string;
}[] = [
  { key: 'dark',       label: 'Sombre',      emoji: '🌑', base: '#07070b', accentFrom: '#7c8cff', accentTo: '#ec4899', accentRgb: '124,140,255', accentLbl: '#a5b4fc' },
  { key: 'myplanair',  label: 'My Plan’Air', emoji: '✈️', base: '#07070b', accentFrom: '#7C3AED', accentTo: '#FF7A00', accentRgb: '124,58,237',  accentLbl: '#FDBA74' },
  { key: 'ocean',      label: 'Océan',       emoji: '🌊', base: '#020d1a', accentFrom: '#00d4ff', accentTo: '#0066ff', accentRgb: '0,212,255',  accentLbl: '#67e8f9' },
  { key: 'sunset',  label: 'Sunset',  emoji: '🌅', base: '#0f0608', accentFrom: '#ff6b35', accentTo: '#ec4899', accentRgb: '255,107,53', accentLbl: '#fdba74' },
  { key: 'forest',  label: 'Forêt',   emoji: '🌿', base: '#040d06', accentFrom: '#56c5a4', accentTo: '#00d4ff', accentRgb: '86,197,164', accentLbl: '#6ee7b7' },
  { key: 'minimal', label: 'Minimal', emoji: '⚡', base: '#0d0d0d', accentFrom: '#ffffff', accentTo: '#a0a0a0', accentRgb: '255,255,255', accentLbl: '#e5e5e5' },
];

const applyTheme = (themeKey: AppTheme) => {
  const t = THEMES.find((th) => th.key === themeKey);
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

// ─── Travel Styles ───────────────────────────────────────────────────────────

const TRAVEL_STYLES: { key: TravelStyle; label: string; emoji: string }[] = [
  { key: 'solo',     label: 'Solo',     emoji: '🧳' },
  { key: 'couple',   label: 'Couple',   emoji: '👫' },
  { key: 'family',   label: 'Famille',  emoji: '👨‍👩‍👧‍👦' },
  { key: 'business', label: 'Business', emoji: '💼' },
];

// ─── Profil ──────────────────────────────────────────────────────────────────

export const Profil = () => {
  const { signOut }       = useClerk();
  const { user }          = useUser();
  const { toast }         = useToast();
  const navigate          = useNavigate();

  const userName            = useTripStore((s) => s.userName);
  const setUserName         = useTripStore((s) => s.setUserName);
  const userEmoji           = useTripStore((s) => s.userEmoji);
  const setUserEmoji        = useTripStore((s) => s.setUserEmoji);
  const userPhotoUrl        = useTripStore((s) => s.userPhotoUrl);
  const setUserPhotoUrl     = useTripStore((s) => s.setUserPhotoUrl);
  const homeCurrency        = useTripStore((s) => s.homeCurrency);
  const theme               = useTripStore((s) => s.theme);
  const travelStyle         = useTripStore((s) => s.travelStyle);
  const notificationsEnabled = useTripStore((s) => s.notificationsEnabled);
  const trips               = useTripStore((s) => s.trips);
  const setHomeCurrency     = useTripStore((s) => s.setHomeCurrency);
  const setTheme            = useTripStore((s) => s.setTheme);
  const setTravelStyle      = useTripStore((s) => s.setTravelStyle);
  const setNotificationsEnabled = useTripStore((s) => s.setNotificationsEnabled);
  const homeCity               = useTripStore((s) => s.homeCity);
  const homeCountryCode        = useTripStore((s) => s.homeCountryCode);
  const homeLat                = useTripStore((s) => s.homeLat);
  const homeLon                = useTripStore((s) => s.homeLon);
  const setHomeCity            = useTripStore((s) => s.setHomeCity);

  const [currencyOpen, setCurrencyOpen]         = useState(false);
  const [styleOpen, setStyleOpen]               = useState(false);
  const [homeCityOpen, setHomeCityOpen]         = useState(false);
  const [homeCitySearch, setHomeCitySearch]     = useState('');
  const [homeCityResults, setHomeCityResults]   = useState<Array<{ name: string; country: string; countryCode: string; lat: number; lon: number }>>([]);
  const [homeCitySearching, setHomeCitySearching] = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState(false);
  const [logoutConfirm, setLogoutConfirm]       = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen]     = useState(false);
  const [cropSource, setCropSource]             = useState<string | null>(null);
  const [uploading, setUploading]               = useState(false);
  const [editingName, setEditingName]           = useState(false);
  const [nameDraft, setNameDraft]               = useState('');

  const galleryInputRef  = useRef<HTMLInputElement>(null);
  const cameraInputRef   = useRef<HTMLInputElement>(null);
  const nameInputRef     = useRef<HTMLInputElement>(null);

  const isValidCoord = (lat?: number, lon?: number): boolean =>
    Number.isFinite(lat) && Number.isFinite(lon);

  const getTripDistanceKm = (trip: typeof trips[number]): number => {
    if (!isValidCoord(homeLat, homeLon)) return 0;

    if (trip.isRoadtrip && trip.destinations && trip.destinations.length > 0) {
      return trip.destinations.reduce((sum, destination) => (
        isValidCoord(destination.lat, destination.lon)
          ? sum + haversineKm(homeLat, homeLon, destination.lat!, destination.lon!) * 2
          : sum
      ), 0);
    }

    return isValidCoord(trip.lat, trip.lon)
      ? haversineKm(homeLat, homeLon, trip.lat!, trip.lon!) * 2
      : 0;
  };

  // Stats
  const stats = useMemo(() => {
    const uniqueCountries = new Set(trips.map((t) => t.countryCode)).size;
    const uniqueCities = new Set(
      trips.flatMap((t) => (
        t.isRoadtrip && t.destinations && t.destinations.length > 0
          ? t.destinations.map((dest) => `${dest.city}|${dest.countryCode}`)
          : [`${t.destination}|${t.countryCode}`]
      )),
    ).size;
    const totalKm = trips.reduce((sum, trip) => sum + getTripDistanceKm(trip), 0);
    const badgeCount = [
      trips.length >= 1,
      uniqueCountries >= 5,
      uniqueCountries >= 10,
      trips.length >= 5,
      totalKm >= 10000,
      totalKm >= 50000,
      trips.some((t) => tripStatus(t.startDate, t.endDate) === 'ongoing'),
      trips.length >= 10,
    ].filter(Boolean).length;

    return { uniqueCountries, totalTrips: trips.length, uniqueCities, totalKm, badgeCount };
  }, [trips, homeLat, homeLon]);

  // Avatar
  const initials  = nameToInitials(userName);
  const hue       = nameToHue(userName);
  const clerkPhoto = user?.imageUrl ?? null;
  const avatarUrl  = userPhotoUrl ?? clerkPhoto;

  // ── Méthode de connexion ──
  const authMethod = useMemo(() => {
    if (!user) return null;
    const strategies = user.externalAccounts.map((a) => a.provider);
    if (strategies.includes('google')) return { label: 'Google', emoji: '🔵' };
    if (strategies.includes('apple'))  return { label: 'Apple',  emoji: '🍎' };
    return { label: 'Email', emoji: '📧' };
  }, [user]);

  // ── Édition du nom ──
  const startEditName = () => {
    setNameDraft(userName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length >= 1) {
      setUserName(trimmed);
      toast('Nom mis à jour !', 'success');
    }
    setEditingName(false);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameDraft('');
  };

  // ── Photo Upload ──
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setPhotoSheetOpen(false);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSource(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const dataUrlToFile = async (dataUrl: string, fileName = 'profile-photo.jpg'): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg', lastModified: Date.now() });
  };

  const handleCroppedPhoto = async (croppedDataUrl: string) => {
    setUploading(true);
    setCropSource(null);
    setUserPhotoUrl(croppedDataUrl);
    try {
      if (user) {
        const file = await dataUrlToFile(croppedDataUrl);
        await user.setProfileImage({ file });
      }
      toast('Photo mise à jour !', 'success');
    } catch {
      toast('Photo ajustée localement. Synchronisation compte indisponible.', 'info');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    setPhotoSheetOpen(false);
    try {
      if (user) {
        setUserPhotoUrl(null);
        toast('Photo supprimée', 'info');
      }
    } catch {
      toast('Erreur lors de la suppression', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Export JSON ──
  const handleExport = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      app: 'My Plan’Air',
      version: 1,
      profile: {
        userName,
        homeCurrency,
        homeCity,
        homeCountryCode,
        homeLat,
        homeLon,
        theme,
        travelStyle,
        notificationsEnabled,
      },
      trips,
      note: 'Export local : les fichiers documents et photos souvenirs stockés en IndexedDB ne sont pas inclus.',
    };

    const data = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `mytrip-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Export local créé', 'success');
  };

  // ── Déconnexion ──
  const handleLogout = async () => {
    try { await signOut(); } catch { toast('Erreur lors de la déconnexion', 'error'); }
  };

  // ── Effacement données locales ──
  const handleClearLocalData = async () => {
    try {
      haptic([8, 30, 8]);
      await Promise.allSettled(
        trips.flatMap((trip) => [
          DocStorage.clearTrip(trip.id),
          MemoryStorage.clearTrip(trip.id),
        ]),
      );
      localStorage.removeItem('mytrip-store-v2');
      toast('Données locales effacées', 'info');
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      toast('Erreur lors de l’effacement des données locales', 'error');
    }
  };

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

      <main className="relative z-10 px-5 pb-28 max-w-3xl mx-auto pt-safe space-y-5">

        {/* ══════════════════════════════════════════════════════════════════════
            1. EN-TÊTE PROFIL — Avatar + Nom éditable + Auth + Photo
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="pt-5 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white relative"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`,
                  border: '3px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {/* Emoji avatar si défini, sinon initiales */}
                {userEmoji && userEmoji !== '✈️' ? (
                  <span className="text-3xl">{userEmoji}</span>
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            )}

            {/* Indicateur upload en cours */}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Nom — Éditable inline premium */}
          <div className="mt-3 flex items-center justify-center">
            {editingName ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(var(--accent-from-rgb), 0.3)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                  maxLength={30}
                  className="text-xl font-bold tracking-tight text-center bg-transparent outline-none min-w-[100px] max-w-[180px]"
                  style={{ color: 'var(--t-primary, rgba(255,255,255,0.96))' }}
                />
                <button
                  onClick={saveName}
                  className="p-1.5 rounded-xl tap"
                  style={{ background: 'rgba(86,197,164,0.15)', color: '#56c5a4' }}
                >
                  <Check size={15} strokeWidth={2.5} />
                </button>
                <button
                  onClick={cancelEditName}
                  className="p-1.5 rounded-xl tap"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={startEditName}
                className="flex items-center gap-2 tap rounded-2xl px-3 py-2 transition"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h1 className="text-xl font-bold tracking-tight">{userName}</h1>
                <Pencil size={13} style={{ color: 'var(--accent-label)', opacity: 0.7 }} />
              </button>
            )}
          </div>

          {/* Méthode de connexion */}
          {authMethod && (
            <div
              className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              {authMethod.emoji} Connecté via {authMethod.label}
            </div>
          )}

          {/* Bouton Changer ma photo */}
          <button
            onClick={() => { haptic(5); setPhotoSheetOpen(true); }}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-2xl tap text-xs font-semibold transition"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <Camera size={13} />
            Changer ma photo
          </button>

          {/* Hidden file inputs */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            2. STATISTIQUES
            ══════════════════════════════════════════════════════════════════════ */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 gap-2">
            {[
              { value: stats.uniqueCountries, label: 'Pays',     emoji: '🌍' },
              { value: stats.totalTrips,      label: 'Voyages',  emoji: '✈️' },
              { value: stats.uniqueCities,     label: 'Villes',   emoji: '🏙️' },
              { value: `${Math.round(stats.totalKm / 1000)}k`, label: 'km', emoji: '🚀' },
              { value: stats.badgeCount,       label: 'Badges',  emoji: '🏆' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg mb-0.5">{stat.emoji}</div>
                <div className="text-lg font-bold font-display tracking-tighter leading-tight">{stat.value}</div>
                <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ══════════════════════════════════════════════════════════════════════
            3. APPARENCE
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Apparence</div>
          <GlassCard className="p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Palette size={14} className="text-white/50" /> Thème
              </div>
              {(() => {
                const signatureTheme = THEMES.find((t) => t.key === 'myplanair')!;
                const signatureActive = theme === signatureTheme.key;
                return (
                  <button
                    onClick={() => { haptic(6); applyTheme(signatureTheme.key); setTheme(signatureTheme.key); }}
                    className="w-full rounded-[22px] p-3 flex items-center gap-3 text-left tap transition-all mb-3 relative overflow-hidden isolate"
                    style={{
                      background: signatureActive
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(200,74,166,0.13) 58%, rgba(255,122,0,0.14) 100%)'
                        : 'linear-gradient(135deg, rgba(124,58,237,0.13) 0%, rgba(200,74,166,0.08) 58%, rgba(255,122,0,0.08) 100%)',
                      border: signatureActive ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.09)',
                      boxShadow: signatureActive ? '0 12px 32px rgba(124,58,237,0.16)' : 'none',
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-[inherit] pointer-events-none -z-10"
                      style={{
                        background: 'radial-gradient(circle at 92% 12%, rgba(255,122,0,0.20) 0%, rgba(255,122,0,0.10) 28%, transparent 56%)',
                      }}
                    />
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 relative" style={{ filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.35)) drop-shadow(0 0 8px rgba(255,122,0,0.14))' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="-rotate-12" aria-hidden="true">
                        <defs>
                          <linearGradient id="profile-myplanair-plane-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#7C3AED" />
                            <stop offset="52%" stopColor="#7C3AED" />
                            <stop offset="82%" stopColor="#C84AA6" />
                            <stop offset="100%" stopColor="#FF7A00" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 4 2 2 4 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"
                          stroke="url(#profile-myplanair-plane-gradient)"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-sm font-semibold tracking-tight text-white/90">My Plan’Air</div>
                      <div className="text-xs text-white/38 mt-0.5">Thème signature</div>
                    </div>
                    {signatureActive && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #7C3AED, #FF7A00)' }}>
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })()}

              <div className="grid grid-cols-5 gap-2">
                {THEMES.filter((t) => t.key !== 'myplanair').map((t) => {
                  const active = theme === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => { haptic(6); applyTheme(t.key); setTheme(t.key); }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-2xl tap transition-all"
                      style={{
                        background: active ? `${t.accentFrom}25` : 'rgba(255,255,255,0.05)',
                        border: active ? `1px solid ${t.accentFrom}60` : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span className="text-[10px] font-medium text-white/70 truncate w-full text-center">{t.label}</span>
                      {active && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: t.accentFrom }}>
                          <Check size={10} className="text-black" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            4. PRÉFÉRENCES — Devise + Style voyage + Notifications
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Préférences</div>
          <GlassCard className="divide-y divide-white/5">

            {/* Devise */}
            <button onClick={() => { haptic(4); setCurrencyOpen(!currencyOpen); setStyleOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,178,74,0.2)' }}>
                <Coins size={15} style={{ color: '#f0b24a' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Devise principale</div>
                <div className="text-xs text-white/35">{homeCurrency}</div>
              </div>
              <motion.div animate={{ rotate: currencyOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} className="text-white/25" />
              </motion.div>
            </button>
            <AnimatePresence>
              {currencyOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { haptic(5); setHomeCurrency(c.code); setCurrencyOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition"
                        style={{ background: c.code === homeCurrency ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                      >
                        <span className="text-sm font-medium">{c.code}</span>
                        <span className="text-xs text-white/35">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Style voyage */}
            <button onClick={() => { haptic(4); setStyleOpen(!styleOpen); setCurrencyOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,140,255,0.2)' }}>
                <Luggage size={15} style={{ color: '#7c8cff' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Style voyage</div>
                <div className="text-xs text-white/35 capitalize">
                  {travelStyle ? TRAVEL_STYLES.find((s) => s.key === travelStyle)?.label ?? travelStyle : 'Non défini'}
                </div>
              </div>
              <motion.div animate={{ rotate: styleOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} className="text-white/25" />
              </motion.div>
            </button>
            <AnimatePresence>
              {styleOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-4 py-3 grid grid-cols-4 gap-2">
                    {TRAVEL_STYLES.map((s) => {
                      const active = travelStyle === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => { haptic(5); setTravelStyle(s.key); setStyleOpen(false); }}
                          className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl tap transition-all"
                          style={{
                            background: active ? 'rgba(var(--accent-from-rgb), 0.18)' : 'rgba(255,255,255,0.05)',
                            border: active ? '1px solid rgba(var(--accent-from-rgb), 0.35)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <span className="text-xl">{s.emoji}</span>
                          <span className="text-[10px] font-medium text-white/70">{s.label}</span>
                          {active && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-from)' }}>
                              <Check size={10} className="text-black" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notifications */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(86,197,164,0.2)' }}>
                <Bell size={15} style={{ color: '#56c5a4' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Notifications</div>
                <div className="text-xs text-white/35">{notificationsEnabled ? 'Activées' : 'Désactivées'}</div>
              </div>
              {/* Toggle iOS-style */}
              <button
                onClick={() => { haptic(5); setNotificationsEnabled(!notificationsEnabled); }}
                className="relative w-12 h-7 rounded-full tap transition-colors duration-200"
                style={{
                  background: notificationsEnabled ? 'var(--accent-from)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <motion.div
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                  animate={{ left: notificationsEnabled ? 22 : 2 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              </button>
            </div>

            {/* 🏠 Ville de résidence */}
            <button
              onClick={() => { haptic(4); setHomeCityOpen(!homeCityOpen); setCurrencyOpen(false); setStyleOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 tap"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,178,74,0.2)' }}>
                <Home size={15} style={{ color: '#f0b24a' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Ville de résidence</div>
                <div className="text-xs text-white/35">🏠 {homeCity}</div>
              </div>
              <motion.div animate={{ rotate: homeCityOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} className="text-white/25" />
              </motion.div>
            </button>
            <AnimatePresence>
              {homeCityOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-2">
                    {/* Champ recherche */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Search size={14} className="text-white/30 flex-shrink-0" />
                      <input
                        type="text"
                        value={homeCitySearch}
                        onChange={(e) => {
                          setHomeCitySearch(e.target.value);
                          // Recherche Photon
                          if (e.target.value.length >= 2) {
                            const query = e.target.value;
                            const startedAt = Date.now();
                            setHomeCitySearching(true);
                            fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`)
                              .then((r) => {
                                if (!r.ok) {
                                  recordLocalUsage({
                                    service: 'geocode',
                                    category: 'external',
                                    endpoint: 'photon/profile-search',
                                    status: 'error',
                                    durationMs: Date.now() - startedAt,
                                    errorReason: `http_${r.status}`,
                                    details: { query },
                                  });
                                  throw new Error(`HTTP ${r.status}`);
                                }
                                return r.json();
                              })
                              .then((data) => {
                                const results = (data.features ?? []).map((f: any) => ({
                                  name: f.properties.name ?? f.properties.city ?? '',
                                  country: f.properties.country ?? '',
                                  countryCode: (f.properties.countrycode ?? '').toUpperCase(),
                                  lat: f.geometry?.coordinates?.[1] ?? 0,
                                  lon: f.geometry?.coordinates?.[0] ?? 0,
                                })).filter((r: any) => r.lat && r.lon);
                                recordLocalUsage({
                                  service: 'geocode',
                                  category: 'external',
                                  endpoint: 'photon/profile-search',
                                  status: results.length > 0 ? 'success' : 'error',
                                  durationMs: Date.now() - startedAt,
                                  errorReason: results.length > 0 ? undefined : 'not_found',
                                  details: { query, results: results.length },
                                });
                                setHomeCityResults(results);
                              })
                              .catch(() => setHomeCityResults([]))
                              .finally(() => setHomeCitySearching(false));
                          } else {
                            setHomeCityResults([]);
                          }
                        }}
                        placeholder="Chercher une ville..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/25"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                      {homeCitySearching && (
                        <span className="block w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />
                      )}
                    </div>

                    {/* Bouton GPS */}
                    <button
                      onClick={() => {
                        if (!('geolocation' in navigator)) return;
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            // Reverse geocode avec Photon
                            const startedAt = Date.now();
                            fetch(`https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                              .then((r) => {
                                if (!r.ok) {
                                  recordLocalUsage({
                                    service: 'geocode',
                                    category: 'external',
                                    endpoint: 'photon/profile-reverse',
                                    status: 'error',
                                    durationMs: Date.now() - startedAt,
                                    errorReason: `http_${r.status}`,
                                  });
                                  throw new Error(`HTTP ${r.status}`);
                                }
                                return r.json();
                              })
                              .then((data) => {
                                const f = data.features?.[0];
                                if (f) {
                                  const name = f.properties.name ?? f.properties.city ?? '';
                                  const cc = (f.properties.countrycode ?? '').toUpperCase();
                                  if (name) {
                                    recordLocalUsage({
                                      service: 'geocode',
                                      category: 'external',
                                      endpoint: 'photon/profile-reverse',
                                      status: 'success',
                                      durationMs: Date.now() - startedAt,
                                      details: { name, countryCode: cc },
                                    });
                                    setHomeCity(name, cc, pos.coords.latitude, pos.coords.longitude);
                                    setHomeCityOpen(false);
                                    toast(`🏠 Domicile : ${name}`, 'success');
                                    return;
                                  }
                                }
                                recordLocalUsage({
                                  service: 'geocode',
                                  category: 'external',
                                  endpoint: 'photon/profile-reverse',
                                  status: 'error',
                                  durationMs: Date.now() - startedAt,
                                  errorReason: 'not_found',
                                });
                              })
                              .catch(() => toast('Impossible de déterminer la ville', 'error'));
                          },
                          () => {
                            recordLocalUsage({
                              service: 'geocode',
                              category: 'external',
                              endpoint: 'browser/geolocation',
                              status: 'error',
                              errorReason: 'geolocation_unavailable',
                            });
                            toast('Géolocalisation indisponible', 'error');
                          },
                          { timeout: 8000 },
                        );
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl tap text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      <MapPin size={12} /> Utiliser ma position actuelle
                    </button>

                    {/* Résultats */}
                    {homeCityResults.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {homeCityResults.map((r, i) => (
                          <button
                            key={`${r.name}-${r.countryCode}-${i}`}
                            onClick={() => {
                              haptic(5);
                              setHomeCity(r.name, r.countryCode, r.lat, r.lon);
                              setHomeCityOpen(false);
                              setHomeCitySearch('');
                              setHomeCityResults([]);
                              toast(`🏠 Domicile : ${r.name}`, 'success');
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition"
                            style={{ background: r.name === homeCity ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}
                          >
                            <Home size={12} className="text-white/25 flex-shrink-0" />
                            <span className="text-sm font-medium">{r.name}</span>
                            <span className="text-[10px] text-white/30">{r.country}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            5. CONSOLE TEST — API / IA
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Test</div>
          <GlassCard className="overflow-hidden">
            <button
              onClick={() => { haptic(6); navigate('/admin-test'); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 tap text-left relative overflow-hidden"
            >
              <div
                className="absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-20"
                style={{ background: '#7c8cff' }}
              />
              <div className="w-8 h-8 rounded-xl flex items-center justify-center relative" style={{ background: 'rgba(124,140,255,0.18)' }}>
                <Activity size={15} style={{ color: '#a5b4fc' }} />
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="text-sm font-medium">Admin test</div>
                <div className="text-xs text-white/35">API · IA · tokens · quotas locaux</div>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full relative"
                style={{ background: 'rgba(124,140,255,0.14)', color: '#a5b4fc' }}
              >
                LOCAL
              </span>
              <ChevronRight size={14} className="text-white/25 relative" />
            </button>
          </GlassCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            6. DONNÉES — Sauvegarde + PDF + Supprimer compte
            ══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-2 px-1">Données</div>
          <GlassCard className="divide-y divide-white/5">
            {/* Sauvegarder mes données */}
            <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(86,197,164,0.2)' }}>
                <Download size={15} style={{ color: '#56c5a4' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Exporter mes données locales</div>
                <div className="text-xs text-white/35">Voyages et préférences · hors fichiers locaux</div>
              </div>
              <span className="text-white/45 text-xs">JSON</span>
            </button>

            {/* Export PDF — Bientôt */}
            <button
              disabled
              className="w-full flex items-center gap-3 px-4 py-3.5 opacity-50 cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,140,255,0.15)' }}>
                <FileText size={15} style={{ color: '#7c8cff' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Exporter en PDF</div>
                <div className="text-xs text-white/35">Souvenir de voyage à partager et imprimer</div>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(var(--accent-from-rgb), 0.15)', color: 'var(--accent-label)' }}
              >
                Bientôt
              </span>
            </button>

            {/* Effacer les données locales */}
            {!deleteConfirm ? (
              <button onClick={() => { haptic(4); setDeleteConfirm(true); }} className="w-full flex items-center gap-3 px-4 py-3.5 tap">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <Trash2 size={15} style={{ color: '#ef4444' }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium" style={{ color: 'rgba(239,68,68,0.85)' }}>Effacer mes données locales</div>
                  <div className="text-xs text-white/35">Voyages, documents et souvenirs sur cet appareil</div>
                </div>
                <ChevronRight size={14} className="text-white/25" />
              </button>
            ) : (
              <div className="px-4 py-3" style={{ background: 'rgba(239,68,68,0.04)' }}>
                <div className="text-sm font-semibold text-red-400 mb-1">Effacer les données locales ?</div>
                <div className="text-xs text-white/40 mb-3">Cette action supprime les voyages, documents et souvenirs stockés sur cet appareil. Ton compte reste actif.</div>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium tap" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    Annuler
                  </button>
                  <button onClick={handleClearLocalData} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white tap flex items-center justify-center gap-1" style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}>
                    <Trash2 size={13} /> Effacer
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            6. ABONNEMENT
            ══════════════════════════════════════════════════════════════════════ */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">Abonnement</div>
              <div className="text-xs text-white/35 mt-0.5">Plan actuel : <span className="text-white/60 font-semibold">Gratuit</span></div>
            </div>
            <Shield size={20} className="text-white/25" />
          </div>
          <div className="text-xs text-white/30 mb-3">10 requêtes IA/mois · 3 voyages max</div>
          <button
            disabled
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white/30 cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Star size={14} /> Passer Pro — 9,90€/mois
          </button>
        </GlassCard>

        {/* ══════════════════════════════════════════════════════════════════════
            7. DÉCONNEXION
            ══════════════════════════════════════════════════════════════════════ */}
        {!logoutConfirm ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptic(4); setLogoutConfirm(true); }}
            className="w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 tap"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            <LogOut size={16} />
            Se déconnecter
          </motion.button>
        ) : (
          <GlassCard className="p-4" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="text-sm font-semibold text-red-400 mb-1">Se déconnecter ?</div>
            <div className="text-xs text-white/40 mb-3">Tu vas perdre l'accès à tes voyages cloud. Continuer ?</div>
            <div className="flex gap-2">
              <button onClick={() => setLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium tap" style={{ background: 'rgba(255,255,255,0.08)' }}>
                Annuler
              </button>
              <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white tap flex items-center justify-center gap-1" style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}>
                <LogOut size={13} /> Déconnexion
              </button>
            </div>
          </GlassCard>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            8. FOOTER
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="text-center text-[10px] text-white/15 pt-2 pb-4">
          My Plan’Air v5.0 · Fait avec ❤️
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════════
          BOTTOM SHEET — Personnaliser l'avatar (Photo + Emoji)
          ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {photoSheetOpen && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPhotoSheetOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] overflow-hidden pb-safe"
              style={{ background: 'rgba(14,14,22,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator */}
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} /></div>

              <div className="px-5 pb-3 pt-1">
                <div className="font-bold text-lg tracking-tight">Personnaliser l'avatar</div>
                <div className="text-xs text-white/40 mt-0.5">Photo de profil ou emoji personnalisé</div>
              </div>

              <div className="px-3 pb-2 space-y-1">
                {/* Appareil photo */}
                <button
                  onClick={() => { cameraInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl tap transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-from-rgb), 0.18)' }}>
                    <Camera size={16} style={{ color: 'var(--accent-label)' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Prendre une photo</div>
                    <div className="text-xs text-white/35">Utiliser l'appareil photo</div>
                  </div>
                </button>

                {/* Galerie */}
                <button
                  onClick={() => { galleryInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl tap transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,140,255,0.18)' }}>
                    <Image size={16} style={{ color: '#a5b4fc' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Choisir dans la galerie</div>
                    <div className="text-xs text-white/35">Sélectionner une photo existante</div>
                  </div>
                </button>

                {/* Séparateur */}
                <div className="h-px mx-4 my-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* Emoji avatar */}
                <button
                  onClick={() => {
                    haptic(4);
                    setPhotoSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl tap transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(240,178,74,0.18)' }}>
                    😀
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Choisir un emoji</div>
                    <div className="text-xs text-white/35">Personnaliser l'avatar avec un emoji</div>
                  </div>
                </button>
              </div>

              {/* Grille d'emojis */}
              <div className="px-3 pb-3">
                <div className="grid grid-cols-8 gap-1 p-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {USER_EMOJIS.map((emoji) => {
                    const active = userEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        onClick={() => {
                          haptic(4);
                          setUserEmoji(emoji);
                          if (avatarUrl) setUserPhotoUrl(null);
                          setPhotoSheetOpen(false);
                          toast('Avatar mis à jour !', 'success');
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg tap transition-all"
                        style={{
                          background: active ? 'rgba(var(--accent-from-rgb), 0.25)' : 'transparent',
                          border: active ? '1px solid rgba(var(--accent-from-rgb), 0.4)' : '1px solid transparent',
                          transform: active ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supprimer la photo + Réinitialiser emoji */}
              {(avatarUrl || (userEmoji && userEmoji !== '✈️')) && (
                <div className="px-3 pb-2">
                  <div className="h-px mx-4 my-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="flex gap-2">
                    {avatarUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl tap transition"
                        style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                        <span className="text-sm font-medium">Supprimer la photo</span>
                      </button>
                    )}
                    {userEmoji && userEmoji !== '✈️' && (
                      <button
                        onClick={() => {
                          setUserEmoji('✈️');
                          setPhotoSheetOpen(false);
                          toast('Avatar réinitialisé', 'info');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl tap transition"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        <span className="text-sm font-medium">Réinitialiser</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Annuler */}
              <div className="px-3 pb-6 pt-1">
                <button
                  onClick={() => setPhotoSheetOpen(false)}
                  className="w-full flex items-center justify-center py-3.5 rounded-2xl tap font-semibold text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageCropSheet
        open={Boolean(cropSource)}
        imageUrl={cropSource}
        title="Ajuster ta photo"
        onClose={() => setCropSource(null)}
        onConfirm={handleCroppedPhoto}
      />
    </div>
  );
};
