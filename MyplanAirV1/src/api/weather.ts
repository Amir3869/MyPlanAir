// src/api/weather.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Open-Meteo — gratuit, sans clé API ✅
// V5 : fetchWeather (actuel) + fetchForecast (7 jours + périodes)
// V5.1 : geocodeCity() via Photon pour roadtrip villes réelles
// V5.2 : Cache 2 couches — RAM 2h + localStorage 48h (quasiment plus de spinner)
// ═══════════════════════════════════════════════════════════════════════════════

import { recordLocalUsage } from '../utils/usageTelemetry';

// ─── Types existants (météo actuelle) ───────────────────────────────────────

export type WeatherResult = {
  ok: true;
  temp: number;
  feelsLike: number;
  code: number;
  icon: string;
  label: string;
  wind: number;
  humidity: number;
} | {
  ok: false;
  reason: string;
};

// ─── Types V5 — Prévisions 7 jours ─────────────────────────────────────────

export type PeriodDetail = {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
};

export type DailyForecast = {
  date: string;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  pressure: number;
  sunrise: string;
  sunset: string;
  precipitation: number;
  morning: PeriodDetail;
  afternoon: PeriodDetail;
  night: PeriodDetail;
};

export type ForecastResult = {
  ok: true;
  days: DailyForecast[];
} | {
  ok: false;
  reason: string;
};

// ─── WMO Weather codes → emoji + label français ────────────────────────────

const WMO: Record<number, { icon: string; label: string }> = {
  0:  { icon: '☀️',  label: 'Ciel dégagé'         },
  1:  { icon: '🌤️', label: 'Peu nuageux'           },
  2:  { icon: '⛅',  label: 'Partiellement nuageux' },
  3:  { icon: '☁️',  label: 'Couvert'               },
  45: { icon: '🌫️', label: 'Brouillard'            },
  48: { icon: '🌫️', label: 'Brouillard givrant'    },
  51: { icon: '🌦️', label: 'Bruine légère'         },
  53: { icon: '🌦️', label: 'Bruine modérée'        },
  55: { icon: '🌧️', label: 'Bruine dense'          },
  56: { icon: '🌧️', label: 'Bruine verglaçante'    },
  57: { icon: '🌧️', label: 'Bruine verglaçante forte' },
  61: { icon: '🌧️', label: 'Pluie légère'          },
  63: { icon: '🌧️', label: 'Pluie modérée'         },
  65: { icon: '🌧️', label: 'Pluie forte'           },
  66: { icon: '🌧️', label: 'Pluie verglaçante'     },
  67: { icon: '🌧️', label: 'Pluie verglaçante forte' },
  71: { icon: '🌨️', label: 'Neige légère'          },
  73: { icon: '🌨️', label: 'Neige modérée'         },
  75: { icon: '❄️',  label: 'Neige forte'           },
  77: { icon: '🌨️', label: 'Grésil'                },
  80: { icon: '🌦️', label: 'Averses légères'       },
  81: { icon: '🌧️', label: 'Averses modérées'      },
  82: { icon: '⛈️',  label: 'Averses violentes'    },
  85: { icon: '🌨️', label: 'Averses de neige'      },
  86: { icon: '❄️',  label: 'Fortes averses de neige' },
  95: { icon: '⛈️',  label: 'Orage'                },
  96: { icon: '⛈️',  label: 'Orage avec grêle'     },
  99: { icon: '⛈️',  label: 'Orage violent'         },
};

/** Récupère l'emoji + label pour un code WMO */
export const getWeatherInfo = (code: number): { icon: string; label: string } =>
  WMO[code] ?? { icon: '🌡️', label: 'Météo' };

// ─── Nom du jour en français ────────────────────────────────────────────────

const getDayName = (dateStr: string, index: number): string => {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return 'Demain';
  try {
    const date = new Date(dateStr + 'T12:00:00');
    const name = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return dateStr;
  }
};

// ─── Calcul période horaire ─────────────────────────────────────────────────

