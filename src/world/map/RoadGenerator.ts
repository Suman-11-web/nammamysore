// src/world/map/RoadGenerator.ts
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { CityMaterialPack } from './MapMaterials';
import type { NormalizedRoad } from './MapTypes';
import { getHighwaySpec } from './MapConfig';

function buildContinuousRibbon(
  scene: Scene,
  name: string,
  points: [number, number][],
  width: number,
  yElevation: number
): Mesh | null {
  if (points.length < 2) return null;
  const leftPath: Vector3[] = [];
  const rightPath: Vector3[] = [];
  const halfW = width / 2;

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const curr = points[i];
    const next = points[Math.min(points.length - 1, i + 1)];

    // Miter tangent vector across segments for smooth bends
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    leftPath.push(new Vector3(curr[0] + nx * halfW, yElevation, curr[1] + nz * halfW));
    rightPath.push(new Vector3(curr[0] - nx * halfW, yElevation, curr[1] - nz * halfW));
  }

  return MeshBuilder.CreateRibbon(
    name,
    { pathArray: [leftPath, rightPath], sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
}

export function generateRealRoads(
  scene: Scene,
  parent: TransformNode,
  roads: NormalizedRoad[],
  materials: CityMaterialPack
): void {
  const majorAsphaltMeshes: Mesh[] = [];
  const localAsphaltMeshes: Mesh[] = [];
  const sidewalkMeshes: Mesh[] = [];
  const centerLineMeshes: Mesh[] = [];

  // Deduplicate junction caps on a 4m grid so intersections merge cleanly without overlapping discs
  const junctionSet = new Set<string>();

  roads.forEach((road, idx) => {
    const spec = getHighwaySpec(road.highway);
    const yRoad = spec.elevationOffset;

    // 1. Main Asphalt Surface
    const asphalt = buildContinuousRibbon(scene, `road-asphalt-${idx}`, road.points, road.width, yRoad);
    if (asphalt) {
      if (road.isMajor) majorAsphaltMeshes.push(asphalt);
      else localAsphaltMeshes.push(asphalt);
    }

    // 2. Raised Sidewalk & Yellow-Black Kerb Base (slightly wider underneath major/residential streets)
    if (road.hasSidewalk && spec.sidewalkWidth > 0) {
      const swTotalWidth = road.width + spec.sidewalkWidth * 2;
      const sidewalk = buildContinuousRibbon(
        scene,
        `road-sidewalk-${idx}`,
        road.points,
        swTotalWidth,
        yRoad - 0.015
      );
      if (sidewalk) sidewalkMeshes.push(sidewalk);
    }

    // 3. Junction Caps at road endpoints and sharp turns to eliminate gaps between segments
    for (const endIdx of [0, road.points.length - 1]) {
      const [jx, jz] = road.points[endIdx];
      const jKey = `${Math.round(jx / 4)},${Math.round(jz / 4)}`;
      if (!junctionSet.has(jKey)) {
        junctionSet.add(jKey);
        const cap = MeshBuilder.CreateDisc(
          `road-junction-${idx}-${endIdx}`,
          { radius: road.width * 0.52, tessellation: 12 },
          scene
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.set(jx, yRoad + 0.002, jz);
        if (road.isMajor) majorAsphaltMeshes.push(cap);
        else localAsphaltMeshes.push(cap);
      }
    }

    // 4. Dashed White Center Lane Markings (like Screenshot 2)
    if (road.hasCenterLine) {
      for (let i = 0; i < road.points.length - 1; i++) {
        const [ax, az] = road.points[i];
        const [bx, bz] = road.points[i + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        if (segLen < 8) continue;

        const dx = (bx - ax) / segLen;
        const dz = (bz - az) / segLen;
        const angle = Math.atan2(dx, dz);

        for (let d = 4; d < segLen - 4; d += 9) {
          const dash = MeshBuilder.CreateGround(
            `lane-dash-${idx}-${i}-${d}`,
            { width: 0.22, height: 3.4 },
            scene
          );
          dash.position.set(ax + dx * d, yRoad + 0.012, az + dz * d);
          dash.rotation.y = angle;
          centerLineMeshes.push(dash);
        }
      }
    }
  });

  // Batch-merge road layers to keep draw calls minimal (4 draw calls total for the entire road network!)
  if (sidewalkMeshes.length > 0) {
    const mergedSw = Mesh.MergeMeshes(sidewalkMeshes, true, true, undefined, false, false);
    if (mergedSw) {
      mergedSw.name = 'mysuru-merged-sidewalks';
      mergedSw.material = materials.sidewalkKerb;
      mergedSw.parent = parent;
      mergedSw.receiveShadows = true;
    }
  }

  if (localAsphaltMeshes.length > 0) {
    const mergedLocal = Mesh.MergeMeshes(localAsphaltMeshes, true, true, undefined, false, false);
    if (mergedLocal) {
      mergedLocal.name = 'mysuru-merged-local-roads';
      mergedLocal.material = materials.asphaltLocal;
      mergedLocal.parent = parent;
      mergedLocal.receiveShadows = true;
    }
  }

  if (majorAsphaltMeshes.length > 0) {
    const mergedMajor = Mesh.MergeMeshes(majorAsphaltMeshes, true, true, undefined, false, false);
    if (mergedMajor) {
      mergedMajor.name = 'mysuru-merged-major-roads';
      mergedMajor.material = materials.asphaltMajor;
      mergedMajor.parent = parent;
      mergedMajor.receiveShadows = true;
    }
  }

  if (centerLineMeshes.length > 0) {
    const mergedLines = Mesh.MergeMeshes(centerLineMeshes, true, true, undefined, false, false);
    if (mergedLines) {
      mergedLines.name = 'mysuru-merged-centerlines';
      mergedLines.material = materials.centerLine;
      mergedLines.parent = parent;
    }
  }
}