// src/features/world/Map2DView.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Carte 2D Leaflet — Tuiles naturelles + pays colorés + trajets + popups glass
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import type { StyleFunction } from 'leaflet';
import { Navigation, Calendar } from 'lucide-react';
import { type Trip } from '../../store/tripStore';
import { Flag } from '../../shared/Flag';
import { fmtRange, tripStatus, dayCounter } from '../../utils/dateHelpers';
import { haversineKm } from '../../utils/geo';
import {
  COLOR,
  estimateFlightTime,
  computeCountrySets,
  getGeoFeatureCountryCode,
  getTripCoords,
  isUsableCoord,
} from './worldHelpers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Recentrage carte ───────────────────────────────────────────────────────

const RecenterMap = ({ lat, lon, zoom = 5 }: { lat: number; lon: number; zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true });
  }, [lat, lon, zoom, map]);
  return null;
};

const MapZoomWatcher = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

const FitTripBounds = ({
  homeLat,
  homeLon,
  destLat,
  destLon,
}: {
  homeLat: number;
  homeLon: number;
  destLat: number;
  destLon: number;
}) => {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([
      [homeLat, homeLon],
      [destLat, destLon],
    ]);

    map.fitBounds(bounds, {
      animate: true,
      padding: [54, 54],
      maxZoom: 6,
    });
  }, [homeLat, homeLon, destLat, destLon, map]);

  return null;
};

// ─── Icône domicile 🏠 ──────────────────────────────────────────────────────

