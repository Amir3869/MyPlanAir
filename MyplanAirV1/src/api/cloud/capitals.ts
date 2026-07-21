// src/api/cloud/capitals.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Coordonnées GPS — Capitales des 195 pays + Villes touristiques majeures
// Utilisé comme fallback quand le géocodage API (Photon/Nominatim) échoue
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Capitales des 195 pays reconnus ────────────────────────────────────────

export const CAPITAL_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  // ── Europe ──────────────────────────────────────────────────────────────
  AL: { lat: 41.3275, lon: 19.8187,  name: 'Tirana' },
  AD: { lat: 42.5462, lon: 1.6016,   name: 'Andorre-la-Vieille' },
  AT: { lat: 48.2082, lon: 16.3738,  name: 'Vienne' },
  BY: { lat: 53.9006, lon: 27.5590,  name: 'Minsk' },
  BE: { lat: 50.8503, lon: 4.3517,   name: 'Bruxelles' },
  BA: { lat: 43.8563, lon: 18.4131,  name: 'Sarajevo' },
  BG: { lat: 42.6977, lon: 23.3219,  name: 'Sofia' },
  HR: { lat: 45.8150, lon: 15.9819,  name: 'Zagreb' },
  CY: { lat: 35.1856, lon: 33.3823,  name: 'Nicosie' },
  CZ: { lat: 50.0755, lon: 14.4378,  name: 'Prague' },
  DK: { lat: 55.6761, lon: 12.5683,  name: 'Copenhague' },
  EE: { lat: 59.4370, lon: 24.7536,  name: 'Tallinn' },
  FI: { lat: 60.1699, lon: 24.9384,  name: 'Helsinki' },
  FR: { lat: 48.8566, lon: 2.3522,   name: 'Paris' },
  DE: { lat: 52.5200, lon: 13.4050,  name: 'Berlin' },
  GR: { lat: 37.9838, lon: 23.7275,  name: 'Athènes' },
  HU: { lat: 47.4979, lon: 19.0402,  name: 'Budapest' },
  IS: { lat: 64.1355, lon: -21.8954, name: 'Reykjavik' },
  IE: { lat: 53.3498, lon: -6.2603,  name: 'Dublin' },
  IT: { lat: 41.9028, lon: 12.4964,  name: 'Rome' },
  XK: { lat: 42.6675, lon: 21.1662,  name: 'Pristina' },
  LV: { lat: 56.9496, lon: 24.1052,  name: 'Riga' },
  LI: { lat: 47.1410, lon: 9.5215,   name: 'Vaduz' },
  LT: { lat: 54.6872, lon: 25.2797,  name: 'Vilnius' },
  LU: { lat: 49.6117, lon: 6.1300,   name: 'Luxembourg' },
  MT: { lat: 35.8989, lon: 14.5146,  name: 'La Valette' },
  MD: { lat: 47.0105, lon: 28.8638,  name: 'Chisinau' },
  MC: { lat: 43.7384, lon: 7.4246,   name: 'Monaco' },
  ME: { lat: 42.4411, lon: 19.2636,  name: 'Podgorica' },
  NL: { lat: 52.3676, lon: 4.9041,   name: 'Amsterdam' },
  MK: { lat: 41.9973, lon: 21.4280,  name: 'Skopje' },
  NO: { lat: 59.9139, lon: 10.7522,  name: 'Oslo' },
  PL: { lat: 52.2297, lon: 21.0122,  name: 'Varsovie' },
  PT: { lat: 38.7223, lon: -9.1393,  name: 'Lisbonne' },
  RO: { lat: 44.4268, lon: 26.1025,  name: 'Bucarest' },
  RU: { lat: 55.7558, lon: 37.6173,  name: 'Moscou' },
  SM: { lat: 43.9424, lon: 12.4578,  name: 'Saint-Marin' },
  RS: { lat: 44.7866, lon: 20.4489,  name: 'Belgrade' },
  SK: { lat: 48.1486, lon: 17.1077,  name: 'Bratislava' },
  SI: { lat: 46.0569, lon: 14.5058,  name: 'Ljubljana' },
  ES: { lat: 40.4168, lon: -3.7038,  name: 'Madrid' },
  SJ: { lat: 78.2186, lon: 15.6488,  name: 'Longyearbyen' },
  SE: { lat: 59.3293, lon: 18.0686,  name: 'Stockholm' },
  CH: { lat: 46.9480, lon: 7.4474,   name: 'Berne' },
  UA: { lat: 50.4501, lon: 30.5234,  name: 'Kyiv' },
  GB: { lat: 51.5074, lon: -0.1278,  name: 'Londres' },
  VA: { lat: 41.9029, lon: 12.4534,  name: 'Cité du Vatican' },

  // ── Asie ────────────────────────────────────────────────────────────────
  AF: { lat: 34.5281, lon: 69.1723,  name: 'Kaboul' },
  AM: { lat: 40.1833, lon: 44.5167,  name: 'Erevan' },
  AZ: { lat: 40.4093, lon: 49.8671,  name: 'Bakou' },
  BH: { lat: 26.2285, lon: 50.5860,  name: 'Manama' },
  BD: { lat: 23.8103, lon: 90.4125,  name: 'Dhaka' },
  BT: { lat: 27.4728, lon: 89.6390,  name: 'Thimphou' },
  BN: { lat: 4.9031,  lon: 114.9398, name: 'Bandar Seri Begawan' },
  KH: { lat: 11.5564, lon: 104.9282, name: 'Phnom Penh' },
  CN: { lat: 39.9042, lon: 116.4074, name: 'Pékin' },
  GE: { lat: 41.6938, lon: 44.8015,  name: 'Tbilissi' },
  IN: { lat: 28.6139, lon: 77.2090,  name: 'New Delhi' },
  ID: { lat: -6.2088, lon: 106.8456, name: 'Jakarta' },
  IR: { lat: 35.6892, lon: 51.3890,  name: 'Téhéran' },
  IQ: { lat: 33.3152, lon: 44.3661,  name: 'Bagdad' },
  IL: { lat: 31.7683, lon: 35.2137,  name: 'Jérusalem' },
  JP: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  JO: { lat: 31.9454, lon: 35.9284,  name: 'Amman' },
  KZ: { lat: 51.1811, lon: 71.4460,  name: 'Astana' },
  KW: { lat: 29.3759, lon: 47.9774,  name: 'Koweït' },
  KG: { lat: 42.8746, lon: 74.5698,  name: 'Bichkek' },
  LA: { lat: 17.9757, lon: 102.6331, name: 'Vientiane' },
  LB: { lat: 33.8938, lon: 35.5018,  name: 'Beyrouth' },
  MY: { lat: 3.1390,  lon: 101.6869, name: 'Kuala Lumpur' },
  MV: { lat: 4.1755,  lon: 73.5093,  name: 'Malé' },
  MN: { lat: 47.9184, lon: 106.9177, name: 'Oulan-Bator' },
  MM: { lat: 16.8661, lon: 96.1951,  name: 'Naypyidaw' },
  NP: { lat: 27.7172, lon: 85.3240,  name: 'Katmandou' },
  KP: { lat: 39.0392, lon: 125.7625, name: 'Pyongyang' },
  OM: { lat: 23.5880, lon: 58.3829,  name: 'Mascate' },
  PK: { lat: 33.6844, lon: 73.0479,  name: 'Islamabad' },
  PH: { lat: 14.5995, lon: 120.9842, name: 'Manille' },
  QA: { lat: 25.2854, lon: 51.5310,  name: 'Doha' },
  SA: { lat: 24.7136, lon: 46.6753,  name: 'Riyad' },
  SG: { lat: 1.3521,  lon: 103.8198, name: 'Singapour' },
  KR: { lat: 37.5665, lon: 126.9780, name: 'Séoul' },
  LK: { lat: 6.9271,  lon: 79.8612,  name: 'Colombo' },
  PS: { lat: 31.9522, lon: 35.2332,  name: 'Ramallah' },
  SY: { lat: 33.5138, lon: 36.2765,  name: 'Damas' },
  TW: { lat: 25.0330, lon: 121.5654, name: 'Taipei' },
  TJ: { lat: 38.5598, lon: 68.7740,  name: 'Douchanbé' },
  TH: { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
  TL: { lat: -8.5567, lon: 125.5780, name: 'Dili' },
  TR: { lat: 39.9334, lon: 32.8597,  name: 'Ankara' },
  TM: { lat: 37.9601, lon: 58.3261,  name: 'Achgabat' },
  AE: { lat: 24.4539, lon: 54.3773,  name: 'Abu Dhabi' },
  UZ: { lat: 41.2995, lon: 69.2401,  name: 'Tachkent' },
  VN: { lat: 21.0285, lon: 105.8542, name: 'Hanoï' },
  YE: { lat: 15.3694, lon: 44.1910,  name: 'Sanaa' },

  // ── Afrique ─────────────────────────────────────────────────────────────
  DZ: { lat: 36.7372, lon: 3.0865,   name: 'Alger' },
  AO: { lat: -8.8390, lon: 13.2894,  name: 'Luanda' },
  BJ: { lat: 6.4965,  lon: 2.6034,   name: 'Porto-Novo' },
  BW: { lat: -24.6545,lon: 25.9086,  name: 'Gaborone' },
  BF: { lat: 12.3723, lon: -1.5197,  name: 'Ouagadougou' },
  BI: { lat: -3.3822, lon: 29.3615,  name: 'Bujumbura' },
  CV: { lat: 14.9177, lon: -23.5090, name: 'Praia' },
  CM: { lat: 3.8480,  lon: 11.5021,  name: 'Yaoundé' },
  CF: { lat: 4.3947,  lon: 18.5582,  name: 'Bangui' },
  TD: { lat: 12.1348, lon: 15.0557,  name: 'N\'Djamena' },
  KM: { lat: -11.7022,lon: 43.2551,  name: 'Moroni' },
  CG: { lat: -4.2634, lon: 15.2429,  name: 'Brazzaville' },
  CD: { lat: -4.3250, lon: 15.3222,  name: 'Kinshasa' },
  CI: { lat: 5.3600,  lon: -4.0083,  name: 'Abidjan' },
  DJ: { lat: 11.5880, lon: 43.1456,  name: 'Djibouti' },
  EG: { lat: 30.0444, lon: 31.2357,  name: 'Le Caire' },
  GQ: { lat: 3.7500,  lon: 8.7833,   name: 'Malabo' },
  ER: { lat: 15.3229, lon: 38.9250,  name: 'Asmara' },
  SZ: { lat: -26.3054,lon: 31.1367,  name: 'Mbabane' },
  ET: { lat: 9.0054,  lon: 38.7636,  name: 'Addis-Abeba' },
  GA: { lat: 0.3900,  lon: 9.4544,   name: 'Libreville' },
  GM: { lat: 13.4527, lon: -16.5780, name: 'Banjul' },
  GH: { lat: 5.6037,  lon: -0.1870,  name: 'Accra' },
  GN: { lat: 9.5092,  lon: -13.7122, name: 'Conakry' },
  GW: { lat: 11.8598, lon: -15.5906, name: 'Bissau' },
  KE: { lat: -1.2921, lon: 36.8219,  name: 'Nairobi' },
  LS: { lat: -29.3101,lon: 27.4815,  name: 'Maseru' },
  LR: { lat: 6.3005,  lon: -10.7967, name: 'Monrovia' },
  LY: { lat: 32.8872, lon: 13.1913,  name: 'Tripoli' },
  MG: { lat: -18.8792,lon: 47.5079,  name: 'Antananarivo' },
  MW: { lat: -13.9626,lon: 33.7741,  name: 'Lilongwe' },
  ML: { lat: 12.6398, lon: -8.0029,  name: 'Bamako' },
  MR: { lat: 18.0735, lon: -15.9582, name: 'Nouakchott' },
  MU: { lat: -20.1619,lon: 57.4989,  name: 'Port-Louis' },
  MA: { lat: 33.9716, lon: -6.8498,  name: 'Rabat' },
  MZ: { lat: -25.9692,lon: 32.5732,  name: 'Maputo' },
  NA: { lat: -22.5609,lon: 17.0658,  name: 'Windhoek' },
  NE: { lat: 13.5116, lon: 2.1153,   name: 'Niamey' },
  NG: { lat: 9.0765,  lon: 7.3986,   name: 'Abuja' },
  RW: { lat: -1.9403, lon: 29.8739,  name: 'Kigali' },
  ST: { lat: 0.3356,  lon: 6.7273,   name: 'São Tomé' },
  SN: { lat: 14.6928, lon: -17.4467, name: 'Dakar' },
  SC: { lat: -4.6167, lon: 55.4500,  name: 'Victoria' },
  SL: { lat: 8.4840,  lon: -13.2299, name: 'Freetown' },
  SO: { lat: 2.0469,  lon: 45.3183,  name: 'Mogadiscio' },
  ZA: { lat: -25.7461,lon: 28.1881,  name: 'Pretoria' },
  SS: { lat: 4.8594,  lon: 31.5913,  name: 'Djouba' },
  SD: { lat: 15.5007, lon: 32.5599,  name: 'Khartoum' },
  TZ: { lat: -6.1630, lon: 35.7516,  name: 'Dodoma' },
  TG: { lat: 6.1319,  lon: 1.2228,   name: 'Lomé' },
  TN: { lat: 36.8190, lon: 10.1658,  name: 'Tunis' },
  UG: { lat: 0.3476,  lon: 32.5825,  name: 'Kampala' },
  ZM: { lat: -15.3875,lon: 28.3228,  name: 'Lusaka' },
  ZW: { lat: -17.8292,lon: 31.0522,  name: 'Harare' },

  // ── Amérique du Nord & Centrale ─────────────────────────────────────────
  AG: { lat: 17.1172, lon: -61.8456, name: 'Saint-John' },
  BS: { lat: 25.0480, lon: -77.3554, name: 'Nassau' },
  BB: { lat: 13.0975, lon: -59.6167, name: 'Bridgetown' },
  BZ: { lat: 17.4975, lon: -88.1960, name: 'Belmopan' },
  CA: { lat: 45.4215, lon: -75.6972, name: 'Ottawa' },
  CR: { lat: 9.9281,  lon: -84.0907, name: 'San José' },
  CU: { lat: 23.1136, lon: -82.3666, name: 'La Havane' },
  DM: { lat: 15.2976, lon: -61.3900, name: 'Roseau' },
  DO: { lat: 18.4861, lon: -69.9312, name: 'Saint-Domingue' },
  SV: { lat: 13.6989, lon: -89.1914, name: 'San Salvador' },
  GD: { lat: 12.0563, lon: -61.7485, name: 'Saint-Georges' },
  GT: { lat: 14.6349, lon: -90.5069, name: 'Guatemala' },
  HT: { lat: 18.5392, lon: -72.3350, name: 'Port-au-Prince' },
  HN: { lat: 14.0723, lon: -87.1921, name: 'Tegucigalpa' },
  JM: { lat: 17.9970, lon: -76.7936, name: 'Kingston' },
  MX: { lat: 19.4326, lon: -99.1332, name: 'Mexico' },
  NI: { lat: 12.1364, lon: -86.2514, name: 'Managua' },
  PA: { lat: 8.9936,  lon: -79.5197, name: 'Panama' },
  KN: { lat: 17.2982, lon: -62.7328, name: 'Basseterre' },
  LC: { lat: 14.0168, lon: -60.9867, name: 'Castries' },
  VC: { lat: 13.1591, lon: -61.2212, name: 'Kingstown' },
  TT: { lat: 10.6596, lon: -61.5086, name: 'Port-d\'Espagne' },
  US: { lat: 38.9072, lon: -77.0369, name: 'Washington' },

  // ── Amérique du Sud ────────────────────────────────────────────────────
  AR: { lat: -34.6037,lon: -58.3816, name: 'Buenos Aires' },
  BO: { lat: -16.5000,lon: -68.1500, name: 'La Paz' },
  BR: { lat: -15.7801,lon: -47.9292, name: 'Brasilia' },
  CL: { lat: -33.4489,lon: -70.6693, name: 'Santiago' },
  CO: { lat: 4.7110,  lon: -74.0721, name: 'Bogotá' },
  EC: { lat: -0.1807, lon: -78.4678, name: 'Quito' },
  GY: { lat: 6.8013,  lon: -58.1552, name: 'Georgetown' },
  PY: { lat: -25.2867,lon: -57.6470, name: 'Asunción' },
  PE: { lat: -12.0464,lon: -77.0428, name: 'Lima' },
  SR: { lat: 5.8520,  lon: -55.2038, name: 'Paramaribo' },
  UY: { lat: -34.9011,lon: -56.1915, name: 'Montevideo' },
  VE: { lat: 10.4806, lon: -66.9036, name: 'Caracas' },

  // ── Océanie ─────────────────────────────────────────────────────────────
  AU: { lat: -35.2809,lon: 149.1300, name: 'Canberra' },
  FJ: { lat: -18.1416,lon: 178.4419, name: 'Suva' },
  KI: { lat: 1.3278,  lon: 172.9770, name: 'Tarawa' },
  MH: { lat: 7.0918,  lon: 171.3800, name: 'Majuro' },
  FM: { lat: 6.8878,  lon: 158.2150, name: 'Palikir' },
  NR: { lat: -0.5228, lon: 166.9315, name: 'Yaren' },
  NZ: { lat: -41.2865,lon: 174.7762, name: 'Wellington' },
  PW: { lat: 7.5008,  lon: 134.6234, name: 'Ngerulmud' },
  PG: { lat: -6.3149, lon: 143.9556, name: 'Port Moresby' },
  WS: { lat: -13.8333,lon: -171.7500,name: 'Apia' },
  SB: { lat: -9.4333, lon: 160.0000, name: 'Honiara' },
  TO: { lat: -21.2087,lon: -175.1982,name: 'Nuku\'alofa' },
  TV: { lat: -8.5211, lon: 179.1967, name: 'Funafuti' },
  VU: { lat: -17.7333,lon: 168.3167, name: 'Port-Vila' },
};

