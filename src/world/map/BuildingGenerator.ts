// src/world/map/BuildingGenerator.ts
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { CityMaterialPack } from './MapMaterials';
import type { NormalizedBuilding } from './MapTypes';

/**
 * Builds an extruded 3D building mesh directly from an OSM 2D footprint ring [[x, z], ...].
 * Includes UV-mapped vertical facade walls and a flat fan-triangulated roof cap.
 */
function createExtrudedFootprintMesh(
  scene: Scene,
  building: NormalizedBuilding,
  wallOutset = 0
): { walls: Mesh; roof: Mesh } | null {
  const ring = building.ring;
  if (ring.length < 3) return null;

  // Ensure closed ring
  const pts: [number, number][] =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];

  if (pts.length < 4) return null;

  const h = building.height;
  const [cx, cz] = building.centroid;

  const wallPositions: number[] = [];
  const wallIndices: number[] = [];
  const wallUVs: number[] = [];

  let accumulatedPerimeter = 0;
  let vIndex = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    let [x0, z0] = pts[i];
    let [x1, z1] = pts[i + 1];

    if (wallOutset !== 0) {
      const d0x = x0 - cx;
      const d0z = z0 - cz;
      const l0 = Math.hypot(d0x, d0z) || 1;
      x0 += (d0x / l0) * wallOutset;
      z0 += (d0z / l0) * wallOutset;

      const d1x = x1 - cx;
      const d1z = z1 - cz;
      const l1 = Math.hypot(d1x, d1z) || 1;
      x1 += (d1x / l1) * wallOutset;
      z1 += (d1z / l1) * wallOutset;
    }

    const segLen = Math.hypot(x1 - x0, z1 - z0);
    if (segLen < 0.2) continue;

    // 4 vertices per wall quad (bottom-left, bottom-right, top-right, top-left)
    wallPositions.push(
      x0, 0, z0,
      x1, 0, z1,
      x1, h, z1,
      x0, h, z0
    );

    const u0 = accumulatedPerimeter / 14;
    const u1 = (accumulatedPerimeter + segLen) / 14;
    const vTop = Math.max(1, h / 12);

    wallUVs.push(
      u0, 1,
      u1, 1,
      u1, 1 - vTop,
      u0, 1 - vTop
    );

    wallIndices.push(
      vIndex, vIndex + 1, vIndex + 2,
      vIndex, vIndex + 2, vIndex + 3,
      // Double-sided winding so clockwise & counter-clockwise OSM rings both render
      vIndex, vIndex + 2, vIndex + 1,
      vIndex, vIndex + 3, vIndex + 2
    );

    accumulatedPerimeter += segLen;
    vIndex += 4;
  }

  if (wallPositions.length === 0) return null;

  const wallMesh = new Mesh(`bldg-wall-${building.id}`, scene);
  const wallNormals: number[] = [];
  VertexData.ComputeNormals(wallPositions, wallIndices, wallNormals);
  const wallData = new VertexData();
  wallData.positions = wallPositions;
  wallData.indices = wallIndices;
  wallData.uvs = wallUVs;
  wallData.normals = wallNormals;
  wallData.applyToMesh(wallMesh);

  // Roof cap fan from centroid at elevation h
  const roofPositions: number[] = [cx, h + 0.05, cz];
  const roofUVs: number[] = [0.5, 0.5];
  const roofIndices: number[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const [rx, rz] = pts[i];
    roofPositions.push(rx, h + 0.05, rz);
    roofUVs.push((rx - cx) / 20 + 0.5, (rz - cz) / 20 + 0.5);
  }

  const ringCount = pts.length - 1;
  for (let i = 1; i <= ringCount; i++) {
    const next = i === ringCount ? 1 : i + 1;
    roofIndices.push(0, i, next, 0, next, i);
  }

  const roofMesh = new Mesh(`bldg-roof-${building.id}`, scene);
  const roofNormals: number[] = [];
  VertexData.ComputeNormals(roofPositions, roofIndices, roofNormals);
  const roofData = new VertexData();
  roofData.positions = roofPositions;
  roofData.indices = roofIndices;
  roofData.uvs = roofUVs;
  roofData.normals = roofNormals;
  roofData.applyToMesh(roofMesh);

  return { walls: wallMesh, roof: roofMesh };
}

export function generateRealBuildings(
  scene: Scene,
  parent: TransformNode,
  buildings: NormalizedBuilding[],
  materials: CityMaterialPack
): void {
  const facadeBuckets: Mesh[][] = materials.facadeMaterials.map(() => []);
  const roofMeshes: Mesh[] = [];

  buildings.forEach((bldg, index) => {
    const built = createExtrudedFootprintMesh(scene, bldg);
    if (!built) return;

    const bucketIdx =
      bldg.category === 'commercial'
        ? index % 2 // Commercial shopfront facades
        : index % materials.facadeMaterials.length;

    facadeBuckets[bucketIdx].push(built.walls);
    roofMeshes.push(built.roof);
  });

  // Merge each facade material bucket into a single mesh (6 draw calls for hundreds of buildings!)
  facadeBuckets.forEach((bucket, idx) => {
    if (bucket.length === 0) return;
    const merged = Mesh.MergeMeshes(bucket, true, true, undefined, false, false);
    if (merged) {
      merged.name = `mysuru-buildings-batch-${idx}`;
      merged.material = materials.facadeMaterials[idx];
      merged.parent = parent;
      merged.receiveShadows = true;
    }
  });

  if (roofMeshes.length > 0) {
    const mergedRoofs = Mesh.MergeMeshes(roofMeshes, true, true, undefined, false, false);
    if (mergedRoofs) {
      mergedRoofs.name = 'mysuru-building-roofs';
      mergedRoofs.material = materials.roofMaterial;
      mergedRoofs.parent = parent;
    }
  }
}