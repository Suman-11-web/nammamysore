// src/world/map/MapTypes.ts

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

export interface MapCenter {
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface RawRoadRecord {
  id?: string | number;
  name?: string;
  highway?: HighwayClass;
  coords: [number, number][];
}

export interface RawBuildingRecord {
  id?: string | number;
  name?: string;
  building?: string;
  height?: number;
  levels?: number;
   'building:levels'?: number | string;
  ring: [number, number][];
}

export interface RawMysuruMapJson {
  center?: MapCenter;
  roads?: RawRoadRecord[];
  buildings?: RawBuildingRecord[];
}

export interface NormalizedRoad {
  id: string;
  name: string;
  highway: HighwayClass;
  width: number;
  hasSidewalk: boolean;
  hasCenterLine: boolean;
  isMajor: boolean;
  points: [number, number][]; // [Easting X (m), Northing Z (m)]
}

export interface NormalizedBuilding {
  id: string;
  name: string;
  category: 'commercial' | 'residential' | 'heritage' | 'civic';
  height: number;
  heightSource: 'measured' | 'levels' | 'estimated';
  levels: number;
  ring: [number, number][]; // Counter-clockwise metric footprint [X, Z]
  centroid: [number, number];
}

export interface LoadedMysuruMap {
  center: MapCenter;
  sourceLabel: 'MYSURU-MAP.JSON (OSMNX)' | 'OSM GEOJSON + SYNTHESIZED FOOTPRINTS';
  roads: NormalizedRoad[];
  buildings: NormalizedBuilding[];
  spawnPoint: [number, number];
  scooterSpawnPoint: [number, number];
}