// ─── Villes touristiques majeures ──────────────────────────────────────────
// Recherche par "code pays + nom ville" en minuscules
// ex: CITY_COORDS['jp-kyoto'] ou CITY_COORDS['jo-petra']
// Plus riche que les capitales seules — couvre les destinations roadtrip

export const CITY_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  // ── France ──────────────────────────────────────────────────────────────
  'fr-paris':       { lat: 48.8566, lon: 2.3522,   name: 'Paris' },
  'fr-lyon':        { lat: 45.7640, lon: 4.8357,   name: 'Lyon' },
  'fr-marseille':   { lat: 43.2965, lon: 5.3698,   name: 'Marseille' },
  'fr-nice':        { lat: 43.7102, lon: 7.2620,   name: 'Nice' },
  'fr-bordeaux':    { lat: 44.8378, lon: -0.5792,  name: 'Bordeaux' },
  'fr-toulouse':    { lat: 43.6047, lon: 1.4442,   name: 'Toulouse' },
  'fr-strasbourg':  { lat: 48.5734, lon: 7.7521,   name: 'Strasbourg' },
  'fr-corsica':     { lat: 42.0396, lon: 9.0119,   name: 'Ajaccio' },

  // ── Espagne ─────────────────────────────────────────────────────────────
  'es-barcelona':   { lat: 41.3874, lon: 2.1686,   name: 'Barcelone' },
  'es-madrid':      { lat: 40.4168, lon: -3.7038,  name: 'Madrid' },
  'es-seville':     { lat: 37.3891, lon: -5.9845,  name: 'Séville' },
  'es-valencia':    { lat: 39.4699, lon: -0.3763,  name: 'Valence' },
  'es-malaga':      { lat: 36.7213, lon: -4.4214,  name: 'Málaga' },
  'es-palma':       { lat: 39.5696, lon: 2.6502,   name: 'Palma' },
  'es-granada':     { lat: 37.1773, lon: -3.5986,  name: 'Grenade' },
  'es-bilbao':      { lat: 43.2630, lon: -2.9350,  name: 'Bilbao' },
  'es-ibiza':       { lat: 38.9067, lon: 1.4206,   name: 'Ibiza' },
  'es-canarias':    { lat: 28.2916, lon: -16.6291, name: 'Santa Cruz' },

  // ── Italie ──────────────────────────────────────────────────────────────
  'it-rome':        { lat: 41.9028, lon: 12.4964,  name: 'Rome' },
  'it-milan':       { lat: 45.4642, lon: 9.1900,   name: 'Milan' },
  'it-venice':      { lat: 45.4408, lon: 12.3155,  name: 'Venise' },
  'it-florence':    { lat: 43.7696, lon: 11.2558,  name: 'Florence' },
  'it-naples':      { lat: 40.8518, lon: 14.2681,  name: 'Naples' },
  'it-amalfi':      { lat: 40.6340, lon: 14.6027,  name: 'Amalfi' },
  'it-sardinia':    { lat: 40.1209, lon: 9.0129,   name: 'Cagliari' },
  'it-sicily':      { lat: 38.1157, lon: 13.3613,  name: 'Palerme' },

  // ── Grèce ───────────────────────────────────────────────────────────────
  'gr-athens':      { lat: 37.9838, lon: 23.7275,  name: 'Athènes' },
  'gr-santorini':   { lat: 36.3932, lon: 25.4615,  name: 'Santorini' },
  'gr-mykonos':     { lat: 37.4467, lon: 25.3289,  name: 'Mykonos' },
  'gr-crete':       { lat: 35.2401, lon: 24.8093,  name: 'Héraklion' },
  'gr-thessaloniki':{ lat: 40.6401, lon: 22.9444,  name: 'Thessalonique' },
  'gr-rhodes':      { lat: 36.4341, lon: 28.2176,  name: 'Rhodes' },

  // ── Portugal ────────────────────────────────────────────────────────────
  'pt-lisbon':      { lat: 38.7223, lon: -9.1393,  name: 'Lisbonne' },
  'pt-porto':       { lat: 41.1579, lon: -8.6291,  name: 'Porto' },
  'pt-algarve':     { lat: 37.0179, lon: -7.9307,  name: 'Faro' },
  'pt-madeira':     { lat: 32.6669, lon: -16.9241, name: 'Funchal' },

  // ── Royaume-Uni ─────────────────────────────────────────────────────────
  'gb-london':      { lat: 51.5074, lon: -0.1278,  name: 'Londres' },
  'gb-edinburgh':   { lat: 55.9533, lon: -3.1883,  name: 'Édimbourg' },
  'gb-manchester':  { lat: 53.4808, lon: -2.2426,  name: 'Manchester' },
  'gb-dublin':      { lat: 53.3498, lon: -6.2603,  name: 'Dublin' },

  // ── Allemagne ───────────────────────────────────────────────────────────
  'de-berlin':      { lat: 52.5200, lon: 13.4050,  name: 'Berlin' },
  'de-munich':      { lat: 48.1351, lon: 11.5820,  name: 'Munich' },
  'de-hamburg':     { lat: 53.5511, lon: 9.9937,   name: 'Hambourg' },
  'de-frankfurt':   { lat: 50.1109, lon: 8.6821,   name: 'Francfort' },
  'de-cologne':     { lat: 50.9375, lon: 6.9603,   name: 'Cologne' },

  // ── Pays-Bas ────────────────────────────────────────────────────────────
  'nl-amsterdam':   { lat: 52.3676, lon: 4.9041,   name: 'Amsterdam' },
  'nl-rotterdam':   { lat: 51.9244, lon: 4.4777,   name: 'Rotterdam' },

  // ── Suisse ──────────────────────────────────────────────────────────────
  'ch-zurich':      { lat: 47.3769, lon: 8.5417,   name: 'Zurich' },
  'ch-geneva':      { lat: 46.2044, lon: 6.1432,   name: 'Genève' },
  'ch-interlaken':  { lat: 46.6863, lon: 7.8632,   name: 'Interlaken' },
  'ch-lucerne':     { lat: 47.0502, lon: 8.3093,   name: 'Lucerne' },
  'ch-zermatt':     { lat: 46.0207, lon: 7.7491,   name: 'Zermatt' },

  // ── Autriche ────────────────────────────────────────────────────────────
  'at-vienna':      { lat: 48.2082, lon: 16.3738,  name: 'Vienne' },
  'at-salzburg':    { lat: 47.8095, lon: 13.0550,  name: 'Salzbourg' },
  'at-innsbruck':   { lat: 47.2692, lon: 11.4041,  name: 'Innsbruck' },

  // ── Croatie ─────────────────────────────────────────────────────────────
  'hr-zagreb':      { lat: 45.8150, lon: 15.9819,  name: 'Zagreb' },
  'hr-dubrovnik':   { lat: 42.6507, lon: 18.0944,  name: 'Dubrovnik' },
  'hr-split':       { lat: 43.5081, lon: 16.4402,  name: 'Split' },

  // ── Turquie ─────────────────────────────────────────────────────────────
  'tr-istanbul':    { lat: 41.0082, lon: 28.9784,  name: 'Istanbul' },
  'tr-ankara':      { lat: 39.9334, lon: 32.8597,  name: 'Ankara' },
  'tr-cappadocia':  { lat: 38.6431, lon: 34.8289,  name: 'Cappadoce' },
  'tr-antalya':     { lat: 36.8969, lon: 30.7133,  name: 'Antalya' },
  'tr-bodrum':      { lat: 37.0343, lon: 27.4305,  name: 'Bodrum' },

  // ── Maroc ───────────────────────────────────────────────────────────────
  'ma-marrakech':   { lat: 31.6295, lon: -7.9811,  name: 'Marrakech' },
  'ma-casablanca':  { lat: 33.5731, lon: -7.5898,  name: 'Casablanca' },
  'ma-rabat':       { lat: 33.9716, lon: -6.8498,  name: 'Rabat' },
  'ma-fes':         { lat: 34.0181, lon: -5.0078,  name: 'Fès' },
  'ma-tangier':     { lat: 35.7595, lon: -5.8340,  name: 'Tanger' },

  // ── Tunisie ─────────────────────────────────────────────────────────────
  'tn-tunis':       { lat: 36.8190, lon: 10.1658,  name: 'Tunis' },
  'tn-djerba':      { lat: 33.8076, lon: 10.8451,  name: 'Djerba' },
  'tn-sfax':        { lat: 34.7398, lon: 10.7600,  name: 'Sfax' },

  // ── Égypte ──────────────────────────────────────────────────────────────
  'eg-cairo':       { lat: 30.0444, lon: 31.2357,  name: 'Le Caire' },
  'eg-luxor':       { lat: 25.6872, lon: 32.6396,  name: 'Louxor' },
  'eg-hurghada':    { lat: 27.2579, lon: 33.8116,  name: 'Hurghada' },
  'eg-sharm':       { lat: 27.9158, lon: 34.3300,  name: 'Sharm el-Sheikh' },
  'eg-alexandria':  { lat: 31.2001, lon: 29.9187,  name: 'Alexandrie' },

  // ── Jordanie ────────────────────────────────────────────────────────────
  'jo-amman':       { lat: 31.9454, lon: 35.9284,  name: 'Amman' },
  'jo-petra':       { lat: 30.3285, lon: 35.4444,  name: 'Pétra' },
  'jo-aqaba':       { lat: 29.5267, lon: 35.0078,  name: 'Aqaba' },
  'jo-deadsea':     { lat: 31.5000, lon: 35.5000,  name: 'Mer Morte' },
  'jo-wadirum':     { lat: 29.5321, lon: 35.4107,  name: 'Wadi Rum' },

  // ── Émirats ─────────────────────────────────────────────────────────────
  'ae-dubai':       { lat: 25.2048, lon: 55.2708,  name: 'Dubai' },
  'ae-abudhabi':    { lat: 24.4539, lon: 54.3773,  name: 'Abu Dhabi' },
  'ae-sharjah':     { lat: 25.3463, lon: 55.4209,  name: 'Sharjah' },

  // ── Arabie Saoudite ─────────────────────────────────────────────────────
  'sa-riyadh':      { lat: 24.7136, lon: 46.6753,  name: 'Riyad' },
  'sa-jeddah':      { lat: 21.4858, lon: 39.1925,  name: 'Djeddah' },
  'sa-medina':      { lat: 24.5247, lon: 39.5692,  name: 'Médine' },
  'sa-mecca':       { lat: 21.3891, lon: 39.8579,  name: 'La Mecque' },

  // ── Oman ────────────────────────────────────────────────────────────────
  'om-muscat':      { lat: 23.5880, lon: 58.3829,  name: 'Mascate' },
  'om-salalah':     { lat: 17.0151, lon: 54.0924,  name: 'Salalah' },

  // ── Qatar ───────────────────────────────────────────────────────────────
  'qa-doha':        { lat: 25.2854, lon: 51.5310,  name: 'Doha' },

  // ── Koweït ──────────────────────────────────────────────────────────────
  'kw-kuwait':      { lat: 29.3759, lon: 47.9774,  name: 'Koweït' },

  // ── Bahreïn ─────────────────────────────────────────────────────────────
  'bh-manama':      { lat: 26.2285, lon: 50.5860,  name: 'Manama' },

  // ── Israël / Palestine ──────────────────────────────────────────────────
  'il-jerusalem':   { lat: 31.7683, lon: 35.2137,  name: 'Jérusalem' },
  'il-telaviv':     { lat: 32.0853, lon: 34.7818,  name: 'Tel Aviv' },
  'il-eilat':       { lat: 29.5581, lon: 34.9482,  name: 'Eilat' },

  // ── Liban ───────────────────────────────────────────────────────────────
  'lb-beirut':      { lat: 33.8938, lon: 35.5018,  name: 'Beyrouth' },

  // ── Japon ───────────────────────────────────────────────────────────────
  'jp-tokyo':       { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  'jp-kyoto':       { lat: 35.0116, lon: 135.7681, name: 'Kyoto' },
  'jp-osaka':       { lat: 34.6937, lon: 135.5023, name: 'Osaka' },
  'jp-hiroshima':   { lat: 34.3853, lon: 132.4553, name: 'Hiroshima' },
  'jp-sapporo':     { lat: 43.0621, lon: 141.3544, name: 'Sapporo' },
  'jp-nara':        { lat: 34.6851, lon: 135.8048, name: 'Nara' },
  'jp-fukuoka':     { lat: 33.5904, lon: 130.4017, name: 'Fukuoka' },
  'jp-okinawa':     { lat: 26.3344, lon: 127.8056, name: 'Naha' },

  // ── Corée du Sud ────────────────────────────────────────────────────────
  'kr-seoul':       { lat: 37.5665, lon: 126.9780, name: 'Séoul' },
  'kr-busan':       { lat: 35.1796, lon: 129.0756, name: 'Busan' },
  'kr-jeju':        { lat: 33.4996, lon: 126.5312, name: 'Jeju' },

  // ── Chine ───────────────────────────────────────────────────────────────
  'cn-beijing':     { lat: 39.9042, lon: 116.4074, name: 'Pékin' },
  'cn-shanghai':    { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
  'cn-hongkong':    { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },
  'cn-guangzhou':   { lat: 23.1291, lon: 113.2644, name: 'Canton' },
  'cn-chengdu':     { lat: 30.5728, lon: 104.0668, name: 'Chengdu' },
  'cn-xian':        { lat: 34.2658, lon: 108.9541, name: 'Xi\'an' },

  // ── Thaïlande ───────────────────────────────────────────────────────────
  'th-bangkok':     { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
  'th-chiangmai':   { lat: 18.7883, lon: 98.9853,  name: 'Chiang Mai' },
  'th-phuket':      { lat: 7.8804,  lon: 98.3923,  name: 'Phuket' },
  'th-kohsamui':    { lat: 9.5120,  lon: 100.0136, name: 'Koh Samui' },
  'th-krabi':       { lat: 8.0863,  lon: 98.9063,  name: 'Krabi' },
  'th-pattaya':     { lat: 12.9236, lon: 100.8825, name: 'Pattaya' },

  // ── Vietnam ─────────────────────────────────────────────────────────────
  'vn-hanoi':       { lat: 21.0285, lon: 105.8542, name: 'Hanoï' },
  'vn-hochiminh':   { lat: 10.8231, lon: 106.6297, name: 'Hô Chi Minh' },
  'vn-danang':      { lat: 16.0544, lon: 108.2022, name: 'Da Nang' },
  'vn-halong':      { lat: 20.9101, lon: 107.1839, name: 'Halong' },
  'vn-hoian':       { lat: 15.8801, lon: 108.3380, name: 'Hoi An' },
  'vn-sapa':        { lat: 22.3363, lon: 103.8438, name: 'Sapa' },

  // ── Cambodge ────────────────────────────────────────────────────────────
  'kh-phnompenh':   { lat: 11.5564, lon: 104.9282, name: 'Phnom Penh' },
  'kh-siemreap':    { lat: 13.3671, lon: 103.8448, name: 'Siem Reap' },

  // ── Laos ────────────────────────────────────────────────────────────────
  'la-vientiane':   { lat: 17.9757, lon: 102.6331, name: 'Vientiane' },
  'la-luangprabang':{ lat: 19.8860, lon: 102.1347, name: 'Luang Prabang' },

  // ── Myanmar ─────────────────────────────────────────────────────────────
  'mm-yangon':      { lat: 16.8661, lon: 96.1951,  name: 'Yangon' },
  'mm-bagan':       { lat: 21.1717, lon: 94.8585,  name: 'Bagan' },

  // ── Malaisie ────────────────────────────────────────────────────────────
  'my-kualalumpur': { lat: 3.1390,  lon: 101.6869, name: 'Kuala Lumpur' },
  'my-penang':      { lat: 5.4164,  lon: 100.3327, name: 'Penang' },
  'my-langkawi':    { lat: 6.3500,  lon: 99.8000,  name: 'Langkawi' },
  'my-kotakinabalu':{ lat: 5.9804,  lon: 116.0735, name: 'Kota Kinabalu' },

  // ── Indonésie ───────────────────────────────────────────────────────────
  'id-bali':        { lat: -8.4095, lon: 115.1889, name: 'Bali' },
  'id-jakarta':     { lat: -6.2088, lon: 106.8456, name: 'Jakarta' },
  'id-yogyakarta':  { lat: -7.7956, lon: 110.3695, name: 'Yogyakarta' },
  'id-lombok':      { lat: -8.5831, lon: 116.1165, name: 'Lombok' },
  'id-komodo':      { lat: -8.5500, lon: 119.4500, name: 'Komodo' },

  // ── Philippines ─────────────────────────────────────────────────────────
  'ph-manila':      { lat: 14.5995, lon: 120.9842, name: 'Manille' },
  'ph-cebu':        { lat: 10.3157, lon: 123.8854, name: 'Cebu' },
  'ph-palawan':     { lat: 9.8349,  lon: 118.7384, name: 'Palawan' },
  'ph-boracay':     { lat: 11.9674, lon: 121.9248, name: 'Boracay' },

  // ── Singapour ───────────────────────────────────────────────────────────
  'sg-singapore':   { lat: 1.3521,  lon: 103.8198, name: 'Singapour' },

  // ── Inde ────────────────────────────────────────────────────────────────
  'in-newdelhi':    { lat: 28.6139, lon: 77.2090,  name: 'New Delhi' },
  'in-mumbai':      { lat: 19.0760, lon: 72.8777,  name: 'Mumbai' },
  'in-goa':         { lat: 15.2993, lon: 74.1240,  name: 'Goa' },
  'in-jaipur':      { lat: 26.9124, lon: 75.7873,  name: 'Jaipur' },
  'in-varanasi':    { lat: 25.3176, lon: 83.0000,  name: 'Varanasi' },
  'in-kerala':      { lat: 10.8505, lon: 76.2711,  name: 'Kerala' },
  'in-agra':        { lat: 27.1767, lon: 78.0081,  name: 'Agra' },

  // ── Sri Lanka ───────────────────────────────────────────────────────────
  'lk-colombo':     { lat: 6.9271,  lon: 79.8612,  name: 'Colombo' },
  'lk-kandy':       { lat: 7.2906,  lon: 80.6337,  name: 'Kandy' },

  // ── Népal ───────────────────────────────────────────────────────────────
  'np-kathmandu':   { lat: 27.7172, lon: 85.3240,  name: 'Katmandou' },
  'np-pokhara':     { lat: 28.2096, lon: 83.9856,  name: 'Pokhara' },

  // ── Australie ───────────────────────────────────────────────────────────
  'au-sydney':      { lat: -33.8688,lon: 151.2093, name: 'Sydney' },
  'au-melbourne':   { lat: -37.8136,lon: 144.9631, name: 'Melbourne' },
  'au-brisbane':    { lat: -27.4698,lon: 153.0251, name: 'Brisbane' },
  'au-perth':       { lat: -31.9505,lon: 115.8605, name: 'Perth' },
  'au-cairns':      { lat: -16.9186,lon: 145.7781, name: 'Cairns' },
  'au-goldcoast':   { lat: -28.0167,lon: 153.4000, name: 'Gold Coast' },

  // ── Nouvelle-Zélande ────────────────────────────────────────────────────
  'nz-auckland':    { lat: -36.8485,lon: 174.7633, name: 'Auckland' },
  'nz-queenstown':  { lat: -45.0312,lon: 168.6626, name: 'Queenstown' },
  'nz-christchurch':{ lat: -43.5321,lon: 172.6362, name: 'Christchurch' },

  // ── USA ─────────────────────────────────────────────────────────────────
  'us-newyork':     { lat: 40.7128, lon: -74.0060, name: 'New York' },
  'us-losangeles':  { lat: 34.0522, lon: -118.2437,name: 'Los Angeles' },
  'us-miami':       { lat: 25.7617, lon: -80.1918, name: 'Miami' },
  'us-sanfrancisco':{ lat: 37.7749, lon: -122.4194,name: 'San Francisco' },
  'us-lasvegas':    { lat: 36.1699, lon: -115.1398,name: 'Las Vegas' },
  'us-chicago':     { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
  'us-honolulu':    { lat: 21.3069, lon: -157.8583,name: 'Honolulu' },
  'us-orlando':     { lat: 28.5383, lon: -81.3792, name: 'Orlando' },
  'us-washington':  { lat: 38.9072, lon: -77.0369, name: 'Washington' },
  'us-boston':      { lat: 42.3601, lon: -71.0589, name: 'Boston' },
  'us-seattle':     { lat: 47.6062, lon: -122.3321,name: 'Seattle' },
  'us-neworleans':  { lat: 29.9511, lon: -90.0715, name: 'New Orleans' },
  'us-denver':      { lat: 39.7392, lon: -104.9903,name: 'Denver' },
  'us-nashville':   { lat: 36.1627, lon: -86.7816, name: 'Nashville' },

  // ── Canada ──────────────────────────────────────────────────────────────
  'ca-toronto':     { lat: 43.6532, lon: -79.3832, name: 'Toronto' },
  'ca-vancouver':   { lat: 49.2827, lon: -123.1207,name: 'Vancouver' },
  'ca-montreal':    { lat: 45.5017, lon: -73.5673, name: 'Montréal' },
  'ca-quebec':      { lat: 46.8139, lon: -71.2080, name: 'Québec' },
  'ca-banff':       { lat: 51.1784, lon: -115.5708,name: 'Banff' },

  // ── Mexique ─────────────────────────────────────────────────────────────
  'mx-mexicocity':  { lat: 19.4326, lon: -99.1332, name: 'Mexico' },
  'mx-cancun':      { lat: 21.1619, lon: -86.8515, name: 'Cancún' },
  'mx-tulum':       { lat: 20.2114, lon: -87.4654, name: 'Tulum' },
  'mx-merida':      { lat: 20.9674, lon: -89.5926, name: 'Mérida' },
  'mx-guadalajara': { lat: 20.6597, lon: -103.3496,name: 'Guadalajara' },
  'mx-oaxaca':      { lat: 17.0732, lon: -96.7266, name: 'Oaxaca' },

  // ── Brésil ──────────────────────────────────────────────────────────────
  'br-riodejaneiro':{ lat: -22.9068,lon: -43.1729, name: 'Rio de Janeiro' },
  'br-saopaulo':    { lat: -23.5505,lon: -46.6333, name: 'São Paulo' },
  'br-salvador':    { lat: -12.9714,lon: -38.5124, name: 'Salvador' },
  'br-florianopolis':{lat: -27.5954,lon: -48.5480, name: 'Florianópolis' },
  'br-manaus':      { lat: -3.1190, lon: -60.0217, name: 'Manaus' },

  // ── Argentine ───────────────────────────────────────────────────────────
  'ar-buenosaires': { lat: -34.6037,lon: -58.3816, name: 'Buenos Aires' },
  'ar-mendoza':     { lat: -32.8895,lon: -68.8458, name: 'Mendoza' },
  'ar-ushuaia':     { lat: -54.8019,lon: -68.3030, name: 'Ushuaïa' },
  'ar-bariloche':   { lat: -41.1335,lon: -71.3103, name: 'Bariloche' },
  'ar-iguazu':      { lat: -25.6953,lon: -54.4367, name: 'Iguazú' },

  // ── Pérou ───────────────────────────────────────────────────────────────
  'pe-lima':        { lat: -12.0464,lon: -77.0428, name: 'Lima' },
  'pe-cusco':       { lat: -13.5320,lon: -71.9675, name: 'Cusco' },
  'pe-machupicchu': { lat: -13.1631,lon: -72.5450, name: 'Machu Picchu' },

  // ── Colombie ────────────────────────────────────────────────────────────
  'co-bogota':      { lat: 4.7110,  lon: -74.0721, name: 'Bogotá' },
  'co-cartagena':   { lat: 10.3910, lon: -75.5364, name: 'Carthagène' },
  'co-medellin':    { lat: 6.2442,  lon: -75.5812, name: 'Medellín' },

  // ── Cuba ────────────────────────────────────────────────────────────────
  'cu-havana':      { lat: 23.1136, lon: -82.3666, name: 'La Havane' },
  'cu-varadero':    { lat: 23.1525, lon: -81.2498, name: 'Varadero' },

  // ── République Dominicaine ──────────────────────────────────────────────
  'do-puntacana':   { lat: 18.5609, lon: -68.3725, name: 'Punta Cana' },
  'do-santodomingo':{ lat: 18.4861, lon: -69.9312, name: 'Saint-Domingue' },

  // ── Costa Rica ──────────────────────────────────────────────────────────
  'cr-sanjose':     { lat: 9.9281,  lon: -84.0907, name: 'San José' },
  'cr-tamarindo':   { lat: 10.2993, lon: -85.8392, name: 'Tamarindo' },

  // ── Afrique du Sud ─────────────────────────────────────────────────────
  'za-capetown':    { lat: -33.9249,lon: 18.4241,  name: 'Le Cap' },
  'za-johannesburg':{ lat: -26.2041,lon: 28.0473,  name: 'Johannesburg' },
  'za-durban':      { lat: -29.8587,lon: 31.0218,  name: 'Durban' },

  // ── Kenya ───────────────────────────────────────────────────────────────
  'ke-nairobi':     { lat: -1.2921, lon: 36.8219,  name: 'Nairobi' },
  'ke-mombasa':     { lat: -4.0435, lon: 39.6682,  name: 'Mombasa' },
  'ke-masaimara':   { lat: -1.4833, lon: 35.0167,  name: 'Masai Mara' },

  // ── Tanzanie ────────────────────────────────────────────────────────────
  'tz-zanzibar':    { lat: -6.1659, lon: 39.1989,  name: 'Zanzibar' },
  'tz-arusha':      { lat: -3.3869, lon: 36.6830,  name: 'Arusha' },

  // ── Maroc (redondant avec capitales mais utile pour recherche directe) ──
  'ma-essaouira':   { lat: 31.5085, lon: -9.7595,  name: 'Essaouira' },
  'ma-chefchaouen': { lat: 35.1688, lon: -5.2636,  name: 'Chefchaouen' },

  // ── Sénégal ─────────────────────────────────────────────────────────────
  'sn-dakar':       { lat: 14.6928, lon: -17.4467, name: 'Dakar' },

  // ── Russie ──────────────────────────────────────────────────────────────
  'ru-moscow':      { lat: 55.7558, lon: 37.6173,  name: 'Moscou' },
  'ru-stpetersburg':{ lat: 59.9343, lon: 30.3351,  name: 'Saint-Pétersbourg' },
  'ru-vladivostok': { lat: 43.1155, lon: 131.8855, name: 'Vladivostok' },
  'ru-kazan':       { lat: 55.7887, lon: 49.1221,  name: 'Kazan' },

  // ── Géorgie ─────────────────────────────────────────────────────────────
  'ge-tbilisi':     { lat: 41.6938, lon: 44.8015,  name: 'Tbilissi' },
  'ge-batumi':      { lat: 41.6168, lon: 41.6337,  name: 'Batumi' },

  // ── Arménie ─────────────────────────────────────────────────────────────
  'am-yerevan':     { lat: 40.1833, lon: 44.5167,  name: 'Erevan' },

  // ── Azerbaïdjan ────────────────────────────────────────────────────────
  'az-baku':        { lat: 40.4093, lon: 49.8671,  name: 'Bakou' },

  // ── Ouzbékistan ────────────────────────────────────────────────────────
  'uz-tashkent':    { lat: 41.2995, lon: 69.2401,  name: 'Tachkent' },
  'uz-samarkand':   { lat: 39.6542, lon: 66.9597,  name: 'Samarcande' },
  'uz-bukhara':     { lat: 39.7747, lon: 64.4286,  name: 'Boukhara' },

  // ── Kazakhstan ──────────────────────────────────────────────────────────
  'kz-astana':      { lat: 51.1811, lon: 71.4460,  name: 'Astana' },
  'kz-almaty':      { lat: 43.2220, lon: 76.8512,  name: 'Almaty' },

  // ── Iran ────────────────────────────────────────────────────────────────
  'ir-tehran':      { lat: 35.6892, lon: 51.3890,  name: 'Téhéran' },
  'ir-isfahan':     { lat: 32.6546, lon: 51.6680,  name: 'Ispahan' },
  'ir-shiraz':      { lat: 29.5918, lon: 52.5837,  name: 'Chiraz' },

  // ── Hong Kong ──────────────────────────────────────────────────────────
  'hk-hongkong':    { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },

  // ── Taïwan ─────────────────────────────────────────────────────────────
  'tw-taipei':      { lat: 25.0330, lon: 121.5654, name: 'Taipei' },

  // ── Islande ─────────────────────────────────────────────────────────────
  'is-reykjavik':   { lat: 64.1355, lon: -21.8954, name: 'Reykjavik' },

  // ── Norvège ─────────────────────────────────────────────────────────────
  'no-oslo':        { lat: 59.9139, lon: 10.7522,  name: 'Oslo' },
  'no-bergen':      { lat: 60.3913, lon: 5.3221,   name: 'Bergen' },
  'no-tromso':      { lat: 69.6496, lon: 18.9560,  name: 'Tromsø' },

  // ── Suède ───────────────────────────────────────────────────────────────
  'se-stockholm':   { lat: 59.3293, lon: 18.0686,  name: 'Stockholm' },
  'se-gothenburg':  { lat: 57.7089, lon: 11.9746,  name: 'Göteborg' },

  // ── Finlande ────────────────────────────────────────────────────────────
  'fi-helsinki':    { lat: 60.1699, lon: 24.9384,  name: 'Helsinki' },
  'fi-rovaniemi':   { lat: 66.5039, lon: 25.7292,  name: 'Rovaniemi' },

  // ── Danemark ────────────────────────────────────────────────────────────
  'dk-copenhagen':  { lat: 55.6761, lon: 12.5683,  name: 'Copenhague' },

  // ── Hongrie ─────────────────────────────────────────────────────────────
  'hu-budapest':    { lat: 47.4979, lon: 19.0402,  name: 'Budapest' },

  // ── Tchéquie ────────────────────────────────────────────────────────────
  'cz-prague':      { lat: 50.0755, lon: 14.4378,  name: 'Prague' },

  // ── Pologne ─────────────────────────────────────────────────────────────
  'pl-warsaw':      { lat: 52.2297, lon: 21.0122,  name: 'Varsovie' },
  'pl-krakow':      { lat: 50.0647, lon: 19.9450,  name: 'Cracovie' },
  'pl-gdansk':      { lat: 54.3520, lon: 18.6466,  name: 'Gdańsk' },

  // ── Roumanie ────────────────────────────────────────────────────────────
  'ro-bucharest':   { lat: 44.4268, lon: 26.1025,  name: 'Bucarest' },
  'ro-cluj':        { lat: 46.7712, lon: 23.6236,  name: 'Cluj-Napoca' },
  'ro-brasov':      { lat: 45.6427, lon: 25.5887,  name: 'Brașov' },
  'ro-sighisoara':  { lat: 46.2196, lon: 24.7911,  name: 'Sighișoara' },

  // ── Bulgarie ────────────────────────────────────────────────────────────
  'bg-sofia':       { lat: 42.6977, lon: 23.3219,  name: 'Sofia' },
  'bg-plovdiv':     { lat: 42.6977, lon: 23.3219,  name: 'Plovdiv' },

  // ── Serbie ──────────────────────────────────────────────────────────────
  'rs-belgrade':    { lat: 44.7866, lon: 20.4489,  name: 'Belgrade' },

  // ── Monténégro ─────────────────────────────────────────────────────────
  'me-podgorica':   { lat: 42.4411, lon: 19.2636,  name: 'Podgorica' },
  'me-kotor':       { lat: 42.4246, lon: 18.7712,  name: 'Kotor' },
  'me-budva':       { lat: 42.2911, lon: 18.8403,  name: 'Budva' },

  // ── Albanie ─────────────────────────────────────────────────────────────
  'al-tirana':      { lat: 41.3275, lon: 19.8187,  name: 'Tirana' },
  'al-saranda':     { lat: 39.8764, lon: 20.0054,  name: 'Saranda' },

  // ── Slovénie ────────────────────────────────────────────────────────────
  'si-ljubljana':   { lat: 46.0569, lon: 14.5058,  name: 'Ljubljana' },
  'si-bled':        { lat: 46.3625, lon: 14.0940,  name: 'Bled' },

  // ── Bosnie ──────────────────────────────────────────────────────────────
  'ba-sarajevo':    { lat: 43.8563, lon: 18.4131,  name: 'Sarajevo' },
  'ba-mostar':      { lat: 43.3438, lon: 17.8078,  name: 'Mostar' },

  // ── Macédoine du Nord ──────────────────────────────────────────────────
  'mk-skopje':      { lat: 41.9973, lon: 21.4280,  name: 'Skopje' },
  'mk-ohrid':       { lat: 41.1172, lon: 20.8019,  name: 'Ohrid' },
};

// ─── Helper : rechercher les coords d'une ville ────────────────────────────
// 1. Cherche dans CITY_COORDS par "code pays + nom ville" (insensible cas)
// 2. Optionnel seulement : fallback capitale du pays via CAPITAL_COORDS
//
// Important météo roadtrip : par défaut, on NE fallback PAS sur la capitale ici.
// Sinon une ville absente de la base locale, ex. Casablanca avant ajout,
// récupère Rabat et toutes les étapes semblent avoir la même météo.

export const findCityCoords = (
  cityName: string,
  countryCode: string,
  fallbackToCapital = false,
): { lat: number; lon: number; name: string } | null => {
  const cc = countryCode.toUpperCase();
  const city = cityName.toLowerCase().trim();

  // 1. Recherche exacte : "jp-kyoto"
  const key = `${cc}-${city}`;
  const found = CITY_COORDS[key];
  if (found) return found;

  // 2. Recherche partielle : parcourir les clés du pays
  const prefix = `${cc}-`;
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (k.startsWith(prefix)) {
      // Comparer le nom de la ville (sans accents, sans espaces)
      const normalizedKey = k.replace(prefix, '').replace(/[-\s]/g, '');
      const normalizedCity = city.replace(/[-\s]/g, '');
      if (normalizedKey === normalizedCity) return v;
    }
  }

  // 3. Fallback capitale uniquement si explicitement demandé
  return fallbackToCapital ? (CAPITAL_COORDS[cc] ?? null) : null;
};
