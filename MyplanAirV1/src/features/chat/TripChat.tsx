// src/features/chat/TripChat.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Sparkles, RotateCcw,
  WifiOff, Trash2, MapPin, Navigation,
  X, ExternalLink, Locate,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip, useTripStore, type ChatMessage } from '../../store/tripStore';
import { fetchChat, clearChatCache, type ChatPayload } from '../../api/cloud';
import { daysBetween, tripStatus } from '../../utils/dateHelpers';
import { haptic } from '../../utils/haptic';
import { haversineKm, formatDistance, walkMinutes, metroMinutes, geocodePlace } from '../../utils/geo';
import { isIOS } from '../../utils/platform';

// ─────────────────────────────────────────────────────────────────────────────
// GUARD ANTI-DOUBLE MESSAGE — niveau module, survit au StrictMode
// ─────────────────────────────────────────────────────────────────────────────
const welcomeSentForTrips = new Set<string>();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type PlaceInfo = {
  name:    string;
  address: string;
  lat:     number;
  lon:     number;
  query:   string;
};

type Chip = { emoji: string; label: string; question: string };

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNES LEAFLET CUSTOM
// ─────────────────────────────────────────────────────────────────────────────
const createPlaceIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:36px;
        background:linear-gradient(135deg,#7c8cff,#ec4899);
        border-radius:50% 50% 50% 4px;
        transform:rotate(-45deg);
        box-shadow:0 4px 20px rgba(124,140,255,0.6);
        border:2px solid rgba(255,255,255,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);font-size:14px;">📍</div>
      </div>`,
    iconSize:    [36, 36],
    iconAnchor:  [18, 36],
    popupAnchor: [0, -40],
  });

const createUserIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          width:20px;height:20px;
          background:#56c5a4;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 0 3px rgba(86,197,164,0.35),0 4px 12px rgba(86,197,164,0.5);
        "></div>
        <div style="
          position:absolute;inset:-6px;
          border-radius:50%;
          background:rgba(86,197,164,0.15);
          animation:pulse-ring 2s ease-out infinite;
        "></div>
      </div>`,
    iconSize:    [20, 20],
    iconAnchor:  [10, 10],
    popupAnchor: [0, -16],
  });

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING — Utilise le helper partagé geo.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FLY TO — animation fluide vers le lieu
// ─────────────────────────────────────────────────────────────────────────────
const FlyToPlace = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 16, { duration: 1.2, easeLinearity: 0.25 });
  }, [lat, lon, map]);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST "LIEU NON TROUVÉ"