const homeIcon = L.divIcon({
  className: 'home-marker-icon',
  html: `<div style="
    width:34px;
    height:34px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:14px;
    background:rgba(14,14,20,0.88);
    border:1px solid rgba(240,178,74,0.42);
    box-shadow:0 10px 30px rgba(240,178,74,0.22), 0 6px 18px rgba(0,0,0,0.45);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    font-size:18px;
    line-height:1;
  ">🏠</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

// ─── Arc premium entre domicile et destination ─────────────────────────────

const createArcPositions = (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): [number, number][] => {
  const points: [number, number][] = [];
  const steps = 48;

  // Interpolation par le chemin longitude le plus court pour éviter les grands
  // retours visuels quand le trajet traverse l'antiméridien.
  let deltaLon = endLon - startLon;
  if (deltaLon > 180) deltaLon -= 360;
  if (deltaLon < -180) deltaLon += 360;

  const deltaLat = endLat - startLat;
  const len = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon) || 1;
  const normalLat = -deltaLon / len;
  const normalLon = deltaLat / len;
  const distance = haversineKm(startLat, startLon, endLat, endLon);

  // Règle UX validée :
  // - trajet proche (< 1500 km) : ligne droite / quasi droite
  // - trajet moyen (1500–4000 km) : arc léger
  // - long trajet (> 4000 km) : arc premium visible
  const curve =
    distance < 1500
      ? 0
      : distance < 4000
        ? Math.min(5, Math.max(1.4, distance / 900))
        : Math.min(16, Math.max(6, distance / 950));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave = Math.sin(Math.PI * t);
    const lat = startLat + deltaLat * t + normalLat * curve * wave;
    let lon = startLon + deltaLon * t + normalLon * curve * wave;

    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    points.push([lat, lon]);
  }

  return points;
};

// ─── Bulle distance (marker custom au milieu du trait) ─────────────────────

const countryFlagEmoji = (code: string): string => {
  const cc = code.toUpperCase();
  const A = 0x1f1e6;
  try {
    return String.fromCodePoint(A + cc.charCodeAt(0) - 65) +
      String.fromCodePoint(A + cc.charCodeAt(1) - 65);
  } catch {
    return '🌍';
  }
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');


const makeDistanceIcon = (trip: Trip, distanceKm: number, flightTime: string, zoom: number) => {
  const title = trip.isRoadtrip ? trip.country : trip.destination;
  const flag = countryFlagEmoji(trip.countryCode);
  const scale = zoom <= 3 ? 0.74 : zoom <= 4 ? 0.86 : 1;
  const titleSize = Math.round(11 * scale);
  const kmSize = Math.round(16 * scale);
  const metaSize = Math.round(10 * scale);
  const padY = Math.round(8 * scale);
  const padX = Math.round(10 * scale);
  const radius = Math.round(16 * scale);
  const width = Math.round((distanceKm >= 10000 ? 132 : 118) * scale);
  const height = Math.round(66 * scale);

  return L.divIcon({
    className: 'distance-bubble-icon',
    html: `<div style="
      position:relative;
      width:${width}px;
      background:linear-gradient(180deg, rgba(16,16,24,0.94) 0%, rgba(8,8,13,0.90) 100%);
      backdrop-filter:blur(20px) saturate(165%);
      -webkit-backdrop-filter:blur(20px) saturate(165%);
      border:1px solid rgba(34,211,238,0.34);
      border-radius:${radius}px;
      padding:${padY}px ${padX}px;
      text-align:left;
      color:white;
      font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;
      box-shadow:0 14px 38px rgba(0,0,0,0.38), 0 0 26px rgba(34,211,238,0.12);
      white-space:nowrap;
      overflow:hidden;
      box-sizing:border-box;
    ">
      <div style="position:absolute;left:${padX}px;right:${padX}px;top:0;height:1px;background:linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent);"></div>
      <div style="font-size:${titleSize}px;font-weight:800;letter-spacing:-0.02em;color:rgba(255,255,255,0.95);line-height:1.05;overflow:hidden;text-overflow:ellipsis;">
        ${flag} ${title}
      </div>
      <div style="margin-top:${Math.max(4, Math.round(6 * scale))}px;font-size:${kmSize}px;font-weight:900;letter-spacing:-0.04em;color:#ffffff;line-height:1;">
        ${distanceKm.toLocaleString('fr-FR')} km
      </div>
      <div style="margin-top:${Math.max(4, Math.round(5 * scale))}px;font-size:${metaSize}px;font-weight:700;color:#67e8f9;line-height:1;">
        ✈️ ${flightTime}
      </div>
    </div>`,
    iconSize: [width, height],
    iconAnchor: [Math.round(width / 2), Math.round(height + 12 * scale)],
  });
};

// ─── Popup Glassmorphism ────────────────────────────────────────────────────

const TripPopup = ({ trip }: { trip: Trip }) => {
  const navigate = useNavigate();
  const status = tripStatus(trip.startDate, trip.endDate);
  const color = status === 'ongoing' ? COLOR.ongoing : status === 'upcoming' ? COLOR.upcoming : COLOR.finished;
  const statusLabel = status === 'ongoing' ? '● En cours' : status === 'upcoming' ? '○ À venir' : '✓ Terminé';
  const dest = trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination;

  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Flag code={trip.countryCode} size={20} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'white' }}>
          {dest}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Calendar size={10} />
        {fmtRange(trip.startDate, trip.endDate)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8 }}>
        {statusLabel} · {dayCounter(trip.startDate, trip.endDate)}
      </div>
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: 1,
        marginBottom: 8,
      }} />
      <button
        onClick={() => navigate(`/trip/${trip.id}/overview`)}
        style={{
          width: '100%',
          padding: '8px 0',
          borderRadius: 10,
          border: 'none',
          background: `linear-gradient(135deg, var(--accent-from), var(--accent-to))`,
          color: 'white',
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
          letterSpacing: '-0.01em',
        }}
      >
        Voir le voyage →
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT MAP2DVIEW
// ═══════════════════════════════════════════════════════════════════════════════

type Props = {
  trips: Trip[];
  geoData: GeoJsonObject | null;
  geoError: boolean;
  homeLat: number;
  homeLon: number;
  gpsPos: { lat: number; lon: number } | null;
  gpsLoading: boolean;
  onRequestGPS: () => void;
  centerOnGps: boolean;
  selectedTripId: string | null;
};

export const Map2DView = ({
  trips, geoData, geoError,
  homeLat, homeLon,
  gpsPos, gpsLoading, onRequestGPS, centerOnGps,
  selectedTripId,
}: Props) => {
  const [mapZoom, setMapZoom] = useState(3);
  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom((previous) => (previous === zoom ? previous : zoom));
  }, []);

  const { visited, ongoing } = useMemo(
    () => computeCountrySets(trips),
    [trips],
  );

  // ── Pays visité : style dynamique (couleurs thème) ────────────────────
  const countryStyle: StyleFunction = useCallback(
    (feature?: Feature<Geometry>) => {
      if (!feature) return {};
      const code = getGeoFeatureCountryCode(feature);

      if (ongoing.has(code)) {
        return {
          fillColor: COLOR.ongoing,
          fillOpacity: 0.35,
          color: COLOR.ongoing,
          weight: 1.5,
          dashArray: '4 2',
        };
      }
      // Les voyages à venir ne colorient pas les pays :
      // la carte représente ce qui est fait + ce qui est en cours.
      if (visited.has(code)) {
        return {
          fillColor: '#4f46e5',
          fillOpacity: 0.32,
          color: 'rgba(165,180,252,0.72)',
          weight: 1,
        };
      }
      return {
        fillColor: 'rgba(255,255,255,0.03)',
        fillOpacity: 0.03,
        color: 'rgba(255,255,255,0.06)',
        weight: 0.3,
      };
    },
    [ongoing, visited],
  );

  // ── Popup par pays ────────────────────────────────────────────────────
  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const props = feature.properties as Record<string, string> | null;
      const code = getGeoFeatureCountryCode(feature);
      const name = props?.ADMIN ?? props?.name ?? props?.NAME ?? props?.['ISO3166-1-Alpha-2'] ?? '';
      const related = trips.filter((t) => t.countryCode.toUpperCase() === code);

      if (related.length > 0) {
        const status = tripStatus(related[0].startDate, related[0].endDate);
        const color = status === 'ongoing' ? COLOR.ongoing : status === 'upcoming' ? COLOR.upcoming : COLOR.finished;
        const safeName = escapeHtml(name);
        const safeTripsHtml = related.map((trip) => {
          const safeTitle = escapeHtml(trip.isRoadtrip ? `${trip.country} · Roadtrip` : trip.destination);
          const safeDate = escapeHtml(fmtRange(trip.startDate, trip.endDate));
          return `
              <div style="font-weight:700;font-size:14px;letter-spacing:-0.02em;margin-bottom:2px;">${safeTitle}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:2px;">${safeDate}</div>
            `;
        }).join('');

        layer.bindPopup(`
          <div style="background:rgba(14,14,20,0.95);color:#fff;border-radius:14px;padding:12px 14px;min-width:160px;font-family:Inter,sans-serif;border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px);">
            <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:4px;">${safeName}</div>
            ${safeTripsHtml}
            <div style="font-size:10px;font-weight:700;color:${color};margin-top:4px;">${related.length} voyage${related.length > 1 ? 's' : ''}</div>
          </div>
        `);
      }
    },
    [trips],
  );

  // ── Voyages affichables : coords du trip, première étape roadtrip ou capitale ──
  const tripsWithCoords = useMemo(
    () => trips
      .map((trip) => {
        const coords = getTripCoords(trip);
        return coords ? { trip, ...coords } : null;
      })
      .filter((item): item is { trip: Trip; lat: number; lon: number; source: 'trip' | 'destination' | 'capital' } => item !== null),
    [trips],
  );

  const selectedTrip = useMemo(
    () => tripsWithCoords.find((item) => item.trip.id === selectedTripId) ?? null,
    [tripsWithCoords, selectedTripId],
  );

  // ── Trajets domicile → destination ────────────────────────────────────
  const tripLines = useMemo(() => {
    const accentFrom = getComputedStyle(document.documentElement).getPropertyValue('--accent-from').trim() || '#7c8cff';

    return tripsWithCoords.map((item) => {
      const { trip, lat, lon } = item;
      const status = tripStatus(trip.startDate, trip.endDate);
      const isSelected = trip.id === selectedTripId;
      const distance = haversineKm(homeLat, homeLon, lat, lon);
      const statusColor =
        status === 'ongoing'
          ? COLOR.ongoing
          : status === 'upcoming'
            ? accentFrom
            : 'rgba(255,255,255,0.55)';

      const positions = createArcPositions(homeLat, homeLon, lat, lon);
      const midPoint = positions[Math.floor(positions.length / 2)] ?? [
        (homeLat + lat) / 2,
        (homeLon + lon) / 2,
      ];

      return {
        trip,
        positions,
        color: isSelected ? '#22d3ee' : statusColor,
        opacity: isSelected ? 0.88 : status === 'finished' ? 0.16 : 0.28,
        weight: isSelected ? 3 : 1.4,
        dashArray: isSelected ? '8 6' : '3 8',
        distanceKm: Math.round(distance),
        flightTime: estimateFlightTime(distance),
        status,
        isSelected,
        midLat: midPoint[0],
        midLon: midPoint[1],
      };
    });
  }, [tripsWithCoords, homeLat, homeLon, selectedTripId]);

  // ── Centre de la carte ────────────────────────────────────────────────
  const mapCenter: [number, number] = useMemo(() => {
    if (selectedTrip && isUsableCoord(selectedTrip.lat, selectedTrip.lon)) return [selectedTrip.lat, selectedTrip.lon];
    const ongoingTrip = tripsWithCoords.find((item) => tripStatus(item.trip.startDate, item.trip.endDate) === 'ongoing');
    if (ongoingTrip) return [ongoingTrip.lat, ongoingTrip.lon];
    if (tripsWithCoords.length > 0) return [tripsWithCoords[0].lat, tripsWithCoords[0].lon];
    return [homeLat, homeLon];
  }, [selectedTrip, tripsWithCoords, homeLat, homeLon]);

  return (
    <div
      className="relative rounded-3xl overflow-hidden leaflet-dark-theme"
      style={{
        height: '55vh',
        minHeight: 380,
        border: `1px solid ${COLOR.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        minZoom={2}
        maxZoom={12}
      >
        <MapZoomWatcher onZoomChange={handleZoomChange} />
        {/* Tuiles CartoDB Voyager (naturel) + filtre sombre CSS */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          attribution=""
        />

        {/* GeoJSON : pays colorés */}
        {geoData && (
          <GeoJSON
            key={`${visited.size}-${ongoing.size}`}
            data={geoData}
            style={countryStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Cadrage trajet complet : domicile + destination sélectionnée */}
        {selectedTrip && isUsableCoord(selectedTrip.lat, selectedTrip.lon) && !centerOnGps && (
          <FitTripBounds
            homeLat={homeLat}
            homeLon={homeLon}
            destLat={selectedTrip.lat}
            destLon={selectedTrip.lon}
          />
        )}

        {/* Recentrage GPS */}
        {centerOnGps && gpsPos && <RecenterMap lat={gpsPos.lat} lon={gpsPos.lon} />}

        {/* Domicile 🏠 */}
        <Marker position={[homeLat, homeLon]} icon={homeIcon}>
          <Popup>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>🏠 Domicile</div>
          </Popup>
        </Marker>

        {/* Trajets pointillés domicile → destinations */}
        {tripLines.map(({ trip, positions, color, opacity, weight, dashArray, distanceKm, flightTime, isSelected, midLat, midLon }) => (
          <span key={`line-${trip.id}`}>
            {/* Ligne pointillée : focus fort sur le voyage sélectionné, discrète sinon */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight,
                opacity,
                dashArray,
              }}
            />
            {/* Une seule bulle distance : uniquement le voyage focus */}
            {isSelected && (
              <Marker
                position={[midLat, midLon]}
                icon={makeDistanceIcon(trip, distanceKm, flightTime, mapZoom)}
                interactive={false}
              />
            )}
          </span>
        ))}

        {/* Markers voyages */}
        {tripsWithCoords.map((item) => {
          const { trip, lat, lon } = item;
          const status = tripStatus(trip.startDate, trip.endDate);
          const color = status === 'ongoing'
            ? COLOR.ongoing
            : status === 'finished'
              ? '#4f46e5'
              : '#ec4899';
          const isOngoing = status === 'ongoing';
          const isSelected = trip.id === selectedTripId;

          return (
            <CircleMarker
              key={trip.id}
              center={[lat, lon]}
              radius={isSelected ? 10 : isOngoing ? 8 : 5.5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSelected ? 1 : status === 'upcoming' ? 0.45 : 0.82,
                weight: isSelected ? 4 : isOngoing ? 3 : 1.8,
                opacity: isSelected ? 1 : status === 'upcoming' ? 0.45 : 0.78,
                className: isSelected || isOngoing ? 'trip-marker-ongoing' : '',
              }}
            >
              <Popup>
                <TripPopup trip={trip} />
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Position GPS */}
        {gpsPos && (
          <CircleMarker
            center={[gpsPos.lat, gpsPos.lon]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ fontWeight: 700, color: 'white' }}>📍 Tu es ici</div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Erreur GeoJSON */}
      {geoError && (
        <div
          className="absolute bottom-16 left-4 right-4 text-center text-xs py-2 px-3 rounded-xl"
          style={{
            background: 'rgba(240,178,74,0.15)',
            border: '1px solid rgba(240,178,74,0.3)',
            color: '#f0b24a',
          }}
        >
          ⚠️ Coloration des pays indisponible (hors-ligne)
        </div>
      )}

      {/* Chargement GeoJSON */}
      {!geoData && !geoError && (
        <div
          className="absolute bottom-16 left-4 right-4 text-center text-xs py-2 px-3 rounded-xl"
          style={{ background: COLOR.glass, border: `1px solid ${COLOR.border}`, color: 'rgba(255,255,255,0.45)' }}
        >
          Chargement des pays visités…
        </div>
      )}

      {/* Bouton GPS */}
      <button
        onClick={onRequestGPS}
        disabled={gpsLoading}
        className="absolute bottom-4 right-4 z-[1000] w-11 h-11 rounded-2xl flex items-center justify-center tap"
        style={{
          background: 'rgba(14,14,20,0.92)',
          border: `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        aria-label="Ma position GPS"
      >
        {gpsLoading ? (
          <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Navigation size={16} style={{ color: gpsPos ? COLOR.ongoing : 'rgba(255,255,255,0.6)' }} />
        )}
      </button>

      {/* Légende */}
      <div
        className="absolute top-4 left-4 z-[1000] flex items-center gap-3 px-3 py-2 rounded-2xl text-[10px]"
        style={{
          background: 'rgba(14,14,20,0.88)',
          border: `1px solid ${COLOR.border}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        {[
          { emoji: '🏠', label: 'Maison' },
          { color: COLOR.ongoing, label: 'En cours' },
          { color: '#4f46e5', label: 'Terminé' },
          { color: '#ec4899', label: 'À venir' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-white/55">
            {item.emoji ? (
              <span>{item.emoji}</span>
            ) : (
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            )}
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-white/35">
          <div className="w-4 h-0 border-t border-dashed border-white/25" />
          Trajet
        </div>
      </div>
    </div>
  );
};
