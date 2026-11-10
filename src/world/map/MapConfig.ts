// src/world/map/MapConfig.ts
export type HighwayClass =
  | 'motorway'
  | 'motorway_link'
  | 'trunk'
  | 'trunk_link'
  | 'primary'
  | 'primary_link'
  | 'secondary'
  | 'secondary_link'
  | 'tertiary'
  | 'tertiary_link'
  | 'residential'
  | 'living_street'
  | 'unclassified'
  | 'service'
  | 'footway'
  | 'road'
  | string;

export type PoiCategory =
  | 'objective'
  | 'pickup'
  | 'dropoff'
  | 'person'
  | 'vehicle'
  | 'shop'
  | 'discovered'
  | 'collectible'
  | 'trouble'
  | 'police'
  | 'property'
  | 'your-property'
  | 'race'
  | 'sidestory';

export const DEFAULT_MAP_CENTER = {
  latitude: 12.3052,
  longitude: 76.6552,
  radius_meters: 1200,
};

export const METERS_PER_DEGREE_LAT = 110620;
export const METERS_PER_DEGREE_LON = 108580;

export interface RoadStyleSpec {
  width: number;
  hasSidewalk: boolean;
  sidewalkWidth: number;
  hasCenterLine: boolean;
  isMajor: boolean;
  elevationOffset: number;
}

export const HIGHWAY_SPECS: Record<string, RoadStyleSpec> = {
  motorway: { width: 14.0, hasSidewalk: false, sidewalkWidth: 0, hasCenterLine: true, isMajor: true, elevationOffset: 0.08 },
  trunk: { width: 13.0, hasSidewalk: true, sidewalkWidth: 2.2, hasCenterLine: true, isMajor: true, elevationOffset: 0.075 },
  primary: { width: 11.0, hasSidewalk: true, sidewalkWidth: 2.2, hasCenterLine: true, isMajor: true, elevationOffset: 0.07 },
  secondary: { width: 9.2, hasSidewalk: true, sidewalkWidth: 1.8, hasCenterLine: true, isMajor: true, elevationOffset: 0.065 },
  tertiary: { width: 7.6, hasSidewalk: true, sidewalkWidth: 1.6, hasCenterLine: true, isMajor: false, elevationOffset: 0.055 },
  residential: { width: 6.2, hasSidewalk: true, sidewalkWidth: 1.3, hasCenterLine: false, isMajor: false, elevationOffset: 0.045 },
  living_street: { width: 5.2, hasSidewalk: false, sidewalkWidth: 0, hasCenterLine: false, isMajor: false, elevationOffset: 0.04 },
  unclassified: { width: 5.8, hasSidewalk: false, sidewalkWidth: 0, hasCenterLine: false, isMajor: false, elevationOffset: 0.04 },
  service: { width: 4.2, hasSidewalk: false, sidewalkWidth: 0, hasCenterLine: false, isMajor: false, elevationOffset: 0.035 },
};

export function getHighwaySpec(highway: HighwayClass): RoadStyleSpec {
  const normalized = String(highway).replace('_link', '');
  return HIGHWAY_SPECS[normalized] ?? HIGHWAY_SPECS.residential;
}

export const MYSURU_SHOP_SIGNS = [
  { kan: 'ಗುರು ಸ್ವೀಟ್ ಮಾರ್ಟ್', eng: 'GURU SWEET MART · MYSORE PAK', bg: '#8c1d1d', fg: '#ffd966' },
  { kan: 'ವಿನಾಯಕ ಮೈಲಾರಿ ಹೋಟೆಲ್', eng: 'HOTEL VINAYAKA MYLARI · DOSA', bg: '#184e3b', fg: '#ffffff' },
  { kan: 'ಚಾಮುಂಡಿ ಕಾಫಿ ವರ್ಕ್ಸ್', eng: 'CHAMUNDI FILTER COFFEE WORKS', bg: '#213a6b', fg: '#f6c343' },
  { kan: 'ಮೈಸೂರು ಸಿಲ್ಕ್ ಉದ್ಯೋಗ', eng: 'CAUVERY SILK & SANDAL EMPORIUM', bg: '#5a1e48', fg: '#fce5cd' },
  { kan: 'ದೇವರಾಜ ಮೆಡಿಕಲ್ಸ್', eng: 'DEVARAJA MEDICALS & CLINIC', bg: '#155740', fg: '#e6f4ea' },
  { kan: 'ಶ್ರೀ ಕೃಷ್ಣ ಬೇಕರಿ', eng: 'SRI KRISHNA IYENGAR BAKERY', bg: '#993d00', fg: '#fff2cc' },
];