const computePeriod = (
  codes: number[],
  temps: number[],
  hums: number[],
  winds: number[],
  dayIdx: number,
  startH: number,
  endH: number,
): PeriodDetail => {
  const base = dayIdx * 24;
  let tSum = 0, hSum = 0, wSum = 0, count = 0;
  const codeCounts: Record<number, number> = {};

  for (let h = startH; h <= endH; h++) {
    const i = base + h;
    if (i >= temps.length) break;
    tSum += temps[i];
    hSum += hums[i];
    wSum += winds[i];
    const c = codes[i] ?? 0;
    codeCounts[c] = (codeCounts[c] || 0) + 1;
    count++;
  }

  if (count === 0) return { temp: 0, humidity: 0, windSpeed: 0, weatherCode: 0 };

  let dominantCode = 0;
  let maxCnt = 0;
  for (const [code, cnt] of Object.entries(codeCounts)) {
    if (cnt > maxCnt) { maxCnt = cnt; dominantCode = Number(code); }
  }

  return {
    temp:      Math.round(tSum / count),
    humidity:  Math.round(hSum / count),
    windSpeed: Math.round(wSum / count),
    weatherCode: dominantCode,
  };
};

// ─── Heure sunrise/sunset → "HH:MM" ────────────────────────────────────────

const formatTime = (iso: string): string => {
  try {
    const parts = iso.split('T');
    if (parts.length < 2) return iso;
    const time = parts[1].split(':');
    return `${time[0]}:${time[1]}`;
  } catch {
    return iso;
  }
};

// ─── Niveau UV label ────────────────────────────────────────────────────────