// ─────────────────────────────────────────────────────────────────────────────
const GeocodingFailToast = ({
  placeName,
  query,
  onClose,
}: {
  placeName: string;
  query:     string;
  onClose:   () => void;
}) => {
  const encodedQuery   = encodeURIComponent(query);
  const googleMapsUrl  = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  const appleMapsUrl   = `https://maps.apple.com/?q=${encodedQuery}`;
  const onDevice       = isIOS();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{ opacity: 0,  y: 20, scale: 0.95   }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      className="fixed bottom-24 left-4 right-4 z-[210] rounded-2xl overflow-hidden"
      style={{
        background:     'rgba(20,20,32,0.97)',
        border:         '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(32px)',
        boxShadow:      '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(240,178,74,0.15)', border: '1px solid rgba(240,178,74,0.3)' }}
        >
          <MapPin size={16} style={{ color: '#f0b24a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Lieu non localisé sur la carte
          </p>
          <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
            «{placeName}» — ouvrir dans une application ?
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 tap"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-label="Fermer"
        >
          <X size={13} className="text-white/60" />
        </button>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        {onDevice ? (
          <button
            onClick={() => {
              haptic(8);
              window.open(appleMapsUrl, '_blank', 'noopener,noreferrer');
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl tap"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border:     '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <ExternalLink size={14} className="text-white/70" />
            <span className="text-sm font-semibold text-white/80">Plans</span>
          </button>
        ) : (
          <button
            onClick={() => {
              haptic(8);
              window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl tap"
            style={{
              background: 'rgba(66,133,244,0.12)',
              border:     '1px solid rgba(66,133,244,0.3)',
            }}
          >
            <ExternalLink size={14} style={{ color: '#4285F4' }} />
            <span className="text-sm font-semibold" style={{ color: '#4285F4' }}>
              Google Maps
            </span>
          </button>
        )}

        {onDevice && (
          <button
            onClick={() => {
              haptic(8);
              window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl tap"
            style={{
              background: 'rgba(66,133,244,0.1)',
              border:     '1px solid rgba(66,133,244,0.25)',
            }}
          >
            <ExternalLink size={13} style={{ color: '#4285F4' }} />
            <span className="text-xs font-semibold" style={{ color: '#4285F4' }}>
              Google
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL CARTE LEAFLET
// ─────────────────────────────────────────────────────────────────────────────
const PlaceMapModal = ({
  place,
  userPos,
  onClose,
}: {
  place:   PlaceInfo;
  userPos: { lat: number; lon: number } | null;
  onClose: () => void;
}) => {
  const distance = userPos
    ? haversineKm(userPos.lat, userPos.lon, place.lat, place.lon)
    : null;

  const placeIcon = createPlaceIcon();
  const userIcon  = createUserIcon();

  const centerLat = userPos ? (userPos.lat + place.lat) / 2 : place.lat;
  const centerLon = userPos ? (userPos.lon + place.lon) / 2 : place.lon;
  const zoom      = userPos && distance !== null && distance < 2 ? 15 : 14;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.query}`;
  const appleMapsUrl  = `https://maps.apple.com/?q=${place.query}&ll=${place.lat},${place.lon}`;
  const onDevice      = isIOS();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0,      opacity: 1 }}
        exit={{ y: '100%',    opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="w-full max-w-lg overflow-hidden"
        style={{
          borderRadius:   '28px 28px 0 0',
          background:     'rgba(12,12,20,0.97)',
          border:         '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
          boxShadow:      '0 -24px 80px rgba(0,0,0,0.6)',
          maxHeight:      '88vh',
          overflowY:      'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes pulse-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0;   }
          }
          .leaflet-tile { filter: brightness(0.85) saturate(0.9); }
          .leaflet-control-zoom { display: none !important; }
          .leaflet-attribution-flag { display: none !important; }
          .leaflet-control-attribution {
            background: rgba(0,0,0,0.5) !important;
            color: rgba(255,255,255,0.3) !important;
            font-size: 8px !important;
            backdrop-filter: blur(8px);
            border-radius: 8px 0 0 0 !important;
          }
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip { display: none !important; }
        `}</style>

        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />
        </div>

        <div className="px-5 pt-2 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
                style={{
                  background: 'linear-gradient(135deg,rgba(124,140,255,0.2),rgba(236,72,153,0.2))',
                  border:     '1px solid rgba(124,140,255,0.3)',
                }}
              >
                <MapPin size={11} style={{ color: '#a5b4fc' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#a5b4fc' }}
                >
                  Lieu suggéré par ARIA
                </span>
              </div>

              <h2 className="font-bold tracking-tight leading-tight text-xl text-white">
                {place.name}
              </h2>

              {place.address && (
                <p className="text-sm text-white/50 mt-1 leading-relaxed">
                  {place.address}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 tap"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border:     '1px solid rgba(255,255,255,0.12)',
              }}
              aria-label="Fermer"
            >
              <X size={16} className="text-white/70" />
            </button>
          </div>

          {distance !== null && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3 mt-3 flex-wrap"
            >
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(86,197,164,0.12)',
                  border:     '1px solid rgba(86,197,164,0.25)',
                }}
              >
                <Navigation size={11} style={{ color: '#56c5a4' }} />
                <span className="text-xs font-semibold" style={{ color: '#56c5a4' }}>
                  {formatDistance(distance)} de vous
                </span>
              </div>

              {distance < 5 && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border:     '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-xs">🚶</span>
                  <span className="text-xs text-white/60">
                    ~{walkMinutes(distance)} min
                  </span>
                </div>
              )}

              {distance >= 2 && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border:     '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-xs">🚇</span>
                  <span className="text-xs text-white/60">
                    ~{metroMinutes(distance)} min
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div
          className="relative overflow-hidden"
          style={{
            height:       '280px',
            margin:       '0 16px',
            borderRadius: '20px',
            border:       '1px solid rgba(255,255,255,0.1)',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={zoom}
            style={{ width: '100%', height: '100%', background: '#0a0a12' }}
            zoomControl={false}
            attributionControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='© <a href="https://carto.com">CARTO</a>'
              maxZoom={19}
            />

            <FlyToPlace lat={place.lat} lon={place.lon} />

            <Marker position={[place.lat, place.lon]} icon={placeIcon}>
              <Popup closeButton={false}>
                <div
                  style={{
                    background:     'rgba(14,14,22,0.97)',
                    border:         '1px solid rgba(124,140,255,0.3)',
                    borderRadius:   12,
                    padding:        '8px 12px',
                    color:          'white',
                    fontSize:       12,
                    fontWeight:     600,
                    backdropFilter: 'blur(20px)',
                    minWidth:       120,
                    textAlign:      'center',
                  }}
                >
                  {place.name}
                </div>
              </Popup>
            </Marker>

            {userPos && (
              <Marker position={[userPos.lat, userPos.lon]} icon={userIcon}>
                <Popup closeButton={false}>
                  <div
                    style={{
                      background:     'rgba(14,14,22,0.97)',
                      border:         '1px solid rgba(86,197,164,0.3)',
                      borderRadius:   12,
                      padding:        '8px 12px',
                      color:          '#56c5a4',
                      fontSize:       12,
                      fontWeight:     600,
                      backdropFilter: 'blur(20px)',
                      textAlign:      'center',
                    }}
                  >
                    📍 Vous êtes ici
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(12,12,20,0.6), transparent)',
            }}
          />
        </div>

        <div className="px-5 pt-4 pb-6">
          <p className="text-[11px] text-white/30 text-center mb-3">
            Ouvrir dans une application externe
          </p>
          <div className="grid grid-cols-2 gap-2">
            {onDevice ? (
              <>
                <button
                  onClick={() => {
                    haptic(8);
                    window.open(appleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl tap"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border:     '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <ExternalLink size={14} className="text-white/70" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white/80">Plans</div>
                    <div className="text-[9px] text-white/30">Apple Maps</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    haptic(8);
                    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl tap"
                  style={{
                    background: 'rgba(66,133,244,0.1)',
                    border:     '1px solid rgba(66,133,244,0.25)',
                  }}
                >
                  <ExternalLink size={14} style={{ color: '#4285F4' }} />
                  <div className="text-left">
                    <div className="text-xs font-bold" style={{ color: '#4285F4' }}>
                      Google Maps
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    haptic(8);
                    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl tap"
                  style={{
                    background: 'rgba(66,133,244,0.1)',
                    border:     '1px solid rgba(66,133,244,0.25)',
                  }}
                >
                  <ExternalLink size={14} style={{ color: '#4285F4' }} />
                  <div className="text-left">
                    <div className="text-xs font-bold" style={{ color: '#4285F4' }}>
                      Google Maps
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    haptic(8);
                    window.open(appleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl tap"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <ExternalLink size={14} className="text-white/60" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white/80">Plans (iOS)</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHIPS CONTEXTUELS
// ─────────────────────────────────────────────────────────────────────────────
const buildChips = (
  destination: string,
  isRoadtrip:  boolean,
  status:      'upcoming' | 'ongoing' | 'finished',
  daysUntil:   number,
): Chip[] => {
  if (status === 'ongoing') {
    return [
      { emoji: '🌅', label: "Aujourd'hui", question: `Que faire aujourd'hui à ${destination} ? 3 idées avec adresses exactes. Format 📍 **Nom** · Adresse complète · Prix.` },
      { emoji: '🍽️', label: 'Déjeuner',   question: `Où déjeuner à ${destination} ? 3 restaurants avec adresses et prix. Format 📍 **Nom** · Adresse · Prix.` },
      { emoji: '🌙', label: 'Ce soir',     question: `Que faire ce soir à ${destination} ? Bars et restos avec adresses. Format 📍 **Nom** · Adresse · Prix.` },
      { emoji: '🚕', label: 'Transport',   question: `Comment se déplacer à ${destination} ? Apps, métro, taxi avec détails pratiques.` },
      { emoji: '🆘', label: 'Urgence',     question: `Numéros d'urgence et pharmacies à ${destination} avec adresses. Format 📍 **Nom** · Adresse.` },
      { emoji: '💱', label: 'Argent',      question: `Où retirer de l'argent à ${destination} ? Format 📍 **Nom** · Adresse.` },
    ];
  }
  if (status === 'upcoming' && daysUntil <= 3) {
    return [
      { emoji: '⚡', label: 'Urgent',     question: `J'arrive dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''} à ${destination}. Que préparer absolument ?` },
      { emoji: '📦', label: 'Bagages',    question: `Ce qu'on oublie souvent pour ${destination} ?` },
      { emoji: '💊', label: 'Santé',      question: `Médicaments et précautions santé pour ${destination}.` },
      { emoji: '💱', label: 'Devises',    question: `Quelle devise à ${destination} ? Changer avant ou sur place ?` },
      { emoji: '📱', label: 'Applis',     question: `Applications à télécharger avant d'arriver à ${destination}.` },
      { emoji: '🔌', label: 'Adaptateur', question: `Type de prise électrique à ${destination} ?` },
    ];
  }
  const base: Chip[] = [
    { emoji: '🍽️', label: 'Restos',    question: `Les 4 meilleurs restaurants à ${destination} avec adresses et prix. Format 📍 **Nom** · Adresse · Prix.` },
    { emoji: '🏛️', label: 'Sites',     question: `Les 4 sites incontournables à ${destination} avec adresses. Format 📍 **Nom** · Adresse.` },
    { emoji: '🚇', label: 'Transport', question: `Comment se déplacer à ${destination} ? Métro, bus, apps avec tarifs.` },
    { emoji: '💰', label: 'Budget',    question: `Prix réels à ${destination} : repas, transport, entrées, hébergement.` },
  ];
  if (isRoadtrip) {
    base.push({ emoji: '🗺️', label: 'Itinéraire', question: `Meilleur ordre pour mon roadtrip en ${destination}.` });
  } else {
    base.push({ emoji: '🏨', label: 'Quartiers', question: `Meilleurs quartiers pour loger à ${destination} selon mon budget.` });
  }
  base.push(
    { emoji: '⚠️', label: 'Erreurs', question: `5 erreurs classiques des touristes à ${destination}.` },
    { emoji: '🌤️', label: 'Météo',   question: `Météo à ${destination} et comment s'habiller.` },
  );
  return base;
};

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK OFFLINE
// ─────────────────────────────────────────────────────────────────────────────
const buildOfflineFallback = (question: string, destination: string): string => {
  const q = question.toLowerCase();
  if (q.includes('resto') || q.includes('manger') || q.includes('restaurant')) {
    return `📵 **ARIA est hors ligne**\n\nJe ne peux pas récupérer d’adresses précises pour ${destination} pour le moment.\n\nEn attendant, ouvre Google Maps et cherche **restaurants près de moi**. Je pourrai affiner les quartiers, prix et adresses dès que la connexion revient.`;
  }
  if (q.includes('transport') || q.includes('métro') || q.includes('bus')) {
    return `📵 **ARIA est hors ligne**\n\nJe ne peux pas vérifier les transports en temps réel pour ${destination}.\n\nGarde une app de carte hors-ligne sous la main, puis reconnecte-toi pour que je t’aide avec les trajets, tickets et options locales.`;
  }
  return `📵 **ARIA est hors ligne**\n\nJe garde le fil de ton voyage à ${destination}, mais j’ai besoin d’une connexion pour te répondre avec des informations précises.\n\nRéessaie dans un instant : je pourrai reprendre à partir de ta dernière question.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSE MESSAGE — Markdown + spans cliquables
// ─────────────────────────────────────────────────────────────────────────────
const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const parseMessageContent = (text: string): string => {
  const lines = text.split('\n');

  const parsedLines = lines.map((line) => {
    let result = escapeHtml(line);

    result = result.replace(
      /📍\s*(?:\*\*(.*?)\*\*|([^·,\-—–]+))\s*(?:[·,\-—–]\s*)?(.*?)$/g,
      (_: string, boldName: string | undefined, plainName: string | undefined, rest: string) => {
        const cleanName    = (boldName || plainName || '').trim();
        const cleanAddress = rest.trim();
        if (!cleanName) return _;

        return (
          `<span ` +
          `class="aria-place" ` +
          `data-name="${cleanName}" ` +
          `data-address="${cleanAddress}" ` +
          `style="` +
          `display:inline-flex;align-items:center;gap:4px;cursor:pointer;` +
          `background:linear-gradient(135deg,rgba(124,140,255,0.15),rgba(236,72,153,0.1));` +
          `border:1px solid rgba(124,140,255,0.35);` +
          `border-radius:20px;padding:3px 10px 3px 6px;` +
          `margin:1px 0;` +
          `transition:all 0.15s ease;` +
          `">` +
          `<span style="font-size:13px">📍</span>` +
          `<span style="color:#a5b4fc;font-weight:700;font-size:0.88em;">${cleanName}</span>` +
          `</span>` +
          (cleanAddress
            ? ` <span style="color:rgba(255,255,255,0.38);font-size:0.82em;">${cleanAddress}</span>`
            : '')
        );
      },
    );

    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return result;
  });

  return parsedLines.join('<br/>');
};

// ─────────────────────────────────────────────────────────────────────────────
// BULLE MESSAGE
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble = ({
  message,
  index,
  onPlaceClick,
}: {
  message:      ChatMessage;
  index:        number;
  onPlaceClick: (name: string, address: string) => void;
}) => {
  const isUser = message.role === 'user';

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const placeEl = (e.target as HTMLElement).closest('.aria-place') as HTMLElement | null;
      if (!placeEl) return;

      e.preventDefault();
      e.stopPropagation();
      haptic([5, 30, 5]);

      const name    = placeEl.getAttribute('data-name')    ?? '';
      const address = placeEl.getAttribute('data-address') ?? '';
      onPlaceClick(name, address);
    },
    [onPlaceClick],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{
        type:      'spring',
        damping:   24,
        stiffness: 280,
        delay:     index < 3 ? index * 0.05 : 0,
      }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div
          className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 mr-2 mt-auto"
          style={{
            background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            boxShadow:  '0 4px 16px rgba(124,140,255,0.3)',
          }}
        >
          <Sparkles size={14} className="text-white" />
        </div>
      )}

      <div
        className="max-w-[80%] rounded-3xl px-4 py-3"
        style={
          isUser
            ? {
                background:              'rgba(124,140,255,0.2)',
                border:                  '1px solid rgba(124,140,255,0.3)',
                borderBottomRightRadius: 8,
              }
            : {
                background:             'rgba(255,255,255,0.06)',
                border:                 '1px solid rgba(255,255,255,0.1)',
                borderBottomLeftRadius: 8,
              }
        }
      >
        <div
          className="text-sm leading-relaxed"
          style={{
            color:  isUser ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
            cursor: 'default',
          }}
          dangerouslySetInnerHTML={{ __html: parseMessageContent(message.content) }}
          onClick={handleContentClick}
        />
        <div className="text-[10px] text-white/25 mt-1.5 text-right">
          {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
            hour:   '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0,   y: 8 }}
    className="flex items-end gap-2 mb-3"
  >
    <div
      className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
        boxShadow:  '0 4px 16px rgba(124,140,255,0.3)',
      }}
    >
      <Sparkles size={14} className="text-white" />
    </div>
    <div
      className="rounded-3xl px-5 py-3 flex items-center gap-1.5"
      style={{
        background:             'rgba(255,255,255,0.06)',
        border:                 '1px solid rgba(255,255,255,0.1)',
        borderBottomLeftRadius: 8,
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: '#7c8cff' }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.8,
            repeat:   Infinity,
            delay:    i * 0.15,
            ease:     'easeInOut',
          }}
        />
      ))}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING LOADER
