// src/world/map/MapLoader.ts
import {
  DEFAULT_MAP_CENTER,
  METERS_PER_DEGREE_LAT,
  METERS_PER_DEGREE_LON,
  getHighwaySpec,
} from './MapConfig';
import type {
  LoadedMysuruMap,
  NormalizedBuilding,
  NormalizedRoad,
  RawMysuruMapJson,
} from './MapTypes';

function parseLevels(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function computeRingCentroid(ring: [number, number][]): [number, number] {
  if (!ring.length) return [0, 0];
  let sx = 0;
  let sz = 0;
  const count =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  for (let i = 0; i < count; i++) {
    sx += ring[i][0];
    sz += ring[i][1];
  }
  return [sx / Math.max(1, count), sz / Math.max(1, count)];
}

/**
 * Ensures every active corridor road in Zone 1 (Aramane Gate <-> K.R. Circle <-> Devaraja Market)
 * is lined with dense Indian commercial storefronts, local stores, and malls where OSM data has gaps.
 */
function populateDenseMysuruStorefronts(
  roads: NormalizedRoad[],
  existingBuildings: NormalizedBuilding[]
): NormalizedBuilding[] {
  const result = [...existingBuildings];
  const occupied = new Set<string>();
  const cellKey = (x: number, z: number) => `${Math.round(x / 14)},${Math.round(z / 14)}`;

  for (const b of existingBuildings) {
    occupied.add(cellKey(b.centroid[0], b.centroid[1]));
  }
  for (const r of roads) {
    for (const [rx, rz] of r.points) {
      occupied.add(cellKey(rx, rz));
    }
  }

  let synthId = 0;
  for (const road of roads) {
    if (road.points.length < 2) continue;

    for (let i = 0; i < road.points.length - 1; i++) {
      const [ax, az] = road.points[i];
      const [bx, bz] = road.points[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 16) continue;

      const dirX = (bx - ax) / segLen;
      const dirZ = (bz - az) / segLen;
      const normX = -dirZ;
      const normZ = dirX;

      for (let d = 10; d < segLen - 10; d += 16) {
        const midX = ax + dirX * d;
        const midZ = az + dirZ * d;

        for (const side of [-1, 1]) {
          const setback = road.width / 2 + 10.5;
          const cx = midX + normX * side * setback;
          const cz = midZ + normZ * side * setback;

          // Keep the immediate Aramane royal courtyard clear
          if (Math.hypot(cx, cz + 70) < 95) continue;

          const key = cellKey(cx, cz);
          if (occupied.has(key)) continue;
          occupied.add(key);

          const isMall = synthId % 9 === 0;
          const halfW = isMall ? 11.5 : 6.8 + (synthId % 3);
          const halfD = isMall ? 10.0 : 6.5 + (synthId % 3);

          const c0: [number, number] = [cx - dirX * halfW - normX * halfD, cz - dirZ * halfW - normZ * halfD];
          const c1: [number, number] = [cx + dirX * halfW - normX * halfD, cz + dirZ * halfW - normZ * halfD];
          const c2: [number, number] = [cx + dirX * halfW + normX * halfD, cz + dirZ * halfW + normZ * halfD];
          const c3: [number, number] = [cx - dirX * halfW + normX * halfD, cz - dirZ * halfW + normZ * halfD];

          const levels = isMall ? 4 : 2 + (synthId % 3);
          const height = levels * 3.6;

          result.push({
            id: `mysuru-store-${synthId++}`,
            name: isMall ? 'Garuda / Forum Mysuru Mall' : 'Sayyaji Rao Rd Store',
            category: 'commercial',
            height,
            heightSource: 'estimated',
            levels,
            ring: [c0, c1, c2, c3, c0],
            centroid: [cx, cz],
          });
        }
      }
    }
  }

  return result;
}

export async function loadRealMysuruMap(
  onProgress?: (percent: number, stageText: string) => void
): Promise<LoadedMysuruMap> {
  onProgress?.(15, 'Loading Zone 1: Mysuru Aramane & Sayyaji Rao Road...');

  // Core Zone 1 Avenue connecting Aramane North Gate (0, -20) -> K.R. Circle (0, 90) -> Devaraja Market (0, 240)
  const coreBoulevard: NormalizedRoad = {
    id: 'sayyaji-rao-main-avenue',
    name: 'Sayyaji Rao Road',
    highway: 'primary',
    width: 14,
    hasSidewalk: true,
    hasCenterLine: true,
    isMajor: true,
    points: [
      [0, -10],
      [0, 50],
      [0, 110],
      [0, 180],
      [0, 260],
    ],
  };

  try {
    const res = await fetch('/data/mysuru-map.json', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const raw = (await res.json()) as RawMysuruMapJson;
      if (raw && Array.isArray(raw.roads) && raw.roads.length > 0) {
        onProgress?.(40, 'Aligning real Mysuru road network & building footprints...');
        const center = raw.center ?? DEFAULT_MAP_CENTER;
        const roads: NormalizedRoad[] = [coreBoulevard];

        raw.roads.forEach((r, idx) => {
          if (!Array.isArray(r.coords) || r.coords.length < 2) return;
          const validCoords = r.coords.filter(
            (pt): pt is [number, number] =>
              Array.isArray(pt) && pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
          );
          if (validCoords.length < 2) return;
          const highway = r.highway ?? 'residential';
          const spec = getHighwaySpec(highway);
          roads.push({
            id: String(r.id ?? `road-${idx}`),
            name: r.name ?? '',
            highway,
            width: spec.width,
            hasSidewalk: spec.hasSidewalk,
            hasCenterLine: spec.hasCenterLine,
            isMajor: spec.isMajor,
            points: validCoords,
          });
        });

        const buildings: NormalizedBuilding[] = [];
        (raw.buildings ?? []).forEach((b, idx) => {
          if (!Array.isArray(b.ring) || b.ring.length < 3) return;
          const validRing = b.ring.filter(
            (pt): pt is [number, number] =>
              Array.isArray(pt) && pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
          );
          if (validRing.length < 3) return;
          const parsedLevels = parseLevels(b.levels ?? b['building:levels']);
          const hasMeasuredHeight = typeof b.height === 'number' && Number.isFinite(b.height) && b.height > 2;
          const height = hasMeasuredHeight
            ? b.height!
            : parsedLevels
              ? parsedLevels * 3.5
              : 7.2 + ((idx * 3) % 8);

          buildings.push({
            id: String(b.id ?? `bldg-${idx}`),
            name: b.name ?? '',
            category: 'commercial',
            height,
            heightSource: hasMeasuredHeight ? 'measured' : parsedLevels ? 'levels' : 'estimated',
            levels: parsedLevels ?? Math.max(2, Math.round(height / 3.5)),
            ring: validRing,
            centroid: computeRingCentroid(validRing),
          });
        });

        // Always populate dense storefronts along unmapped road gaps so streets never look empty
        const fullBuildings = populateDenseMysuruStorefronts(roads.slice(0, 120), buildings);

        return {
          center,
          sourceLabel: 'MYSURU-MAP.JSON (OSMNX)',
          roads,
          buildings: fullBuildings,
          // Spawn on Sayyaji Rao Road facing Mysuru Aramane & traffic!
          spawnPoint: [-2.8, 125],
          scooterSpawnPoint: [-2.8, 110],
        };
      }
    }
  } catch {
    /* Fallback to GeoJSON */
  }

  const geoRes = await fetch('/data/mysuru-roads.geojson');
  const geoData = (await geoRes.json()) as {
    features?: Array<{
      id?: string | number;
      properties?: { name?: string; road_class?: string };
      geometry?: { type?: string; coordinates?: number[][] };
    }>;
  };

  const center = DEFAULT_MAP_CENTER;
  const roads: NormalizedRoad[] = [coreBoulevard];
  (geoData.features ?? []).forEach((feat, idx) => {
    if (feat.geometry?.type !== 'LineString' || !Array.isArray(feat.geometry.coordinates)) return;
    const metricPts: [number, number][] = [];
    for (const [lon, lat] of feat.geometry.coordinates) {
      const eastingX = (lon - center.longitude) * METERS_PER_DEGREE_LON;
      const northingZ = (lat - center.latitude) * METERS_PER_DEGREE_LAT;
      metricPts.push([eastingX, northingZ]);
    }
    if (metricPts.length < 2 || Math.hypot(metricPts[0][0], metricPts[0][1]) > 1200) return;
    const highway = feat.properties?.road_class ?? 'residential';
    const spec = getHighwaySpec(highway);
    roads.push({
      id: String(feat.id ?? `osm-${idx}`),
      name: feat.properties?.name ?? '',
      highway,
      width: spec.width,
      hasSidewalk: spec.hasSidewalk,
      hasCenterLine: spec.hasCenterLine,
      isMajor: spec.isMajor,
      points: metricPts,
    });
  });

  const buildings = populateDenseMysuruStorefronts(roads.slice(0, 100), []);
  return {
    center,
    sourceLabel: 'OSM GEOJSON + SYNTHESIZED FOOTPRINTS',
    roads,
    buildings,
    spawnPoint: [-2.8, 125],
    scooterSpawnPoint: [-2.8, 110],
  };
}