export const uvLabel = (uv: number): string => {
  if (uv <= 2) return 'Faible';
  if (uv <= 5) return 'Modéré';
  if (uv <= 7) return 'Élevé';
  if (uv <= 10) return 'Très élevé';
  return 'Extrême';
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE — 2 couches : RAM (2h) + localStorage (48h)
// RAM = lecture instantanée, survit au changement de page dans la même session
// localStorage = survit au démontage du composant, pas de spinner au retour
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_RAM = 2 * 60 * 60 * 1000;   // 2 heures en mémoire
const CACHE_TTL_LS  = 48 * 60 * 60 * 1000;  // 48 heures en localStorage
const WEATHER_FETCH_TIMEOUT_MS = 8000;      // Timeout réseau Open-Meteo

const weatherCache   = new Map<string, { data: WeatherResult; ts: number }>();
const forecastCache  = new Map<string, { data: ForecastResult; ts: number }>();

// ─── localStorage helpers ───────────────────────────────────────────────────

const LS_WX_PREFIX = 'mytrip-wx-';  // current weather
const LS_FC_PREFIX = 'mytrip-fc-';  // forecast 7 jours

const saveToLS = (prefix: string, key: string, data: unknown): void => {
  try {
    localStorage.setItem(prefix + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage plein ou indisponible — silencieux
  }
};

const readFromLS = <T>(prefix: string, key: string): { data: T; ts: number } | null => {
  try {
    const raw = localStorage.getItem(prefix + key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; ts: number };
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LECTURE SYNCHRONE DU CACHE — utilisée par les composants pour éviter
// le flash du spinner quand on revient sur la page
// ═══════════════════════════════════════════════════════════════════════════════

/** Lecture synchrone du cache météo actuelle (pas de Promise, pas de spinner) */
export const getCachedWeather = (lat: number, lon: number): WeatherResult | null => {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // 1. RAM
  const mem = weatherCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_LS) return mem.data;

  // 2. localStorage
  const ls = readFromLS<WeatherResult>(LS_WX_PREFIX, key);
  if (ls && Date.now() - ls.ts < CACHE_TTL_LS) {
    weatherCache.set(key, ls); // re-populate RAM
    return ls.data;
  }

  return null;
};

/** Lecture synchrone du cache prévisions 7j (pas de Promise, pas de spinner) */
export const getCachedForecast = (lat: number, lon: number): ForecastResult | null => {
  const key = `forecast_${lat.toFixed(2)},${lon.toFixed(2)}`;

  // 1. RAM
  const mem = forecastCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_LS) return mem.data;

  // 2. localStorage
  const ls = readFromLS<ForecastResult>(LS_FC_PREFIX, key);
  if (ls && Date.now() - ls.ts < CACHE_TTL_LS) {
    forecastCache.set(key, ls); // re-populate RAM
    return ls.data;
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GEOCODING — Photon (OSM) pour résoudre ville → lat/lon
// ═══════════════════════════════════════════════════════════════════════════════

export type GeocodeResult = {
  lat: number;
  lon: number;
  isFallback?: boolean;
  fallbackName?: string;
};

const geocodeCache = new Map<string, GeocodeResult>();

export const geocodeCity = async (
  city: string,
  countryCode: string,
): Promise<GeocodeResult | null> => {
  const startedAt = Date.now();

  const cacheKey = `${city.toLowerCase().trim()},${countryCode.toUpperCase()}`;

  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    console.log('📦 [Geocode] Cache hit:', city);
    recordLocalUsage({
      service: 'geocode',
      category: 'local',
      endpoint: 'geocode/weather-city',
      status: 'cache',
      durationMs: Date.now() - startedAt,
      details: { city, countryCode, source: 'memory' },
    });
    return cached;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 0 : Base de données locale (instantané, pas d'API)
  // ══════════════════════════════════════════════════════════════════════
  try {
    const { findCityCoords } = await import('./cloud/capitals');
    const localResult = findCityCoords(city, countryCode);
    if (localResult) {
      const result = { lat: localResult.lat, lon: localResult.lon };
      geocodeCache.set(cacheKey, result);
      console.log('🏛️ [Geocode] Local DB:', city, '→', result.lat.toFixed(2), result.lon.toFixed(2));
      recordLocalUsage({
        service: 'geocode',
        category: 'local',
        endpoint: 'geocode/weather-city',
        status: 'success',
        durationMs: Date.now() - startedAt,
        details: { city, countryCode, source: 'local-db' },
      });
      return result;
    }
  } catch { /* silencieux */ }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 : Photon (komoot) — rapide, bias vers le pays
  // ══════════════════════════════════════════════════════════════════════
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', city);
    url.searchParams.set('limit', '5');

    const { CAPITAL_COORDS } = await import('./cloud/capitals');
    const cap = CAPITAL_COORDS[countryCode];
    if (cap) {
      url.searchParams.set('lat', String(cap.lat));
      url.searchParams.set('lon', String(cap.lon));
    }

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const features = data.features;
      if (features && features.length > 0) {
        const match = features.find(
          (f: { properties?: { countrycode?: string } }) =>
            f.properties?.countrycode?.toUpperCase() === countryCode.toUpperCase()
        ) ?? features[0];

        const lon = match.geometry?.coordinates?.[0];
        const lat = match.geometry?.coordinates?.[1];

        if (typeof lat === 'number' && typeof lon === 'number') {
          const result = { lat, lon };
          geocodeCache.set(cacheKey, result);
          console.log('✅ [Geocode] Photon:', city, '→', lat.toFixed(2), lon.toFixed(2));
          recordLocalUsage({
            service: 'geocode',
            category: 'external',
            endpoint: 'photon/weather-city',
            status: 'success',
            durationMs: Date.now() - startedAt,
            details: { city, countryCode },
          });
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [Geocode] Photon error:', city, err);
    recordLocalUsage({
      service: 'geocode',
      category: 'external',
      endpoint: 'photon/weather-city',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorReason: 'photon_error',
      details: { city, countryCode, error: String((err as Error)?.message ?? err) },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 : Nominatim (OSM) — fallback complet, gratuit, fiable
  // ══════════════════════════════════════════════════════════════════════
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', city);
    url.searchParams.set('countrycodes', countryCode.toLowerCase());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '3');
    url.searchParams.set('accept-language', 'fr');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'MyTrip/5.0 (travel app)' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const result = { lat, lon };
          geocodeCache.set(cacheKey, result);
          console.log('✅ [Geocode] Nominatim:', city, '→', lat.toFixed(2), lon.toFixed(2));
          recordLocalUsage({
            service: 'geocode',
            category: 'external',
            endpoint: 'nominatim/weather-city',
            status: 'success',
            durationMs: Date.now() - startedAt,
            details: { city, countryCode },
          });
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [Geocode] Nominatim error:', city, err);
    recordLocalUsage({
      service: 'geocode',
      category: 'external',
      endpoint: 'nominatim/weather-city',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorReason: 'nominatim_error',
      details: { city, countryCode, error: String((err as Error)?.message ?? err) },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 : Fallback capitale du pays
  // ══════════════════════════════════════════════════════════════════════
  try {
    const { CAPITAL_COORDS } = await import('./cloud/capitals');
    const cap = CAPITAL_COORDS[countryCode];
    if (cap) {
      const result: GeocodeResult = {
        lat: cap.lat,
        lon: cap.lon,
        isFallback: true,
        fallbackName: cap.name,
      };
      geocodeCache.set(cacheKey, result);
      console.log('🏛️ [Geocode] Fallback capitale:', city, '→', cap.name);
      recordLocalUsage({
        service: 'geocode',
        category: 'local',
        endpoint: 'geocode/weather-city',
        status: 'fallback',
        durationMs: Date.now() - startedAt,
        errorReason: 'capital_fallback',
        details: { city, countryCode, fallbackName: cap.name },
      });
      return result;
    }
  } catch { /* silencieux */ }

  console.warn('❌ [Geocode] Échec total:', city, countryCode);
  recordLocalUsage({
    service: 'geocode',
    category: 'external',
    endpoint: 'geocode/weather-city',
    status: 'error',
    durationMs: Date.now() - startedAt,
    errorReason: 'not_found',
    details: { city, countryCode },
  });
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH WEATHER — Météo actuelle (2 couches de cache)
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchWeather = async (
  lat: number,
  lon: number,
): Promise<WeatherResult> => {
  const startedAt = Date.now();

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // 1. RAM cache (2h) — instantané
  const memCached = weatherCache.get(key);
  if (memCached && Date.now() - memCached.ts < CACHE_TTL_RAM) {
    recordLocalUsage({
      service: 'weather',
      category: 'local',
      endpoint: 'open-meteo/current',
      status: 'cache',
      durationMs: Date.now() - startedAt,
      details: { layer: 'ram', key },
    });
    return memCached.data;
  }

  // 2. localStorage cache (48h) — instantané mais RAM expirée
  const lsCached = readFromLS<WeatherResult>(LS_WX_PREFIX, key);
  if (lsCached && Date.now() - lsCached.ts < CACHE_TTL_LS) {
    weatherCache.set(key, lsCached); // re-populate RAM
    recordLocalUsage({
      service: 'weather',
      category: 'local',
      endpoint: 'open-meteo/current',
      status: 'cache',
      durationMs: Date.now() - startedAt,
      details: { layer: 'localStorage', key },
    });
    return lsCached.data;
  }

  // 3. Pas de cache frais → API
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current',
      'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      recordLocalUsage({
        service: 'weather',
        category: 'external',
        endpoint: 'open-meteo/current',
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorReason: `http_${res.status}`,
        details: { key },
      });
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const c = data.current;
    const wmo = WMO[c.weathercode] ?? { icon: '🌡️', label: 'Météo' };

    const result: WeatherResult = {
      ok:        true,
      temp:      Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      code:      c.weathercode,
      icon:      wmo.icon,
      label:     wmo.label,
      wind:      Math.round(c.windspeed_10m),
      humidity:  Math.round(c.relativehumidity_2m),
    };

    // Sauvegarder dans les 2 couches
    const entry = { data: result, ts: Date.now() };
    weatherCache.set(key, entry);
    saveToLS(LS_WX_PREFIX, key, result);

    recordLocalUsage({
      service: 'weather',
      category: 'external',
      endpoint: 'open-meteo/current',
      status: 'success',
      durationMs: Date.now() - startedAt,
      details: { key },
    });

    return result;

  } catch (err) {
    console.warn('⚠️ [Weather] Error:', err);

    // Dernier recours : utiliser le cache expiré si dispo
    if (lsCached) {
      recordLocalUsage({
        service: 'weather',
        category: 'external',
        endpoint: 'open-meteo/current',
        status: 'fallback',
        durationMs: Date.now() - startedAt,
        errorReason: 'network_error_expired_cache',
        details: { key },
      });
      return lsCached.data;
    }

    recordLocalUsage({
      service: 'weather',
      category: 'external',
      endpoint: 'open-meteo/current',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorReason: 'network_error',
      details: { key },
    });
    return { ok: false, reason: 'network_error' };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH FORECAST — Prévisions 7 jours (2 couches de cache)
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchForecast = async (
  lat: number,
  lon: number,
): Promise<ForecastResult> => {
  const startedAt = Date.now();

  const key = `forecast_${lat.toFixed(2)},${lon.toFixed(2)}`;

  // 1. RAM cache (2h)
  const memCached = forecastCache.get(key);
  if (memCached && Date.now() - memCached.ts < CACHE_TTL_RAM) {
    recordLocalUsage({
      service: 'weather',
      category: 'local',
      endpoint: 'open-meteo/forecast',
      status: 'cache',
      durationMs: Date.now() - startedAt,
      details: { layer: 'ram', key },
    });
    return memCached.data;
  }

  // 2. localStorage cache (48h)
  const lsCached = readFromLS<ForecastResult>(LS_FC_PREFIX, key);
  if (lsCached && Date.now() - lsCached.ts < CACHE_TTL_LS) {
    forecastCache.set(key, lsCached); // re-populate RAM
    recordLocalUsage({
      service: 'weather',
      category: 'local',
      endpoint: 'open-meteo/forecast',
      status: 'cache',
      durationMs: Date.now() - startedAt,
      details: { layer: 'localStorage', key },
    });
    return lsCached.data;
  }

  // 3. Pas de cache frais → API
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('daily', [
      'weathercode',
      'temperature_2m_max',
      'temperature_2m_min',
      'relative_humidity_2m_max',
      'relative_humidity_2m_min',
      'windspeed_10m_max',
      'uv_index_max',
      'pressure_msl_mean',
      'sunrise',
      'sunset',
      'precipitation_sum',
    ].join(','));
    url.searchParams.set('hourly', [
      'weathercode',
      'temperature_2m',
      'relative_humidity_2m',
      'windspeed_10m',
    ].join(','));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      recordLocalUsage({
        service: 'weather',
        category: 'external',
        endpoint: 'open-meteo/forecast',
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorReason: `http_${res.status}`,
        details: { key },
      });
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const d = data.daily;
    const h = data.hourly;

    if (!d || !d.time || !h || !h.time) {
      recordLocalUsage({
        service: 'weather',
        category: 'external',
        endpoint: 'open-meteo/forecast',
        status: 'error',
        durationMs: Date.now() - startedAt,
        errorReason: 'invalid_response',
        details: { key },
      });
      return { ok: false, reason: 'invalid_response' };
    }

    const days: DailyForecast[] = d.time.map((dateStr: string, i: number) => ({
      date:        dateStr,
      dayName:     getDayName(dateStr, i),
      weatherCode: d.weathercode?.[i] ?? 0,
      tempMax:     Math.round(d.temperature_2m_max?.[i] ?? 0),
      tempMin:     Math.round(d.temperature_2m_min?.[i] ?? 0),
      humidity:    Math.round(
        ((d.relative_humidity_2m_max?.[i] ?? 0) + (d.relative_humidity_2m_min?.[i] ?? 0)) / 2
      ),
      windSpeed:   Math.round(d.windspeed_10m_max?.[i] ?? 0),
      uvIndex:     Math.round((d.uv_index_max?.[i] ?? 0) * 10) / 10,
      pressure:    Math.round(d.pressure_msl_mean?.[i] ?? 0),
      sunrise:     formatTime(d.sunrise?.[i] ?? ''),
      sunset:      formatTime(d.sunset?.[i] ?? ''),
      precipitation: Math.round((d.precipitation_sum?.[i] ?? 0) * 10) / 10,
      morning:     computePeriod(
        h.weathercode ?? [], h.temperature_2m ?? [],
        h.relative_humidity_2m ?? [], h.windspeed_10m ?? [],
        i, 6, 11,
      ),
      afternoon:   computePeriod(
        h.weathercode ?? [], h.temperature_2m ?? [],
        h.relative_humidity_2m ?? [], h.windspeed_10m ?? [],
        i, 12, 17,
      ),
      night:       computePeriod(
        h.weathercode ?? [], h.temperature_2m ?? [],
        h.relative_humidity_2m ?? [], h.windspeed_10m ?? [],
        i, 18, 23,
      ),
    }));

    const result: ForecastResult = { ok: true, days };

    // Sauvegarder dans les 2 couches
    const entry = { data: result, ts: Date.now() };
    forecastCache.set(key, entry);
    saveToLS(LS_FC_PREFIX, key, result);

    recordLocalUsage({
      service: 'weather',
      category: 'external',
      endpoint: 'open-meteo/forecast',
      status: 'success',
      durationMs: Date.now() - startedAt,
      details: { key, days: days.length },
    });

    return result;

  } catch (err) {
    console.warn('⚠️ [Forecast] Error:', err);

    // Dernier recours : utiliser le cache expiré si dispo
    if (lsCached) {
      recordLocalUsage({
        service: 'weather',
        category: 'external',
        endpoint: 'open-meteo/forecast',
        status: 'fallback',
        durationMs: Date.now() - startedAt,
        errorReason: 'network_error_expired_cache',
        details: { key },
      });
      return lsCached.data;
    }

    recordLocalUsage({
      service: 'weather',
      category: 'external',
      endpoint: 'open-meteo/forecast',
      status: 'error',
      durationMs: Date.now() - startedAt,
      errorReason: 'network_error',
      details: { key },
    });
    return { ok: false, reason: 'network_error' };
  }
};
