// src/api/countries.ts

// ─────────────────────────────────────────────────────────────────────────────
// TYPE UNIFIÉ
// ─────────────────────────────────────────────────────────────────────────────
export type CityEntry = {
  type: 'city' | 'country';
  city: string;
  country: string;
  countryCode: string;
  currency: string;
  capital?: string;
  lat: number;
  lon: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY META
// ─────────────────────────────────────────────────────────────────────────────
type CountryMeta = {
  currency: string;
  capital: string;
  nameEn: string;
};

const COUNTRY_META: Record<string, CountryMeta> = {
  AD: { currency: 'EUR', capital: 'Andorre-la-Vieille', nameEn: 'Andorra' },
  AE: { currency: 'AED', capital: 'Abou Dabi',          nameEn: 'United Arab Emirates' },
  AF: { currency: 'AFN', capital: 'Kaboul',             nameEn: 'Afghanistan' },
  AG: { currency: 'XCD', capital: "Saint-Jean's",       nameEn: 'Antigua and Barbuda' },
  AL: { currency: 'ALL', capital: 'Tirana',             nameEn: 'Albania' },
  AM: { currency: 'AMD', capital: 'Erevan',             nameEn: 'Armenia' },
  AO: { currency: 'AOA', capital: 'Luanda',             nameEn: 'Angola' },
  AR: { currency: 'ARS', capital: 'Buenos Aires',       nameEn: 'Argentina' },
  AT: { currency: 'EUR', capital: 'Vienne',             nameEn: 'Austria' },
  AU: { currency: 'AUD', capital: 'Canberra',           nameEn: 'Australia' },
  AZ: { currency: 'AZN', capital: 'Bakou',              nameEn: 'Azerbaijan' },
  BA: { currency: 'BAM', capital: 'Sarajevo',           nameEn: 'Bosnia and Herzegovina' },
  BB: { currency: 'BBD', capital: 'Bridgetown',         nameEn: 'Barbados' },
  BD: { currency: 'BDT', capital: 'Dacca',              nameEn: 'Bangladesh' },
  BE: { currency: 'EUR', capital: 'Bruxelles',          nameEn: 'Belgium' },
  BF: { currency: 'XOF', capital: 'Ouagadougou',        nameEn: 'Burkina Faso' },
  BG: { currency: 'BGN', capital: 'Sofia',              nameEn: 'Bulgaria' },
  BH: { currency: 'BHD', capital: 'Manama',             nameEn: 'Bahrain' },
  BI: { currency: 'BIF', capital: 'Bujumbura',          nameEn: 'Burundi' },
  BJ: { currency: 'XOF', capital: 'Porto-Novo',         nameEn: 'Benin' },
  BN: { currency: 'BND', capital: 'Bandar Seri Begawan',nameEn: 'Brunei' },
  BO: { currency: 'BOB', capital: 'Sucre',              nameEn: 'Bolivia' },
  BR: { currency: 'BRL', capital: 'Brasilia',           nameEn: 'Brazil' },
  BS: { currency: 'BSD', capital: 'Nassau',             nameEn: 'Bahamas' },
  BT: { currency: 'BTN', capital: 'Thimphou',           nameEn: 'Bhutan' },
  BW: { currency: 'BWP', capital: 'Gaborone',           nameEn: 'Botswana' },
  BY: { currency: 'BYR', capital: 'Minsk',              nameEn: 'Belarus' },
  BZ: { currency: 'BZD', capital: 'Belmopan',           nameEn: 'Belize' },
  CA: { currency: 'CAD', capital: 'Ottawa',             nameEn: 'Canada' },
  CD: { currency: 'CDF', capital: 'Kinshasa',           nameEn: 'Democratic Republic of the Congo' },
  CF: { currency: 'XAF', capital: 'Bangui',             nameEn: 'Central African Republic' },
  CG: { currency: 'XAF', capital: 'Brazzaville',        nameEn: 'Republic of the Congo' },
  CH: { currency: 'CHF', capital: 'Berne',              nameEn: 'Switzerland' },
  CI: { currency: 'XOF', capital: 'Yamoussoukro',       nameEn: 'Ivory Coast' },
  CL: { currency: 'CLP', capital: 'Santiago',           nameEn: 'Chile' },
  CM: { currency: 'XAF', capital: 'Yaoundé',            nameEn: 'Cameroon' },
  CN: { currency: 'CNY', capital: 'Pékin',              nameEn: 'China' },
  CO: { currency: 'COP', capital: 'Bogotá',             nameEn: 'Colombia' },
  CR: { currency: 'CRC', capital: 'San José',           nameEn: 'Costa Rica' },
  CU: { currency: 'CUP', capital: 'La Havane',          nameEn: 'Cuba' },
  CV: { currency: 'CVE', capital: 'Praia',              nameEn: 'Cape Verde' },
  CY: { currency: 'EUR', capital: 'Nicosie',            nameEn: 'Cyprus' },
  CZ: { currency: 'CZK', capital: 'Prague',             nameEn: 'Czech Republic' },
  DE: { currency: 'EUR', capital: 'Berlin',             nameEn: 'Germany' },
  DJ: { currency: 'DJF', capital: 'Djibouti',           nameEn: 'Djibouti' },
  DK: { currency: 'DKK', capital: 'Copenhague',         nameEn: 'Denmark' },
  DM: { currency: 'XCD', capital: 'Roseau',             nameEn: 'Dominica' },
  DO: { currency: 'DOP', capital: 'Saint-Domingue',     nameEn: 'Dominican Republic' },
  DZ: { currency: 'DZD', capital: 'Alger',              nameEn: 'Algeria' },
  EC: { currency: 'USD', capital: 'Quito',              nameEn: 'Ecuador' },
  EE: { currency: 'EUR', capital: 'Tallinn',            nameEn: 'Estonia' },
  EG: { currency: 'EGP', capital: 'Le Caire',           nameEn: 'Egypt' },
  ER: { currency: 'ERN', capital: 'Asmara',             nameEn: 'Eritrea' },
  ES: { currency: 'EUR', capital: 'Madrid',             nameEn: 'Spain' },
  ET: { currency: 'ETB', capital: 'Addis-Abeba',        nameEn: 'Ethiopia' },
  FI: { currency: 'EUR', capital: 'Helsinki',           nameEn: 'Finland' },
  FJ: { currency: 'FJD', capital: 'Suva',               nameEn: 'Fiji' },
  FR: { currency: 'EUR', capital: 'Paris',              nameEn: 'France' },
  GA: { currency: 'XAF', capital: 'Libreville',         nameEn: 'Gabon' },
  GB: { currency: 'GBP', capital: 'Londres',            nameEn: 'United Kingdom' },
  GD: { currency: 'XCD', capital: 'Saint-George',       nameEn: 'Grenada' },
  GE: { currency: 'GEL', capital: 'Tbilissi',           nameEn: 'Georgia' },
  GH: { currency: 'GHS', capital: 'Accra',              nameEn: 'Ghana' },
  GM: { currency: 'GMD', capital: 'Banjul',             nameEn: 'Gambia' },
  GN: { currency: 'GNF', capital: 'Conakry',            nameEn: 'Guinea' },
  GQ: { currency: 'XAF', capital: 'Malabo',             nameEn: 'Equatorial Guinea' },
  GR: { currency: 'EUR', capital: 'Athènes',            nameEn: 'Greece' },
  GT: { currency: 'GTQ', capital: 'Guatemala',          nameEn: 'Guatemala' },
  GW: { currency: 'XOF', capital: 'Bissau',             nameEn: 'Guinea-Bissau' },
  GY: { currency: 'GYD', capital: 'Georgetown',         nameEn: 'Guyana' },
  HK: { currency: 'HKD', capital: 'Hong Kong',          nameEn: 'Hong Kong' },
  HN: { currency: 'HNL', capital: 'Tegucigalpa',        nameEn: 'Honduras' },
  HR: { currency: 'EUR', capital: 'Zagreb',             nameEn: 'Croatia' },
  HT: { currency: 'HTG', capital: 'Port-au-Prince',     nameEn: 'Haiti' },
  HU: { currency: 'HUF', capital: 'Budapest',           nameEn: 'Hungary' },
  ID: { currency: 'IDR', capital: 'Jakarta',            nameEn: 'Indonesia' },
  IE: { currency: 'EUR', capital: 'Dublin',             nameEn: 'Ireland' },
  IL: { currency: 'ILS', capital: 'Jérusalem',          nameEn: 'Israel' },
  IN: { currency: 'INR', capital: 'New Delhi',          nameEn: 'India' },
  IQ: { currency: 'IQD', capital: 'Bagdad',             nameEn: 'Iraq' },
  IR: { currency: 'IRR', capital: 'Téhéran',            nameEn: 'Iran' },
  IS: { currency: 'ISK', capital: 'Reykjavik',          nameEn: 'Iceland' },
  IT: { currency: 'EUR', capital: 'Rome',               nameEn: 'Italy' },
  JM: { currency: 'JMD', capital: 'Kingston',           nameEn: 'Jamaica' },
  JO: { currency: 'JOD', capital: 'Amman',              nameEn: 'Jordan' },
  JP: { currency: 'JPY', capital: 'Tokyo',              nameEn: 'Japan' },
  KE: { currency: 'KES', capital: 'Nairobi',            nameEn: 'Kenya' },
  KG: { currency: 'KGS', capital: 'Bichkek',            nameEn: 'Kyrgyzstan' },
  KH: { currency: 'KHR', capital: 'Phnom Penh',         nameEn: 'Cambodia' },
  KI: { currency: 'AUD', capital: 'Tarawa',             nameEn: 'Kiribati' },
  KM: { currency: 'KMF', capital: 'Moroni',             nameEn: 'Comoros' },
  KN: { currency: 'XCD', capital: 'Basseterre',         nameEn: 'Saint Kitts and Nevis' },
  KP: { currency: 'KPW', capital: 'Pyongyang',          nameEn: 'North Korea' },
  KR: { currency: 'KRW', capital: 'Séoul',              nameEn: 'South Korea' },
  KW: { currency: 'KWD', capital: 'Koweït',             nameEn: 'Kuwait' },
  KZ: { currency: 'KZT', capital: 'Astana',             nameEn: 'Kazakhstan' },
  LA: { currency: 'LAK', capital: 'Vientiane',          nameEn: 'Laos' },
  LB: { currency: 'LBP', capital: 'Beyrouth',           nameEn: 'Lebanon' },
  LC: { currency: 'XCD', capital: 'Castries',           nameEn: 'Saint Lucia' },
  LI: { currency: 'CHF', capital: 'Vaduz',              nameEn: 'Liechtenstein' },
  LK: { currency: 'LKR', capital: 'Colombo',            nameEn: 'Sri Lanka' },
  LR: { currency: 'LRD', capital: 'Monrovia',           nameEn: 'Liberia' },
  LS: { currency: 'LSL', capital: 'Maseru',             nameEn: 'Lesotho' },
  LT: { currency: 'EUR', capital: 'Vilnius',            nameEn: 'Lithuania' },
  LU: { currency: 'EUR', capital: 'Luxembourg',         nameEn: 'Luxembourg' },
  LV: { currency: 'EUR', capital: 'Riga',               nameEn: 'Latvia' },
  LY: { currency: 'LYD', capital: 'Tripoli',            nameEn: 'Libya' },
  MA: { currency: 'MAD', capital: 'Rabat',              nameEn: 'Morocco' },
  MC: { currency: 'EUR', capital: 'Monaco',             nameEn: 'Monaco' },
  MD: { currency: 'MDL', capital: 'Chișinău',           nameEn: 'Moldova' },
  ME: { currency: 'EUR', capital: 'Podgorica',          nameEn: 'Montenegro' },
  MG: { currency: 'MGA', capital: 'Antananarivo',       nameEn: 'Madagascar' },
  MH: { currency: 'USD', capital: 'Majuro',             nameEn: 'Marshall Islands' },
  MK: { currency: 'MKD', capital: 'Skopje',             nameEn: 'North Macedonia' },
  ML: { currency: 'XOF', capital: 'Bamako',             nameEn: 'Mali' },
  MM: { currency: 'MMK', capital: 'Naypyidaw',          nameEn: 'Myanmar' },
  MN: { currency: 'MNT', capital: 'Oulan-Bator',        nameEn: 'Mongolia' },
  MR: { currency: 'MRU', capital: 'Nouakchott',         nameEn: 'Mauritania' },
  MT: { currency: 'EUR', capital: 'La Valette',         nameEn: 'Malta' },
  MU: { currency: 'MUR', capital: 'Port-Louis',         nameEn: 'Mauritius' },
  MV: { currency: 'MVR', capital: 'Malé',               nameEn: 'Maldives' },
  MW: { currency: 'MWK', capital: 'Lilongwe',           nameEn: 'Malawi' },
  MX: { currency: 'MXN', capital: 'Mexico',             nameEn: 'Mexico' },
  MY: { currency: 'MYR', capital: 'Kuala Lumpur',       nameEn: 'Malaysia' },
  MZ: { currency: 'MZN', capital: 'Maputo',             nameEn: 'Mozambique' },
  NA: { currency: 'NAD', capital: 'Windhoek',           nameEn: 'Namibia' },
  NE: { currency: 'XOF', capital: 'Niamey',             nameEn: 'Niger' },
  NG: { currency: 'NGN', capital: 'Abuja',              nameEn: 'Nigeria' },
  NI: { currency: 'NIO', capital: 'Managua',            nameEn: 'Nicaragua' },
  NL: { currency: 'EUR', capital: 'Amsterdam',          nameEn: 'Netherlands' },
  NO: { currency: 'NOK', capital: 'Oslo',               nameEn: 'Norway' },
  NP: { currency: 'NPR', capital: 'Katmandou',          nameEn: 'Nepal' },
  NR: { currency: 'AUD', capital: 'Yaren',              nameEn: 'Nauru' },
  NZ: { currency: 'NZD', capital: 'Wellington',         nameEn: 'New Zealand' },
  OM: { currency: 'OMR', capital: 'Mascate',            nameEn: 'Oman' },
  PA: { currency: 'PAB', capital: 'Panama',             nameEn: 'Panama' },
  PE: { currency: 'PEN', capital: 'Lima',               nameEn: 'Peru' },
  PF: { currency: 'XPF', capital: 'Papeete',            nameEn: 'French Polynesia' },
  PG: { currency: 'PGK', capital: 'Port Moresby',       nameEn: 'Papua New Guinea' },
  PH: { currency: 'PHP', capital: 'Manille',            nameEn: 'Philippines' },
  PK: { currency: 'PKR', capital: 'Islamabad',          nameEn: 'Pakistan' },
  PL: { currency: 'PLN', capital: 'Varsovie',           nameEn: 'Poland' },
  PT: { currency: 'EUR', capital: 'Lisbonne',           nameEn: 'Portugal' },
  PW: { currency: 'USD', capital: 'Ngerulmud',          nameEn: 'Palau' },
  PY: { currency: 'PYG', capital: 'Asunción',           nameEn: 'Paraguay' },
  QA: { currency: 'QAR', capital: 'Doha',               nameEn: 'Qatar' },
  RO: { currency: 'RON', capital: 'Bucarest',           nameEn: 'Romania' },
  RS: { currency: 'RSD', capital: 'Belgrade',           nameEn: 'Serbia' },
  RU: { currency: 'RUB', capital: 'Moscou',             nameEn: 'Russia' },
  RW: { currency: 'RWF', capital: 'Kigali',             nameEn: 'Rwanda' },
  SA: { currency: 'SAR', capital: 'Riyad',              nameEn: 'Saudi Arabia' },
  SB: { currency: 'SBD', capital: 'Honiara',            nameEn: 'Solomon Islands' },
  SC: { currency: 'SCR', capital: 'Victoria',           nameEn: 'Seychelles' },
  SD: { currency: 'SDG', capital: 'Khartoum',           nameEn: 'Sudan' },
  SE: { currency: 'SEK', capital: 'Stockholm',          nameEn: 'Sweden' },
  SG: { currency: 'SGD', capital: 'Singapour',          nameEn: 'Singapore' },
  SI: { currency: 'EUR', capital: 'Ljubljana',          nameEn: 'Slovenia' },
  SK: { currency: 'EUR', capital: 'Bratislava',         nameEn: 'Slovakia' },
  SL: { currency: 'SLL', capital: 'Freetown',           nameEn: 'Sierra Leone' },
  SM: { currency: 'EUR', capital: 'Saint-Marin',        nameEn: 'San Marino' },
  SN: { currency: 'XOF', capital: 'Dakar',              nameEn: 'Senegal' },
  SO: { currency: 'SOS', capital: 'Mogadiscio',         nameEn: 'Somalia' },
  SR: { currency: 'SRD', capital: 'Paramaribo',         nameEn: 'Suriname' },
  ST: { currency: 'STN', capital: 'São Tomé',           nameEn: 'Sao Tome and Principe' },
  SV: { currency: 'USD', capital: 'San Salvador',       nameEn: 'El Salvador' },
  SY: { currency: 'SYP', capital: 'Damas',              nameEn: 'Syria' },
  SZ: { currency: 'SZL', capital: 'Mbabane',            nameEn: 'Eswatini' },
  TD: { currency: 'XAF', capital: "N'Djamena",          nameEn: 'Chad' },
  TG: { currency: 'XOF', capital: 'Lomé',               nameEn: 'Togo' },
  TH: { currency: 'THB', capital: 'Bangkok',            nameEn: 'Thailand' },
  TJ: { currency: 'TJS', capital: 'Douchanbé',          nameEn: 'Tajikistan' },
  TL: { currency: 'USD', capital: 'Dili',               nameEn: 'East Timor' },
  TM: { currency: 'TMT', capital: 'Achgabat',           nameEn: 'Turkmenistan' },
  TN: { currency: 'TND', capital: 'Tunis',              nameEn: 'Tunisia' },
  TO: { currency: 'TOP', capital: "Nuku'alofa",         nameEn: 'Tonga' },
  TR: { currency: 'TRY', capital: 'Ankara',             nameEn: 'Turkey' },
  TT: { currency: 'TTD', capital: 'Port of Spain',      nameEn: 'Trinidad and Tobago' },
  TV: { currency: 'AUD', capital: 'Funafuti',           nameEn: 'Tuvalu' },
  TZ: { currency: 'TZS', capital: 'Dodoma',             nameEn: 'Tanzania' },
  UA: { currency: 'UAH', capital: 'Kyiv',               nameEn: 'Ukraine' },
  UG: { currency: 'UGX', capital: 'Kampala',            nameEn: 'Uganda' },
  US: { currency: 'USD', capital: 'Washington',         nameEn: 'United States' },
  UY: { currency: 'UYU', capital: 'Montevideo',         nameEn: 'Uruguay' },
  UZ: { currency: 'UZS', capital: 'Tachkent',           nameEn: 'Uzbekistan' },
  VA: { currency: 'EUR', capital: 'Vatican',            nameEn: 'Vatican City' },
  VC: { currency: 'XCD', capital: 'Kingstown',          nameEn: 'Saint Vincent and the Grenadines' },
  VE: { currency: 'VES', capital: 'Caracas',            nameEn: 'Venezuela' },
  VN: { currency: 'VND', capital: 'Hanoï',              nameEn: 'Vietnam' },
  VU: { currency: 'VUV', capital: 'Port-Vila',          nameEn: 'Vanuatu' },
  WS: { currency: 'WST', capital: 'Apia',               nameEn: 'Samoa' },
  YE: { currency: 'YER', capital: 'Sanaa',              nameEn: 'Yemen' },
  ZA: { currency: 'ZAR', capital: 'Pretoria',           nameEn: 'South Africa' },
  ZM: { currency: 'ZMW', capital: 'Lusaka',             nameEn: 'Zambia' },
  ZW: { currency: 'ZWL', capital: 'Harare',             nameEn: 'Zimbabwe' },
};

export const getCountryMeta   = (code: string): CountryMeta | null =>
  COUNTRY_META[code] ?? null;

export const getCountryNameEn = (code: string): string =>
  COUNTRY_META[code]?.nameEn ?? code;

// ─────────────────────────────────────────────────────────────────────────────
// NOMS DE PAYS EN FRANÇAIS
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRY_NAMES_FR: Record<string, string> = {
  AD: 'Andorre',              AE: 'Émirats arabes unis',  AF: 'Afghanistan',
  AG: 'Antigua-et-Barbuda',   AL: 'Albanie',              AM: 'Arménie',
  AO: 'Angola',               AR: 'Argentine',            AT: 'Autriche',
  AU: 'Australie',            AZ: 'Azerbaïdjan',          BA: 'Bosnie-Herzégovine',
  BB: 'Barbade',              BD: 'Bangladesh',           BE: 'Belgique',
  BF: 'Burkina Faso',         BG: 'Bulgarie',             BH: 'Bahreïn',
  BI: 'Burundi',              BJ: 'Bénin',                BN: 'Brunei',
  BO: 'Bolivie',              BR: 'Brésil',               BS: 'Bahamas',
  BT: 'Bhoutan',              BW: 'Botswana',             BY: 'Biélorussie',
  BZ: 'Belize',               CA: 'Canada',               CD: 'Congo (RDC)',
  CF: 'Centrafrique',         CG: 'Congo',                CH: 'Suisse',
  CI: "Côte d'Ivoire",        CL: 'Chili',                CM: 'Cameroun',
  CN: 'Chine',                CO: 'Colombie',             CR: 'Costa Rica',
  CU: 'Cuba',                 CV: 'Cap-Vert',             CY: 'Chypre',
  CZ: 'Tchéquie',             DE: 'Allemagne',            DJ: 'Djibouti',
  DK: 'Danemark',             DM: 'Dominique',            DO: 'République dominicaine',
  DZ: 'Algérie',              EC: 'Équateur',             EE: 'Estonie',
  EG: 'Égypte',               ER: 'Érythrée',             ES: 'Espagne',
  ET: 'Éthiopie',             FI: 'Finlande',             FJ: 'Fidji',
  FR: 'France',               GA: 'Gabon',                GB: 'Royaume-Uni',
  GD: 'Grenade',              GE: 'Géorgie',              GH: 'Ghana',
  GM: 'Gambie',               GN: 'Guinée',               GQ: 'Guinée équatoriale',
  GR: 'Grèce',                GT: 'Guatemala',            GW: 'Guinée-Bissau',
  GY: 'Guyana',               HK: 'Hong Kong',            HN: 'Honduras',
  HR: 'Croatie',              HT: 'Haïti',                HU: 'Hongrie',
  ID: 'Indonésie',            IE: 'Irlande',              IL: 'Israël',
  IN: 'Inde',                 IQ: 'Irak',                 IR: 'Iran',
  IS: 'Islande',              IT: 'Italie',               JM: 'Jamaïque',
  JO: 'Jordanie',             JP: 'Japon',                KE: 'Kenya',
  KG: 'Kirghizistan',         KH: 'Cambodge',             KI: 'Kiribati',
  KM: 'Comores',              KN: 'Saint-Kitts-et-Nevis', KP: 'Corée du Nord',
  KR: 'Corée du Sud',         KW: 'Koweït',               KZ: 'Kazakhstan',
  LA: 'Laos',                 LB: 'Liban',                LC: 'Sainte-Lucie',
  LI: 'Liechtenstein',        LK: 'Sri Lanka',            LR: 'Liberia',
  LS: 'Lesotho',              LT: 'Lituanie',             LU: 'Luxembourg',
  LV: 'Lettonie',             LY: 'Libye',                MA: 'Maroc',
  MC: 'Monaco',               MD: 'Moldavie',             ME: 'Monténégro',
  MG: 'Madagascar',           MH: 'Îles Marshall',        MK: 'Macédoine du Nord',
  ML: 'Mali',                 MM: 'Myanmar',              MN: 'Mongolie',
  MR: 'Mauritanie',           MT: 'Malte',                MU: 'Maurice',
  MV: 'Maldives',             MW: 'Malawi',               MX: 'Mexique',
  MY: 'Malaisie',             MZ: 'Mozambique',           NA: 'Namibie',
  NE: 'Niger',                NG: 'Nigeria',              NI: 'Nicaragua',
  NL: 'Pays-Bas',             NO: 'Norvège',              NP: 'Népal',
  NR: 'Nauru',                NZ: 'Nouvelle-Zélande',     OM: 'Oman',
  PA: 'Panama',               PE: 'Pérou',                PF: 'Polynésie française',
  PG: 'Papouasie-Nouvelle-Guinée', PH: 'Philippines',    PK: 'Pakistan',
  PL: 'Pologne',              PT: 'Portugal',             PW: 'Palaos',
  PY: 'Paraguay',             QA: 'Qatar',                RO: 'Roumanie',
  RS: 'Serbie',               RU: 'Russie',               RW: 'Rwanda',
  SA: 'Arabie saoudite',      SB: 'Îles Salomon',         SC: 'Seychelles',
  SD: 'Soudan',               SE: 'Suède',                SG: 'Singapour',
  SI: 'Slovénie',             SK: 'Slovaquie',            SL: 'Sierra Leone',
  SM: 'Saint-Marin',          SN: 'Sénégal',              SO: 'Somalie',
  SR: 'Suriname',             ST: 'São Tomé-et-Príncipe', SV: 'Salvador',
  SY: 'Syrie',                SZ: 'Eswatini',             TD: 'Tchad',
  TG: 'Togo',                 TH: 'Thaïlande',            TJ: 'Tadjikistan',
  TL: 'Timor oriental',       TM: 'Turkménistan',         TN: 'Tunisie',
  TO: 'Tonga',                TR: 'Turquie',              TT: 'Trinité-et-Tobago',
  TV: 'Tuvalu',               TZ: 'Tanzanie',             UA: 'Ukraine',
  UG: 'Ouganda',              US: 'États-Unis',           UY: 'Uruguay',
  UZ: 'Ouzbékistan',          VA: 'Vatican',              VC: 'Saint-Vincent-et-les-Grenadines',
  VE: 'Venezuela',            VN: 'Vietnam',              VU: 'Vanuatu',
  WS: 'Samoa',                YE: 'Yémen',                ZA: 'Afrique du Sud',
  ZM: 'Zambie',               ZW: 'Zimbabwe',
};

export const getCountryNameFr = (code: string): string =>
  COUNTRY_NAMES_FR[code] ?? code;

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCIES
// ─────────────────────────────────────────────────────────────────────────────
export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'EUR', name: 'Euro',                      symbol: '€'   },
  { code: 'USD', name: 'Dollar américain',          symbol: '$'   },
  { code: 'GBP', name: 'Livre sterling',            symbol: '£'   },
  { code: 'JPY', name: 'Yen japonais',              symbol: '¥'   },
  { code: 'CHF', name: 'Franc suisse',              symbol: 'CHF' },
  { code: 'CAD', name: 'Dollar canadien',           symbol: 'CA$' },
  { code: 'AUD', name: 'Dollar australien',         symbol: 'AU$' },
  { code: 'NZD', name: 'Dollar néo-zélandais',      symbol: 'NZ$' },
  { code: 'CNY', name: 'Yuan chinois',              symbol: '¥'   },
  { code: 'KRW', name: 'Won sud-coréen',            symbol: '₩'   },
  { code: 'THB', name: 'Baht thaïlandais',          symbol: '฿'   },
  { code: 'IDR', name: 'Roupie indonésienne',       symbol: 'Rp'  },
  { code: 'SGD', name: 'Dollar de Singapour',       symbol: 'S$'  },
  { code: 'HKD', name: 'Dollar de Hong Kong',       symbol: 'HK$' },
  { code: 'VND', name: 'Dong vietnamien',           symbol: '₫'   },
  { code: 'AED', name: 'Dirham émirati',            symbol: 'AED' },
  { code: 'TRY', name: 'Livre turque',              symbol: '₺'   },
  { code: 'MAD', name: 'Dirham marocain',           symbol: 'MAD' },
  { code: 'EGP', name: 'Livre égyptienne',          symbol: 'E£'  },
  { code: 'MXN', name: 'Peso mexicain',             symbol: 'MX$' },
  { code: 'BRL', name: 'Real brésilien',            symbol: 'R$'  },
  { code: 'ARS', name: 'Peso argentin',             symbol: 'AR$' },
  { code: 'PEN', name: 'Sol péruvien',              symbol: 'S/'  },
  { code: 'CLP', name: 'Peso chilien',              symbol: 'CL$' },
  { code: 'COP', name: 'Peso colombien',            symbol: 'COL$'},
  { code: 'ZAR', name: 'Rand sud-africain',         symbol: 'R'   },
  { code: 'KES', name: 'Shilling kényan',           symbol: 'KSh' },
  { code: 'TZS', name: 'Shilling tanzanien',        symbol: 'TSh' },
  { code: 'DKK', name: 'Couronne danoise',          symbol: 'kr'  },
  { code: 'SEK', name: 'Couronne suédoise',         symbol: 'kr'  },
  { code: 'NOK', name: 'Couronne norvégienne',      symbol: 'kr'  },
  { code: 'ISK', name: 'Couronne islandaise',       symbol: 'kr'  },
  { code: 'CZK', name: 'Couronne tchèque',          symbol: 'Kč'  },
  { code: 'HUF', name: 'Forint hongrois',           symbol: 'Ft'  },
  { code: 'PLN', name: 'Zloty polonais',            symbol: 'zł'  },
  { code: 'RON', name: 'Leu roumain',               symbol: 'lei' },
  { code: 'INR', name: 'Roupie indienne',           symbol: '₹'   },
  { code: 'NPR', name: 'Roupie népalaise',          symbol: 'रू'  },
  { code: 'QAR', name: 'Riyal qatari',              symbol: 'QR'  },
  { code: 'SAR', name: 'Riyal saoudien',            symbol: 'SAR' },
  { code: 'ILS', name: 'Shekel israélien',          symbol: '₪'   },
  { code: 'GEL', name: 'Lari géorgien',             symbol: '₾'   },
  { code: 'UAH', name: 'Hryvnia ukrainienne',       symbol: '₴'   },
  { code: 'XOF', name: 'Franc CFA (UEMOA)',         symbol: 'CFA' },
  { code: 'XAF', name: 'Franc CFA (CEMAC)',         symbol: 'CFA' },
  { code: 'XPF', name: 'Franc CFP',                 symbol: 'XPF' },
  { code: 'TND', name: 'Dinar tunisien',            symbol: 'DT'  },
  { code: 'DZD', name: 'Dinar algérien',            symbol: 'DA'  },
  { code: 'GHS', name: 'Cedi ghanéen',              symbol: 'GH₵' },
  { code: 'MYR', name: 'Ringgit malaisien',         symbol: 'RM'  },
  { code: 'PHP', name: 'Peso philippin',            symbol: '₱'   },
  { code: 'PKR', name: 'Roupie pakistanaise',       symbol: '₨'   },
  { code: 'BDT', name: 'Taka bangladais',           symbol: '৳'   },
  { code: 'LKR', name: 'Roupie sri-lankaise',       symbol: 'Rs'  },
  { code: 'NGN', name: 'Naira nigérian',            symbol: '₦'   },
  { code: 'GNF', name: 'Franc guinéen',             symbol: 'FG'  },
  { code: 'RUB', name: 'Rouble russe',              symbol: '₽'   },
  { code: 'CUP', name: 'Peso cubain',               symbol: '₱'   },
  { code: 'CRC', name: 'Colón costaricain',         symbol: '₡'   },
  { code: 'UYU', name: 'Peso uruguayen',            symbol: '$U'  },
  { code: 'BOB', name: 'Boliviano',                 symbol: 'Bs'  },
  { code: 'PYG', name: 'Guarani paraguayen',        symbol: '₲'   },
  { code: 'KZT', name: 'Tenge kazakh',              symbol: '₸'   },
  { code: 'UZS', name: 'Sum ouzbek',                symbol: "soʻm"},
  { code: 'AMD', name: 'Dram arménien',             symbol: '֏'   },
  { code: 'AZN', name: 'Manat azerbaïdjanais',      symbol: '₼'   },
  { code: 'BYR', name: 'Rouble biélorusse',         symbol: 'Br'  },
  { code: 'RSD', name: 'Dinar serbe',               symbol: 'RSD' },
  { code: 'MKD', name: 'Denar macédonien',          symbol: 'ден' },
  { code: 'BGN', name: 'Lev bulgare',               symbol: 'лв'  },
  { code: 'HRK', name: 'Kuna croate',               symbol: 'kn'  },
];