// ─────────────────────────────────────────────────────────────────────────────
const GeocodingLoader = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0,   scale: 0.9 }}
    className="fixed inset-0 z-[190] flex items-center justify-center"
    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
  >
    <div
      className="flex flex-col items-center gap-3 px-8 py-6 rounded-3xl"
      style={{
        background:     'rgba(14,14,22,0.95)',
        border:         '1px solid rgba(124,140,255,0.3)',
        backdropFilter: 'blur(40px)',
        boxShadow:      '0 24px 60px rgba(0,0,0,0.5)',
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, #7c8cff, #ec4899, #7c8cff)',
          mask:       'radial-gradient(farthest-side, transparent 60%, black 61%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent 60%, black 61%)',
        }}
      />
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Localisation en cours</p>
        <p className="text-xs text-white/40 mt-0.5">Recherche du lieu sur la carte…</p>
      </div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TRIPCHAT — COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const TripChat = () => {
  const { id }   = useParams<{ id: string }>();
  const trip     = useTrip(id);
  const navigate = useNavigate();

  const chatHistoryRaw   = useTripStore((s) => s.chatHistories[id ?? '']);
  const addChatMessage   = useTripStore((s) => s.addChatMessage);
  const clearChatHistory = useTripStore((s) => s.clearChatHistory);

  const chatHistory: ChatMessage[] = chatHistoryRaw ?? [];

  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [hasError,      setHasError]      = useState(false);
  const [chipsOpen,     setChipsOpen]     = useState(chatHistory.length === 0);
  const [clearConfirm,  setClearConfirm]  = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [failToast,     setFailToast]     = useState<{ name: string; query: string } | null>(null);
  const [userPos,       setUserPos]       = useState<{ lat: number; lon: number } | null>(null);
  const [geocoding,     setGeocoding]     = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const destination = trip
    ? (trip.isRoadtrip ? trip.country : trip.destination)
    : '';

  const status = trip
    ? tripStatus(trip.startDate, trip.endDate)
    : 'upcoming';

  const daysUntil = trip
    ? (() => {
        const now   = new Date(); now.setHours(0, 0, 0, 0);
        const start = new Date(trip.startDate); start.setHours(0, 0, 0, 0);
        return Math.round((start.getTime() - now.getTime()) / 86400000);
      })()
    : 0;

  const requestUserPosition = useCallback(() => {
    if (userPos || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { /* permission refusée → pas de distance */ },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, [userPos]);

  const handlePlaceClick = useCallback(
    async (name: string, address: string) => {
      setFailToast(null);
      setGeocoding(true);
      requestUserPosition();
      haptic([5, 30, 5]);

      try {
        const query  = address.length > 0 ? `${name} ${address}` : name;
        const coords = await geocodePlace(query);

        if (coords) {
          setSelectedPlace({
            name,
            address,
            lat:   coords.lat,
            lon:   coords.lon,
            query: encodeURIComponent(query),
          });
        } else {
          haptic([10, 30, 10]);
          setFailToast({ name, query });
        }
      } finally {
        setGeocoding(false);
      }
    },
    [requestUserPosition],
  );

  useEffect(() => {
    if (!trip) return;
    if (chatHistory.length > 0) return;
    if (welcomeSentForTrips.has(trip.id)) return;

    welcomeSentForTrips.add(trip.id);

    const days = daysBetween(trip.startDate, trip.endDate);
    let welcome: string;

    if (status === 'ongoing') {
      const elapsed  = daysBetween(trip.startDate, new Date().toISOString().slice(0, 10));
      const dayIndex = Math.min(elapsed, days);
      welcome = trip.isRoadtrip
        ? `Bonjour ! Je suis **ARIA**, votre guide pour votre roadtrip en **${trip.country}** ✈️\n\nVous êtes au **jour ${dayIndex}/${days}** de votre aventure !\n\nItinéraire : ${trip.destinations?.map((d) => d.city).join(' → ') ?? ''}\n\nQue puis-je faire pour vous maintenant ?`
        : `Bonjour ! Je suis **ARIA**, votre guide pour **${trip.destination}** 🌍\n\nVous êtes au **jour ${dayIndex}/${days}** de votre séjour !\n\nJe peux vous donner des adresses de restaurants, des activités pour aujourd'hui. Les lieux suggérés sont cliquables pour les voir sur la carte 🗺️`;
    } else if (status === 'upcoming' && daysUntil <= 3) {
      welcome = trip.isRoadtrip
        ? `Bonjour ! Je suis **ARIA** ✈️\n\nVotre roadtrip en **${trip.country}** démarre dans **${daysUntil} jour${daysUntil > 1 ? 's' : ''}** — très bientôt !\n\nBudget : **${trip.budget} ${trip.currency}** · **${days} jours**\n\nDernière ligne droite, tout est prêt ?`
        : `Bonjour ! Je suis **ARIA** ✈️\n\nVotre voyage à **${trip.destination}** démarre dans **${daysUntil} jour${daysUntil > 1 ? 's' : ''}** — très bientôt !\n\nBudget : **${trip.budget} ${trip.currency}** · **${days} jours**\n\nDes questions de dernière minute ?`;
    } else {
      welcome = trip.isRoadtrip
        ? `Bonjour ! Je suis **ARIA**, votre guide pour votre roadtrip en **${trip.country}** ✈️\n\nItinéraire : ${trip.destinations?.map((d) => d.city).join(' → ') ?? ''}.\n\nBudget : **${trip.budget} ${trip.currency}** pour **${days} jours**.\n\nJe vous donne des adresses précises — cliquez sur 📍 un lieu pour le voir sur la carte !`
        : `Bonjour ! Je suis **ARIA**, votre guide pour **${trip.destination}**, ${trip.country} 🌍\n\nVoyage du ${new Date(trip.startDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — budget **${trip.budget} ${trip.currency}** pour **${days} jours**.\n\nJe vous donne des adresses exactes de restaurants et spots. Cliquez sur 📍 n'importe quel lieu pour l'afficher sur la carte avec votre position !`;
    }

    addChatMessage(trip.id, { role: 'assistant', content: welcome });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length, loading]);

  const sendMessage = useCallback(
    async (text: string, options: { appendUserMessage?: boolean } = {}) => {
      if (!trip || !text.trim() || loading) return;

      const appendUserMessage = options.appendUserMessage ?? true;
      const userText = text.trim();
      setInput('');
      setHasError(false);
      setChipsOpen(false);
      setFailToast(null);
      haptic([5, 20, 5]);

      if (appendUserMessage) {
        addChatMessage(trip.id, { role: 'user', content: userText });
      }
      setLoading(true);

      try {
        const days = daysBetween(trip.startDate, trip.endDate);

        const historyForApi = chatHistory.slice(-8).map((m) => ({
          role:    m.role,
          content: m.content,
        }));

        const payload: ChatPayload = {
          question:     userText,
          destination:  trip.isRoadtrip ? trip.country : trip.destination,
          country:      trip.country,
          days,
          budget:       trip.budget,
          currency:     trip.currency,
          isRoadtrip:   trip.isRoadtrip ?? false,
          destinations: trip.destinations?.map((d) => ({
            city:        d.city,
            countryCode: d.countryCode,
          })) ?? [],
          history: historyForApi,
        };

        const result = await fetchChat(payload, trip.id);

        if (result.ok && result.answer) {
          addChatMessage(trip.id, { role: 'assistant', content: result.answer });
        } else {
          const offlineReply = buildOfflineFallback(
            userText,
            trip.isRoadtrip ? trip.country : trip.destination,
          );
          setHasError(true);
          addChatMessage(trip.id, { role: 'assistant', content: offlineReply });
        }
      } catch {
        setHasError(true);
        addChatMessage(trip.id, {
          role:    'assistant',
          content: `Désolé, je n'ai pas pu traiter votre question. Vérifiez votre connexion et réessayez.`,
        });
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [trip, loading, chatHistory, addChatMessage],
  );

  const retryLastMessage = useCallback(() => {
    const last = [...chatHistory].reverse().find((m) => m.role === 'user');
    if (!last) return;
    sendMessage(last.content, { appendUserMessage: false });
  }, [chatHistory, sendMessage]);

  const handleChipClick = (chip: Chip) => { sendMessage(chip.question); };

  const handleClear = () => {
    haptic([5, 20, 5]);
    setClearConfirm(false);
    if (trip) {
      welcomeSentForTrips.delete(trip.id);
      clearChatHistory(trip.id);
      clearChatCache(trip.id);
      setChipsOpen(true);
      setHasError(false);
      setFailToast(null);
      setSelectedPlace(null);
    }
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/55">
          <p>Voyage introuvable.</p>
          <button onClick={() => navigate('/')} className="mt-4 underline">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const chips = buildChips(destination, trip.isRoadtrip ?? false, status, daysUntil);

  return (
    <div className="fixed inset-0 z-20 flex flex-col" style={{ background: '#07070b' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora opacity-20" />
      </div>

      <AnimatePresence>
        {geocoding && <GeocodingLoader key="geocoding-loader" />}
      </AnimatePresence>

      <AnimatePresence>
        {failToast && !geocoding && (
          <GeocodingFailToast
            key="fail-toast"
            placeName={failToast.name}
            query={failToast.query}
            onClose={() => setFailToast(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlace && (
          <PlaceMapModal
            key="place-map-modal"
            place={selectedPlace}
            userPos={userPos}
            onClose={() => setSelectedPlace(null)}
          />
        )}
      </AnimatePresence>

      <header
        className="relative z-10 flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          paddingTop:     'max(12px, env(safe-area-inset-top, 12px))',
          background:     'rgba(7,7,11,0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom:   '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => navigate(`/trip/${trip.id}/overview`)}
          className="w-9 h-9 rounded-full glass flex items-center justify-center tap flex-shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>

        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)',
            boxShadow:  '0 4px 16px rgba(124,140,255,0.35)',
          }}
        >
          <Sparkles size={16} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold tracking-tight text-sm truncate">
            ARIA - Guide
          </div>
          <div className="text-[11px] text-white/40 flex items-center gap-1.5 flex-wrap">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#56c5a4' }}
            />
            <span>Live</span>
            {userPos && (
              <>
                <span className="text-white/20">·</span>
                <Locate size={9} style={{ color: '#56c5a4' }} />
                <span style={{ color: '#56c5a4' }}>GPS actif</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg,rgba(124,140,255,0.15),rgba(236,72,153,0.1))',
              border:     '1px solid rgba(124,140,255,0.25)',
            }}
          >
            <MapPin size={10} style={{ color: '#a5b4fc' }} />
            <span className="text-[10px] font-bold" style={{ color: '#a5b4fc' }}>
              Carte
            </span>
          </div>

          <button
            onClick={() => setChipsOpen(!chipsOpen)}
            className="w-9 h-9 rounded-full glass flex items-center justify-center tap"
            aria-label="Questions suggérées"
          >
            <span className="text-sm">💡</span>
          </button>

          <button
            onClick={() => {
              haptic(4);
              setClearConfirm(true);
            }}
            className="w-9 h-9 rounded-full glass flex items-center justify-center tap"
            aria-label="Effacer la conversation"
          >
            <Trash2 size={15} className="text-white/50" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {clearConfirm && (
          <motion.div
            className="fixed inset-0 z-[220] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setClearConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
              style={{
                background: 'rgba(14,14,22,0.98)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div className="px-5 pb-6 pt-2">
                <div className="flex items-start gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.13)', border: '1px solid rgba(239,68,68,0.24)' }}
                  >
                    <Trash2 size={17} style={{ color: '#ef4444' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold tracking-tight text-white/92">Effacer la conversation ?</div>
                    <div className="text-sm text-white/55 leading-relaxed mt-1">
                      L’historique ARIA de ce voyage sera supprimé de cet appareil.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="h-12 rounded-2xl font-semibold text-sm tap"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleClear}
                    className="h-12 rounded-2xl font-semibold text-sm tap"
                    style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' }}
                  >
                    Effacer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chipsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0,   opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative z-10 flex-shrink-0 overflow-hidden"
            style={{
              background:   'rgba(7,7,11,0.7)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-4 py-3">
              <div className="text-[11px] text-white/35 mb-2 uppercase tracking-wider">
                {status === 'ongoing'
                  ? '📍 En voyage — questions du moment'
                  : status === 'upcoming' && daysUntil <= 3
                    ? '⚡ Dernière minute'
                    : 'Questions suggérées'}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleChipClick(chip)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full tap transition"
                    style={{
                      background:
                        status === 'ongoing'
                          ? 'rgba(86,197,164,0.1)'
                          : status === 'upcoming' && daysUntil <= 3
                            ? 'rgba(240,178,74,0.1)'
                            : 'rgba(124,140,255,0.1)',
                      border:
                        status === 'ongoing'
                          ? '1px solid rgba(86,197,164,0.25)'
                          : status === 'upcoming' && daysUntil <= 3
                            ? '1px solid rgba(240,178,74,0.25)'
                            : '1px solid rgba(124,140,255,0.2)',
                      color:
                        status === 'ongoing'
                          ? '#56c5a4'
                          : status === 'upcoming' && daysUntil <= 3
                            ? '#f0b24a'
                            : '#a5b4fc',
                      fontSize:   '12px',
                      fontWeight: 600,
                    }}
                  >
                    <span>{chip.emoji}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto relative z-10 px-4 py-4">
        {chatHistory.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            index={i}
            onPlaceClick={handlePlaceClick}
          />
        ))}

        <AnimatePresence>
          {loading && <TypingIndicator key="typing" />}
        </AnimatePresence>

        {hasError && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-3 mx-auto max-w-xs"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border:     '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <WifiOff size={14} style={{ color: '#ef4444' }} />
            <span className="text-xs text-red-400">Connexion requise</span>
            <button
              onClick={retryLastMessage}
              className="ml-auto tap"
              style={{ color: '#ef4444' }}
            >
              <RotateCcw size={12} />
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        className="relative z-40 flex-shrink-0 px-4 pt-3"
        style={{
          paddingBottom:  'calc(env(safe-area-inset-bottom, 12px) + 112px)',
          background:     'linear-gradient(180deg, rgba(7,7,11,0.82), rgba(7,7,11,0.96))',
          backdropFilter: 'blur(24px)',
          borderTop:      '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border:     '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={
              status === 'ongoing'
                ? `Que faire aujourd'hui à ${destination} ?`
                : `Posez une question sur ${destination}...`
            }
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent outline-none resize-none text-sm font-medium placeholder-white/25"
            style={{
              minHeight:  24,
              maxHeight:  120,
              lineHeight: '24px',
              paddingTop: 0,
              paddingBottom: 0,
              color:      'rgba(255,255,255,0.9)',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            disabled={!input.trim() || loading}
            onClick={() => sendMessage(input)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all tap"
            style={{
              background:
                input.trim() && !loading
                  ? 'linear-gradient(135deg, #7c8cff 0%, #ec4899 100%)'
                  : 'rgba(255,255,255,0.08)',
              boxShadow:
                input.trim() && !loading
                  ? '0 4px 16px rgba(124,140,255,0.4)'
                  : 'none',
            }}
            aria-label="Envoyer"
          >
            <Send
              size={15}
              style={{
                color:
                  input.trim() && !loading ? 'white' : 'rgba(255,255,255,0.25)',
              }}
            />
          </motion.button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-[10px] text-white/20">
            ARIA Live ·{' '}
          </p>
          <div className="flex items-center gap-1">
            <MapPin size={9} style={{ color: 'rgba(165,180,252,0.4)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(165,180,252,0.4)' }}>
              Lieux cliquables → carte intégrée
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};