export const findCurrency = (code: string) =>
  CURRENCIES.find((c) => c.code === code);

// ─────────────────────────────────────────────────────────────────────────────
// PHOTON (OSM) — types
// ─────────────────────────────────────────────────────────────────────────────
type PhotonProperties = {
  osm_key: string;
  osm_value: string;
  type: string;
  name: string;
  country?: string;
  countrycode?: string;
  state?: string;
  county?: string;
};

type PhotonFeature = {
  type: 'Feature';
  properties: PhotonProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

type PhotonResponse = {
  type: 'FeatureCollection';
  features: PhotonFeature[];
};

// Types OSM acceptés comme vraie destination.
// On évite volontairement `hamlet`, `locality`, `residential`, `suburb` :
// Photon renvoie parfois des lieux minuscules nommés comme un pays
// ex. “Maroc” en France/Brésil/Tchad, ce qui casse la crédibilité.
const ACCEPTED_CITY_TYPES = new Set([
  'city', 'town', 'village', 'island',
]);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const countrySearchScore = (query: string, code: string, nameFr: string): number => {
  const nq = norm(query);
  const fr = norm(nameFr);
  const en = norm(COUNTRY_META[code]?.nameEn ?? '');
  if (fr === nq || en === nq || code.toLowerCase() === nq) return 0;
  if (fr.startsWith(nq) || en.startsWith(nq)) return 1;
  if (fr.includes(nq) || en.includes(nq)) return 2;
  return 99;
};

const isExactCountryQuery = (query: string): boolean =>
  Object.entries(COUNTRY_NAMES_FR).some(([code, name]) => countrySearchScore(query, code, name) === 0);

const cityNameMatchesQuery = (cityName: string, query: string): boolean => {
  const city = norm(cityName);
  const q = norm(query);
  return city === q || city.startsWith(q);
};

const dedup = (entries: CityEntry[]): CityEntry[] => {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${norm(e.city)}-${e.countryCode}-${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// searchCountriesOffline
// ─────────────────────────────────────────────────────────────────────────────
const searchCountriesOffline = (query: string, limit = 2): CityEntry[] => {
  return Object.entries(COUNTRY_NAMES_FR)
    .map(([code, name]) => ({ code, name, score: countrySearchScore(query, code, name) }))
    .filter((item) => item.score < 99)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit)
    .map(({ code, name }) => {
      const meta = COUNTRY_META[code];
      return {
        type:        'country' as const,
        city:        name,
        country:     name,
        countryCode: code,
        currency:    meta?.currency ?? 'USD',
        capital:     meta?.capital,
        lat:         0,
        lon:         0,
      };
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// searchAll — point d'entrée principal
// ─────────────────────────────────────────────────────────────────────────────
export const searchAll = async (
  query: string,
  signal?: AbortSignal,
  limit = 6,
): Promise<CityEntry[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1. Pays offline — si la recherche correspond exactement à un pays,
  // on ne mélange pas avec des hameaux/villes homonymes ailleurs.
  const countryMatches = searchCountriesOffline(q, 3);
  const exactCountry = isExactCountryQuery(q);
  if (exactCountry && countryMatches.length > 0) {
    return dedup(countryMatches).slice(0, limit);
  }

  // 2. Villes via Photon
  let cityMatches: CityEntry[] = [];
  try {
    const url =
      `https://photon.komoot.io/api/` +
      `?q=${encodeURIComponent(q)}` +
      `&limit=10` +
      `&lang=fr`;

    const res = await fetch(url, { signal });

    if (res.ok) {
      const data: PhotonResponse = await res.json();

      cityMatches = data.features
        .filter(
          (f) =>
            ACCEPTED_CITY_TYPES.has(f.properties.type) &&
            !!f.properties.name &&
            cityNameMatchesQuery(f.properties.name, q) &&
            !!f.properties.countrycode &&
            f.properties.countrycode.length === 2,
        )
        .map((f) => {
          const code = f.properties.countrycode!.toUpperCase();
          const meta = COUNTRY_META[code];
          const [lon, lat] = f.geometry.coordinates;
          return {
            type:        'city' as const,
            city:        f.properties.name,
            country:     COUNTRY_NAMES_FR[code] ?? f.properties.country ?? code,
            countryCode: code,
            currency:    meta?.currency ?? 'USD',
            capital:     meta?.capital,
            lat,
            lon,
          };
        });
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.warn('[searchAll] Photon error — offline only:', err);
    } else {
      throw err;
    }
  }

  // 3. Filtrage doublons pays/ville
  const countryCodesOffline = new Set(countryMatches.map((c) => c.countryCode));
  const filteredCities = cityMatches.filter((c) => {
    const isCountryName =
      norm(c.city) === norm(c.country) &&
      countryCodesOffline.has(c.countryCode);
    return !isCountryName;
  });

  // 4. Assemblage — les pays crédibles d'abord, puis les vraies villes.
  const combined = [
    ...countryMatches.slice(0, 2),
    ...filteredCities.slice(0, 4),
  ];

  return dedup(combined).slice(0, limit);
};
