// src/world.ts
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/loaders/glTF';

import { MYSURU_LANDMARKS } from './map-architecture';
import { DEFAULT_MAP_CENTER, METERS_PER_DEGREE_LAT, METERS_PER_DEGREE_LON } from './world/map/MapConfig';
import { createCityMaterialPack } from './world/map/MapMaterials';
import { loadRealMysuruMap } from './world/map/MapLoader';
import { generateRealRoads } from './world/map/RoadGenerator';
import { generateRealBuildings } from './world/map/BuildingGenerator';
import type { LoadedMysuruMap } from './world/map/MapTypes';

export interface WorldStatus {
  speed: number;
  nearby: string;
  distanceToDestination: number;
  distanceToScooter: number;
  targetHeadingAngle: number;
  playerYaw: number;
  playerX: number;
  playerZ: number;
  lat: number;
  lon: number;
  mode: 'walking' | 'driving';
  canEnterVehicle: boolean;
}

type HUD = (status: WorldStatus) => void;
const keys = new Set<string>();

export function wgs84ToMetric(lat: number, lon: number, center = DEFAULT_MAP_CENTER): Vector3 {
  const eastingX = (lon - center.longitude) * METERS_PER_DEGREE_LON;
  const northingZ = (lat - center.latitude) * METERS_PER_DEGREE_LAT;
  return new Vector3(eastingX, 0, northingZ);
}

export function metricToWgs84(x: number, z: number, center = DEFAULT_MAP_CENTER): { lat: number; lon: number } {
  return {
    lat: center.latitude + z / METERS_PER_DEGREE_LAT,
    lon: center.longitude + x / METERS_PER_DEGREE_LON,
  };
}

function mat(scene: Scene, name: string, hex: string, roughness = 0.8): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.14, 0.14, 0.14).scale(1 - roughness);
  return m;
}

/* ============================================================================
 * 1. ANATOMICAL HUMAN RIG (WITH 5-FINGER HANDS, SHOES, EYES, NOSE & HAIRSTYLE)
 * ============================================================================ */
type HumanRig = {
  root: TransformNode;
  leftShoulder: TransformNode;
  rightShoulder: TransformNode;
  leftHip: TransformNode;
  rightHip: TransformNode;
};

function createRealisticHuman(
  scene: Scene,
  name: string,
  shirtHex: string,
  pantsHex: string,
  skinHex = '#a06a4b'
): HumanRig {
  const root = new TransformNode(`${name}-human`, scene);
  const skinMat = mat(scene, `${name}-skin`, skinHex, 0.75);
  const shirtMat = mat(scene, `${name}-shirt`, shirtHex, 0.85);
  const pantsMat = mat(scene, `${name}-pants`, pantsHex, 0.9);
  const hairMat = mat(scene, `${name}-hair`, '#181615', 0.9);
  const shoeMat = mat(scene, `${name}-shoe`, '#232528', 0.6);
  const whiteMat = mat(scene, `${name}-eye-w`, '#f8f8f8', 0.3);
  const pupilMat = mat(scene, `${name}-pupil`, '#111111', 0.1);

  // Sculpted Torso (Chest + Tapered Waist + Collar)
  const chest = MeshBuilder.CreateCylinder(`${name}-chest`, { height: 0.44, diameterTop: 0.42, diameterBottom: 0.35, tessellation: 14 }, scene);
  chest.scaling.z = 0.62;
  chest.position.y = 1.24;
  chest.parent = root;
  chest.material = shirtMat;

  const waist = MeshBuilder.CreateCylinder(`${name}-waist`, { height: 0.24, diameterTop: 0.35, diameterBottom: 0.34, tessellation: 14 }, scene);
  waist.scaling.z = 0.62;
  waist.position.y = 0.92;
  waist.parent = root;
  waist.material = shirtMat;

  // Neck
  const neck = MeshBuilder.CreateCylinder(`${name}-neck`, { height: 0.14, diameter: 0.13, tessellation: 12 }, scene);
  neck.position.y = 1.50;
  neck.parent = root;
  neck.material = skinMat;

  // Sculpted Head + Ears + Nose + Eyes + Hairstyle
  const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.25, segments: 14 }, scene);
  head.scaling.set(0.92, 1.12, 0.98);
  head.position.y = 1.66;
  head.parent = root;
  head.material = skinMat;

  // Layered Indian Wavy Hairstyle (Crown + Sidelocks + Back Taper)
  const hairTop = MeshBuilder.CreateSphere(`${name}-hair-top`, { diameter: 0.27, segments: 12 }, scene);
  hairTop.scaling.set(0.96, 0.72, 1.04);
  hairTop.position.set(0, 1.74, -0.01);
  hairTop.parent = root;
  hairTop.material = hairMat;

  const hairBack = MeshBuilder.CreateSphere(`${name}-hair-back`, { diameter: 0.24, segments: 10 }, scene);
  hairBack.scaling.set(0.9, 0.95, 0.65);
  hairBack.position.set(0, 1.67, -0.05);
  hairBack.parent = root;
  hairBack.material = hairMat;

  // Eyes, Pupils, Eyebrows, Nose & Ears (Facing +Z forward)
  for (const side of [-1, 1]) {
    const eyeWhite = MeshBuilder.CreateSphere(`${name}-eye-${side}`, { diameter: 0.036, segments: 8 }, scene);
    eyeWhite.position.set(side * 0.048, 1.67, 0.108);
    eyeWhite.parent = root;
    eyeWhite.material = whiteMat;

    const pupil = MeshBuilder.CreateSphere(`${name}-pupil-${side}`, { diameter: 0.018, segments: 6 }, scene);
    pupil.position.set(side * 0.048, 1.67, 0.122);
    pupil.parent = root;
    pupil.material = pupilMat;

    const brow = MeshBuilder.CreateBox(`${name}-brow-${side}`, { width: 0.042, height: 0.01, depth: 0.012 }, scene);
    brow.position.set(side * 0.048, 1.70, 0.112);
    brow.parent = root;
    brow.material = hairMat;

    const ear = MeshBuilder.CreateSphere(`${name}-ear-${side}`, { diameter: 0.048, segments: 6 }, scene);
    ear.scaling.set(0.4, 0.85, 0.6);
    ear.position.set(side * 0.118, 1.65, 0);
    ear.parent = root;
    ear.material = skinMat;
  }

  const nose = MeshBuilder.CreateCylinder(`${name}-nose`, { height: 0.045, diameterTop: 0.012, diameterBottom: 0.026, tessellation: 6 }, scene);
  nose.position.set(0, 1.645, 0.122);
  nose.parent = root;
  nose.material = skinMat;

  // Arms + Forearms + Palms + 5 Articulated Fingers on Each Hand!
  const buildArmWithFiveFingers = (side: number, label: string) => {
    const shoulder = new TransformNode(`${name}-${label}-shoulder`, scene);
    shoulder.position.set(side * 0.24, 1.41, 0);
    shoulder.parent = root;

    const sleeve = MeshBuilder.CreateCylinder(`${name}-${label}-sleeve`, { height: 0.22, diameterTop: 0.11, diameterBottom: 0.095, tessellation: 10 }, scene);
    sleeve.position.y = -0.11;
    sleeve.parent = shoulder;
    sleeve.material = shirtMat;

    const forearm = MeshBuilder.CreateCylinder(`${name}-${label}-forearm`, { height: 0.28, diameterTop: 0.082, diameterBottom: 0.062, tessellation: 10 }, scene);
    forearm.position.y = -0.35;
    forearm.parent = shoulder;
    forearm.material = skinMat;

    const palm = MeshBuilder.CreateBox(`${name}-${label}-palm`, { width: 0.065, height: 0.07, depth: 0.028 }, scene);
    palm.position.set(0, -0.52, 0);
    palm.parent = shoulder;
    palm.material = skinMat;

    // 5 Individual Fingers (Thumb + Index + Middle + Ring + Little Finger)
    const fingerOffsets = [-0.026, -0.013, 0, 0.013, 0.026];
    const fingerLengths = [0.036, 0.048, 0.054, 0.048, 0.038];
    for (let f = 0; f < 5; f++) {
      const finger = MeshBuilder.CreateCylinder(
        `${name}-${label}-finger-${f}`,
        { height: fingerLengths[f], diameterTop: 0.009, diameterBottom: 0.012, tessellation: 6 },
        scene
      );
      if (f === 0) {
        // Thumb angled slightly outward
        finger.position.set(side * -0.034, -0.535, 0.012);
        finger.rotation.z = side * 0.45;
      } else {
        finger.position.set(fingerOffsets[f], -0.555 - fingerLengths[f] / 2, 0);
      }
      finger.parent = shoulder;
      finger.material = skinMat;
    }

    return shoulder;
  };

  // Legs + Knees + Ankles + Contoured Shoes/Feet (5-toe foot box)
  const buildLegWithShoe = (side: number, label: string) => {
    const hip = new TransformNode(`${name}-${label}-hip`, scene);
    hip.position.set(side * 0.105, 0.82, 0);
    hip.parent = root;

    const thigh = MeshBuilder.CreateCylinder(`${name}-${label}-thigh`, { height: 0.42, diameterTop: 0.155, diameterBottom: 0.12, tessellation: 12 }, scene);
    thigh.position.y = -0.21;
    thigh.parent = hip;
    thigh.material = pantsMat;

    const calf = MeshBuilder.CreateCylinder(`${name}-${label}-calf`, { height: 0.38, diameterTop: 0.118, diameterBottom: 0.095, tessellation: 12 }, scene);
    calf.position.y = -0.59;
    calf.parent = hip;
    calf.material = pantsMat;

    // Contoured Sneaker/Shoe with Toe Cap & Sole
    const shoe = MeshBuilder.CreateBox(`${name}-${label}-shoe`, { width: 0.105, height: 0.075, depth: 0.24 }, scene);
    shoe.position.set(0, -0.79, 0.045);
    shoe.parent = hip;
    shoe.material = shoeMat;

    return hip;
  };

  return {
    root,
    leftShoulder: buildArmWithFiveFingers(-1, 'left'),
    rightShoulder: buildArmWithFiveFingers(1, 'right'),
    leftHip: buildLegWithShoe(-1, 'left'),
    rightHip: buildLegWithShoe(1, 'right'),
  };
}

function animateHuman(rig: HumanRig, phase: number, amount: number) {
  const swing = Math.sin(phase) * amount;
  rig.leftHip.rotation.x = swing;
  rig.rightHip.rotation.x = -swing;
  rig.leftShoulder.rotation.x = -swing * 0.75;
  rig.rightShoulder.rotation.x = swing * 0.75;
}

/* ============================================================================
 * 2. REAL MYSURU ARAMANE (AMBAVILAS PALACE) + GRAND ROYAL GATE + MEDIAN BLOCKS
 * ============================================================================ */
function buildGrandMysuruAramane(scene: Scene, parent: TransformNode): Vector3 {
  const aramaneRoot = new TransformNode('mysuru-aramane-complex', scene);
  aramaneRoot.parent = parent;
  // Positioned directly at the southern head of the Zone 1 Sayyaji Rao Avenue so you see it immediately!
  const pos = new Vector3(0, 0, -68);
  aramaneRoot.position.copyFrom(pos);

  const sandstone = mat(scene, 'aramane-sandstone', '#d9be9b', 0.7);
  const deepRose = mat(scene, 'aramane-rose', '#9e4b3e', 0.65);
  const royalGold = mat(scene, 'aramane-gold', '#e0a83a', 0.25);
  royalGold.emissiveColor = new Color3(0.22, 0.16, 0.04);
  const darkArch = mat(scene, 'aramane-arch-void', '#28221e', 0.9);
  const warmLight = mat(scene, 'aramane-bulb', '#ffdf85', 0.1);
  warmLight.emissiveColor = new Color3(0.75, 0.58, 0.22);

  // 1. Stepped Granite Plinth
  const plinth = MeshBuilder.CreateBox('aramane-plinth', { width: 136, height: 2.4, depth: 68 }, scene);
  plinth.position.y = 1.2;
  plinth.parent = aramaneRoot;
  plinth.material = sandstone;

  // 2. Three-Storey Indo-Saracenic Main Facade
  const mainBlock = MeshBuilder.CreateBox('aramane-main-wing', { width: 118, height: 22, depth: 48 }, scene);
  mainBlock.position.y = 13.4;
  mainBlock.parent = aramaneRoot;
  mainBlock.material = sandstone;

  const durbarCore = MeshBuilder.CreateBox('aramane-durbar', { width: 52, height: 29, depth: 52 }, scene);
  durbarCore.position.y = 16.9;
  durbarCore.parent = aramaneRoot;
  durbarCore.material = deepRose;

  // 3. Seven Indo-Saracenic Cusped Arches & Fluted Columns along the Front Facade (+Z facing street)
  for (let i = -4; i <= 4; i++) {
    const ax = i * 12.2;
    const pillar = MeshBuilder.CreateCylinder(`aramane-pillar-${i}`, { height: 18, diameterTop: 1.5, diameterBottom: 1.9, tessellation: 12 }, scene);
    pillar.position.set(ax, 11.4, 25.2);
    pillar.parent = aramaneRoot;
    pillar.material = royalGold;

    if (i < 4) {
      const archVoid = MeshBuilder.CreateCylinder(`aramane-arch-${i}`, { height: 1.2, diameter: 8.4, tessellation: 12 }, scene);
      archVoid.rotation.x = Math.PI / 2;
      archVoid.position.set(ax + 6.1, 13.5, 24.4);
      archVoid.parent = aramaneRoot;
      archVoid.material = darkArch;

      // Illuminated Dasara Arch Bulb Trim
      const bulbStrip = MeshBuilder.CreateBox(`aramane-bulb-${i}`, { width: 11.5, height: 0.45, depth: 0.5 }, scene);
      bulbStrip.position.set(ax + 6.1, 20.5, 25.4);
      bulbStrip.parent = aramaneRoot;
      bulbStrip.material = warmLight;
    }
  }

  // 4. Five Iconic Golden & Pink Onion Domes + Chhatri Cupolas + Kalasha Finials
  const domeOffsets = [
    { x: 0, y: 36, d: 18, isCenter: true },
    { x: -28, y: 29, d: 12.5, isCenter: false },
    { x: 28, y: 29, d: 12.5, isCenter: false },
    { x: -50, y: 27, d: 11, isCenter: false },
    { x: 50, y: 27, d: 11, isCenter: false },
  ];

  domeOffsets.forEach((dm, idx) => {
    const drum = MeshBuilder.CreateCylinder(`aramane-drum-${idx}`, { height: 7, diameter: dm.d * 0.78, tessellation: 14 }, scene);
    drum.position.set(dm.x, dm.y - 4.5, 0);
    drum.parent = aramaneRoot;
    drum.material = sandstone;

    const dome = MeshBuilder.CreateSphere(`aramane-dome-${idx}`, { diameter: dm.d, segments: 16 }, scene);
    dome.scaling.y = 0.88;
    dome.position.set(dm.x, dm.y, 0);
    dome.parent = aramaneRoot;
    dome.material = dm.isCenter ? royalGold : deepRose;

    const kalasha = MeshBuilder.CreateCylinder(`aramane-kalasha-${idx}`, { height: 5.5, diameterTop: 0.2, diameterBottom: 1.8, tessellation: 8 }, scene);
    kalasha.position.set(dm.x, dm.y + dm.d * 0.48, 0);
    kalasha.parent = aramaneRoot;
    kalasha.material = royalGold;
  });

  // 5. Grand Jayamarthanda / North Royal Arch Gate at the entrance to the Boulevard (z = -8)
  for (const side of [-1, 1]) {
    const gateTower = MeshBuilder.CreateBox(`aramane-gate-tower-${side}`, { width: 8.5, height: 13.5, depth: 6.5 }, scene);
    gateTower.position.set(side * 11.5, 6.75, 58);
    gateTower.parent = aramaneRoot;
    gateTower.material = sandstone;

    const gateDome = MeshBuilder.CreateSphere(`aramane-gate-dome-${side}`, { diameter: 6.5, segments: 12 }, scene);
    gateDome.position.set(side * 11.5, 14.8, 58);
    gateDome.parent = aramaneRoot;
    gateDome.material = royalGold;

    // Ornate Compound Wall flanking the gate
    const wall = MeshBuilder.CreateBox(`aramane-wall-${side}`, { width: 55, height: 4.2, depth: 1.4 }, scene);
    wall.position.set(side * 42, 2.1, 58);
    wall.parent = aramaneRoot;
    wall.material = sandstone;
  }

  const gateLint = MeshBuilder.CreateBox('aramane-gate-lintel', { width: 28, height: 3.6, depth: 6.8 }, scene);
  gateLint.position.set(0, 12.2, 58);
  gateLint.parent = aramaneRoot;
  gateLint.material = royalGold;

  return pos;
}

/* ============================================================================
 * 3. CONCRETE MEDIAN DIVIDERS & LOCKED CONSTRUCTION BARRICADES (ZONE 1 GATE)
 * ============================================================================ */
function buildStreetMediansAndLockedBarricades(scene: Scene, parent: TransformNode) {
  const darkBlock = mat(scene, 'median-dark', '#383634', 0.9);
  const lightBlock = mat(scene, 'median-light', '#b5ada0', 0.85);
  const barricadeMat = new StandardMaterial('pwd-barricade-mat', scene);
  const bTex = new DynamicTexture('pwd-barricade-tex', { width: 512, height: 128 }, scene, false);
  const ctx = bTex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#e5a928';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(10, 10, 492, 108);
  ctx.fillStyle = '#facc15';
  ctx.font = '700 26px Arial';
  ctx.fillText('🚧 MYSURU CITY POLICE · WORK IN PROGRESS', 22, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 20px monospace';
  ctx.fillText('NEXT ZONE LOCKED — COMPLETE ARAMANE SECTOR FIRST', 22, 96);
  bTex.update();
  barricadeMat.diffuseTexture = bTex;

  // Concrete median divider blocks along Sayyaji Rao Road (matching Screenshot 9!)
  const medianMeshesDark: Mesh[] = [];
  const medianMeshesLight: Mesh[] = [];
  for (let z = 4; z < 235; z += 2.2) {
    if (Math.abs(z - 90) < 12) continue; // Leave K.R. Circle rotary open
    const idx = Math.round(z / 2.2);
    const block = MeshBuilder.CreateBox(`median-${idx}`, { width: 0.65, height: 0.72, depth: 2.05 }, scene);
    block.position.set(0, 0.38, z);
    if (idx % 2 === 0) medianMeshesDark.push(block);
    else medianMeshesLight.push(block);
  }
  if (medianMeshesDark.length) {
    const m1 = Mesh.MergeMeshes(medianMeshesDark, true, true);
    if (m1) { m1.material = darkBlock; m1.parent = parent; }
  }
  if (medianMeshesLight.length) {
    const m2 = Mesh.MergeMeshes(medianMeshesLight, true, true);
    if (m2) { m2.material = lightBlock; m2.parent = parent; }
  }

  // Place Locked Construction Barricades at outer exits so unfinished areas are sealed off cleanly
  const barricadePoints: Array<[number, number, number]> = [
    [0, 250, 0],
    [-42, 90, Math.PI / 2],
    [42, 90, Math.PI / 2],
  ];
  barricadePoints.forEach(([bx, bz, rot], idx) => {
    const board = MeshBuilder.CreateBox(`zone-lock-barricade-${idx}`, { width: 11, height: 2.1, depth: 0.35 }, scene);
    board.position.set(bx, 1.25, bz);
    board.rotation.y = rot;
    board.material = barricadeMat;
    board.parent = parent;
  });
}

/* ============================================================================
 * 4. MULTI-LEAF WIND-ANIMATED TREES & FLYING FLOCK OF BIRDS
 * ============================================================================ */
function createWindTreesAndFlyingBirds(scene: Scene, parent: TransformNode) {
  const barkMat = mat(scene, 'real-bark', '#4a3525', 0.95);
  const leafMats = [
    mat(scene, 'leaf-1', '#2d572c', 0.85),
    mat(scene, 'leaf-2', '#3a6b33', 0.85),
    mat(scene, 'leaf-3', '#497d3b', 0.85),
  ];

  const windCanopyNodes: TransformNode[] = [];

  // Plant lush multi-branch, multi-leaf-cluster Rain Trees along both sidewalks
  for (let z = 10; z <= 230; z += 22) {
    for (const side of [-1, 1]) {
      const tx = side * 9.2;
      const tz = z + (side === 1 ? 6 : 0);

      const treeRoot = new TransformNode(`mysuru-tree-${tx}-${tz}`, scene);
      treeRoot.position.set(tx, 0, tz);
      treeRoot.parent = parent;

      // Tapered trunk
      const trunk = MeshBuilder.CreateCylinder(`trunk-${tx}-${tz}`, { height: 4.2, diameterTop: 0.45, diameterBottom: 0.72, tessellation: 8 }, scene);
      trunk.position.y = 2.1;
      trunk.parent = treeRoot;
      trunk.material = barkMat;

      // 4 Spreading Wooden Boughs/Branches
      const branchAngles = [
        [0.45, 0.3],
        [-0.45, 0.3],
        [0.35, -0.4],
        [-0.4, -0.35],
      ];
      branchAngles.forEach(([rx, rz], bIdx) => {
        const branch = MeshBuilder.CreateCylinder(`branch-${bIdx}`, { height: 3.2, diameterTop: 0.16, diameterBottom: 0.34, tessellation: 6 }, scene);
        branch.position.set(Math.sin(rz) * 1.1, 4.4, Math.sin(rx) * 1.1);
        branch.rotation.set(rx, 0, rz);
        branch.parent = treeRoot;
        branch.material = barkMat;
      });

      // Canopy Node that sways in the wind with 9 separate layered leaf clusters per tree!
      const canopyPivot = new TransformNode(`canopy-wind-${tx}-${tz}`, scene);
      canopyPivot.position.y = 5.4;
      canopyPivot.parent = treeRoot;
      windCanopyNodes.push(canopyPivot);

      const clusterOffsets = [
        [0, 0.8, 0, 4.4],
        [-2.4, 0.3, 1.2, 3.8],
        [2.4, 0.4, -1.1, 3.8],
        [-1.8, 0.5, -1.8, 3.5],
        [1.9, 0.2, 1.9, 3.6],
        [-3.4, -0.1, 0, 3.1],
        [3.2, 0.0, 0.4, 3.2],
        [0.4, 1.2, 1.6, 3.0],
        [-0.6, 1.1, -1.6, 3.0],
      ];

      clusterOffsets.forEach(([cx, cy, cz, size], cIdx) => {
        const leafCluster = MeshBuilder.CreatePolyhedron(
          `leaf-cluster-${cIdx}`,
          { type: 1, size: size * 0.45 },
          scene
        );
        leafCluster.scaling.set(1.35, 0.52, 1.25);
        leafCluster.position.set(cx, cy, cz);
        leafCluster.rotation.y = cIdx * 1.1;
        leafCluster.parent = canopyPivot;
        leafCluster.material = leafMats[cIdx % leafMats.length];
      });
    }
  }

  // Flock of 14 Birds with Articulated Flapping Wings Flying in the Sky
  const birdMat = mat(scene, 'bird-feather', '#222629', 0.9);
  const birds: Array<{
    root: TransformNode;
    leftWing: Mesh;
    rightWing: Mesh;
    angle: number;
    radius: number;
    speed: number;
    height: number;
    centerZ: number;
  }> = [];

  for (let i = 0; i < 14; i++) {
    const birdRoot = new TransformNode(`mysuru-bird-${i}`, scene);
    birdRoot.parent = parent;

    const leftWing = MeshBuilder.CreateBox(`bird-lw-${i}`, { width: 0.55, height: 0.04, depth: 0.22 }, scene);
    leftWing.position.x = -0.26;
    leftWing.parent = birdRoot;
    leftWing.material = birdMat;

    const rightWing = MeshBuilder.CreateBox(`bird-rw-${i}`, { width: 0.55, height: 0.04, depth: 0.22 }, scene);
    rightWing.position.x = 0.26;
    rightWing.parent = birdRoot;
    rightWing.material = birdMat;

    birds.push({
      root: birdRoot,
      leftWing,
      rightWing,
      angle: (i / 14) * Math.PI * 2,
      radius: 26 + (i % 5) * 9,
      speed: 0.45 + (i % 4) * 0.08,
      height: 16 + (i % 5) * 2.5,
      centerZ: 40 + (i % 3) * 55,
    });
  }

  return { windCanopyNodes, birds };
}

/* ============================================================================
 * 5. REALISTIC VEHICLES: CURVED INDIAN AUTO, KSRTC GOVT BUS & PRIVATE CARS
 * ============================================================================ */
function buildDetailedAutoRickshaw(scene: Scene, name: string): TransformNode {
  const root = new TransformNode(name, scene);
  const yellow = mat(scene, `${name}-yellow`, '#ebb02d', 0.35);
  const green = mat(scene, `${name}-green`, '#19593d', 0.45);
  const canvasTop = mat(scene, `${name}-hood`, '#1e2226', 0.85);
  const glass = mat(scene, `${name}-glass`, '#8ab4c4', 0.15);
  glass.alpha = 0.65;
  const rubber = mat(scene, `${name}-rubber`, '#1a1c1e', 0.9);
  const lamp = mat(scene, `${name}-lamp`, '#fff3b0', 0.1);
  lamp.emissiveColor = new Color3(0.8, 0.7, 0.3);

  // Lower Green Chassis Skirt & Rear Engine Cabin
  const rearCabin = MeshBuilder.CreateBox(`${name}-rear`, { width: 1.36, height: 0.78, depth: 1.45 }, scene);
  rearCabin.position.set(0, 0.62, -0.35);
  rearCabin.parent = root;
  rearCabin.material = green;

  // Upper Yellow Cowling & Passenger Side Pillars
  const yellowBelt = MeshBuilder.CreateBox(`${name}-belt`, { width: 1.40, height: 0.32, depth: 1.50 }, scene);
  yellowBelt.position.set(0, 1.02, -0.35);
  yellowBelt.parent = root;
  yellowBelt.material = yellow;

  // Curved Front Nose Beak (+Z is forward)
  const frontCowl = MeshBuilder.CreateCylinder(`${name}-cowl`, { height: 0.88, diameterTop: 0.58, diameterBottom: 0.92, tessellation: 12 }, scene);
  frontCowl.position.set(0, 0.68, 0.68);
  frontCowl.parent = root;
  frontCowl.material = yellow;

  // Front Windshield Frame + Glass
  const windshield = MeshBuilder.CreateBox(`${name}-windshield`, { width: 1.18, height: 0.52, depth: 0.06 }, scene);
  windshield.position.set(0, 1.32, 0.58);
  windshield.rotation.x = -0.22;
  windshield.parent = root;
  windshield.material = glass;

  // Rounded Weatherproof Canopy Roof
  const canopy = MeshBuilder.CreateCylinder(`${name}-canopy`, { height: 1.85, diameter: 1.38, tessellation: 12 }, scene);
  canopy.rotation.x = Math.PI / 2;
  canopy.scaling.y = 0.32;
  canopy.position.set(0, 1.66, -0.15);
  canopy.parent = root;
  canopy.material = yellow;

  // 3 Wheels (1 Front + 2 Rear)
  const wheelCoords = [
    [0, 0.28, 0.88],
    [-0.66, 0.28, -0.72],
    [0.66, 0.28, -0.72],
  ];
  wheelCoords.forEach(([wx, wy, wz], idx) => {
    const w = MeshBuilder.CreateCylinder(`${name}-wheel-${idx}`, { height: 0.20, diameter: 0.56, tessellation: 12 }, scene);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.parent = root;
    w.material = rubber;
  });

  // Twin Headlamps
  for (const side of [-0.32, 0.32]) {
    const hl = MeshBuilder.CreateSphere(`${name}-hl-${side}`, { diameter: 0.18, segments: 8 }, scene);
    hl.position.set(side, 0.78, 1.08);
    hl.parent = root;
    hl.material = lamp;
  }

  return root;
}

function buildKsrtcGovernmentBus(scene: Scene, name: string): TransformNode {
  const root = new TransformNode(name, scene);
  const busRed = mat(scene, `${name}-red`, '#b82821', 0.45);
  const creamStripe = mat(scene, `${name}-cream`, '#f2ece1', 0.5);
  const glass = mat(scene, `${name}-glass`, '#233442', 0.2);
  const rubber = mat(scene, `${name}-rubber`, '#181a1c', 0.9);
  const boardMat = new StandardMaterial(`${name}-board`, scene);
  const bTex = new DynamicTexture(`${name}-dest-tex`, { width: 256, height: 64 }, scene, false);
  const ctx = bTex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#facc15';
  ctx.font = '700 22px Arial';
  ctx.fillText('ಮೈಸೂರು ಸಾರಿಗೆ · KSRTC', 14, 40);
  bTex.update();
  boardMat.diffuseTexture = bTex;
  boardMat.emissiveColor = new Color3(0.4, 0.35, 0.1);

  // Main Bus Body
  const bodyLower = MeshBuilder.CreateBox(`${name}-lower`, { width: 2.55, height: 1.55, depth: 9.6 }, scene);
  bodyLower.position.y = 1.25;
  bodyLower.parent = root;
  bodyLower.material = busRed;

  const bodyUpper = MeshBuilder.CreateBox(`${name}-upper`, { width: 2.52, height: 1.35, depth: 9.5 }, scene);
  bodyUpper.position.y = 2.65;
  bodyUpper.parent = root;
  bodyUpper.material = creamStripe;

  // Side Passenger Windows Strip & Front Windshield
  const winStrip = MeshBuilder.CreateBox(`${name}-windows`, { width: 2.56, height: 0.88, depth: 8.4 }, scene);
  winStrip.position.y = 2.62;
  winStrip.parent = root;
  winStrip.material = glass;

  const frontGlass = MeshBuilder.CreateBox(`${name}-windshield`, { width: 2.28, height: 1.05, depth: 0.1 }, scene);
  frontGlass.position.set(0, 2.45, 4.78);
  frontGlass.parent = root;
  frontGlass.material = glass;

  // Illuminated Kannada Destination Board above Windshield
  const destBoard = MeshBuilder.CreatePlane(`${name}-dest`, { width: 1.75, height: 0.38 }, scene);
  destBoard.position.set(0, 3.12, 4.82);
  destBoard.rotation.y = Math.PI;
  destBoard.parent = root;
  destBoard.material = boardMat;

  // 6 Heavy Bus Tyres
  for (const [wx, wz] of [
    [-1.22, 3.1],
    [1.22, 3.1],
    [-1.22, -2.8],
    [1.22, -2.8],
  ]) {
    const tyre = MeshBuilder.CreateCylinder(`${name}-tyre-${wx}-${wz}`, { height: 0.36, diameter: 0.98, tessellation: 14 }, scene);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(wx, 0.49, wz);
    tyre.parent = root;
    tyre.material = rubber;
  }

  return root;
}

function buildPrivateCar(scene: Scene, name: string, colorHex: string): TransformNode {
  const root = new TransformNode(name, scene);
  const paint = mat(scene, `${name}-paint`, colorHex, 0.25);
  const glass = mat(scene, `${name}-glass`, '#22303c', 0.15);
  const rubber = mat(scene, `${name}-rubber`, '#181a1c', 0.9);

  const chassis = MeshBuilder.CreateBox(`${name}-chassis`, { width: 1.78, height: 0.68, depth: 4.1 }, scene);
  chassis.position.y = 0.62;
  chassis.parent = root;
  chassis.material = paint;

  const cabin = MeshBuilder.CreateBox(`${name}-cabin`, { width: 1.56, height: 0.58, depth: 2.15 }, scene);
  cabin.position.set(0, 1.22, -0.15);
  cabin.parent = root;
  cabin.material = paint;

  const win = MeshBuilder.CreateBox(`${name}-win`, { width: 1.60, height: 0.46, depth: 1.85 }, scene);
  win.position.set(0, 1.22, -0.15);
  win.parent = root;
  win.material = glass;

  for (const [wx, wz] of [
    [-0.86, 1.25],
    [0.86, 1.25],
    [-0.86, -1.25],
    [0.86, -1.25],
  ]) {
    const wheel = MeshBuilder.CreateCylinder(`${name}-w-${wx}-${wz}`, { height: 0.24, diameter: 0.64, tessellation: 12 }, scene);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.32, wz);
    wheel.parent = root;
    wheel.material = rubber;
  }

  return root;
}

/* ============================================================================
 * MAIN WORLD INITIALIZER
 * ============================================================================ */
export async function createWorld(
  canvas: HTMLCanvasElement,
  onHUD: HUD,
  onReady: (mapData: LoadedMysuruMap) => void,
  onProgress: (percent: number, stageText: string) => void = () => undefined
) {
  onProgress(8, 'Starting Namma Mysuru 3D Engine...');
  let engine: Engine | WebGPUEngine | null = null;
  let rendererName = 'NAMMA MYSURU ENGINE';

  try {
    const webgpuSupported = await Promise.race([
      WebGPUEngine.IsSupportedAsync,
      new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1200)),
    ]);
    if (webgpuSupported) {
      const gpu = new WebGPUEngine(canvas);
      const ready = await Promise.race([
        gpu.initAsync().then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 2000)),
      ]);
      if (ready) engine = gpu;
      else gpu.dispose();
    }
  } catch {
    /* WebGL 2 Fallback */
  }

  if (!engine) {
    engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
  }

  engine.setHardwareScalingLevel(1.0);
  const scene = new Scene(engine);
  // Natural golden-hour Mysuru sky & atmospheric haze
  scene.clearColor = new Color4(0.68, 0.76, 0.82, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0011;
  scene.fogColor = new Color3(0.74, 0.77, 0.78);

  const camera = new UniversalCamera('human-eye-camera', new Vector3(0, 1.82, 132), scene);
  camera.minZ = 0.15;
  camera.maxZ = 3500;
  camera.fov = 0.80;

  const hemiLight = new HemisphericLight('mysuru-ambient', new Vector3(0.2, 1, -0.2), scene);
  hemiLight.intensity = 0.72;
  hemiLight.groundColor = new Color3(0.36, 0.34, 0.30);

  const sunLight = new DirectionalLight('mysuru-golden-sun', new Vector3(-0.45, -0.85, -0.35), scene);
  sunLight.position = new Vector3(500, 1200, 600);
  sunLight.intensity = 0.95;
  sunLight.diffuse = new Color3(1.0, 0.95, 0.86);

  const mapData = await loadRealMysuruMap(onProgress);
  const mats = createCityMaterialPack(scene);

  const cityRoot = new TransformNode('mysuru-real-city-root', scene);
  const ground = MeshBuilder.CreateGround('mysuru-base-terrain', { width: 10000, height: 10000 }, scene);
  ground.position.y = -0.02;
  ground.material = mats.ground;
  ground.parent = cityRoot;

  onProgress(60, 'Constructing Sayyaji Rao Road, Kerbs & Concrete Medians...');
  generateRealRoads(scene, cityRoot, mapData.roads, mats);
  buildStreetMediansAndLockedBarricades(scene, cityRoot);

  onProgress(76, 'Building Mysuru Aramane (Ambavilas Palace) & Commercial Stores...');
  const palacePt = buildGrandMysuruAramane(scene, cityRoot);
  generateRealBuildings(scene, cityRoot, mapData.buildings, mats);

  onProgress(90, 'Planting wind-animated leafy trees, birds, KSRTC buses & autos...');
  const { windCanopyNodes, birds } = createWindTreesAndFlyingBirds(scene, cityRoot);

  // Player Auto-Rickshaw parked right ahead of you on the left lane facing Mysuru Aramane!
  const rider = buildDetailedAutoRickshaw(scene, 'player-scooter');
  rider.position.set(mapData.scooterSpawnPoint[0], 0.05, mapData.scooterSpawnPoint[1]);
  rider.rotation.y = Math.PI; // Facing South toward Mysuru Aramane

  // Player Anatomical Human Rig (with 5-finger hands, shoes, eyes, nose, hair)
  const walker = createRealisticHuman(scene, 'player', '#12787a', '#1d2b44');
  walker.root.position.set(mapData.spawnPoint[0], 0.05, mapData.spawnPoint[1]);
  walker.root.rotation.y = Math.PI; // Facing South toward the auto and Mysuru Aramane!

  // Active Public & Private Traffic (KSRTC Govt Bus, Private Cars & City Auto)
  const ksrtcBus = buildKsrtcGovernmentBus(scene, 'ksrtc-govt-bus');
  const privateCar1 = buildPrivateCar(scene, 'private-sedan-1', '#d4d8dd');
  const privateCar2 = buildPrivateCar(scene, 'private-hatch-2', '#294a6b');
  const npcAuto = buildDetailedAutoRickshaw(scene, 'npc-city-auto');

  const movingVehicles = [
    { node: ksrtcBus, laneX: 3.6, z: 15, dir: 1, speed: 6.8, minZ: 5, maxZ: 235 },
    { node: privateCar1, laneX: -3.6, z: 210, dir: -1, speed: 8.5, minZ: 5, maxZ: 235 },
    { node: privateCar2, laneX: 3.6, z: 120, dir: 1, speed: 9.2, minZ: 5, maxZ: 235 },
    { node: npcAuto, laneX: -3.4, z: 75, dir: -1, speed: 6.2, minZ: 5, maxZ: 235 },
  ];

  // Sidewalk Pedestrians with 5-finger anatomical rigs
  const pedConfigs: Array<[string, string, number, number, number]> = [
    ['#d9a326', '#252830', -7.6, 105, -1],
    ['#e0dcd3', '#1f3a60', -7.8, 65, 1],
    ['#9e3b33', '#2b2d35', 7.6, 115, -1],
    ['#3b6e52', '#262930', 7.8, 45, 1],
  ];
  const pedestrians = pedConfigs.map(([shirt, pants, px, pz, dir], idx) => {
    const human = createRealisticHuman(scene, `mysuru-ped-${idx}`, shirt, pants);
    human.root.position.set(px, 0.05, pz);
    return { rig: human, x: px, z: pz, dir, speed: 1.15 + idx * 0.12 };
  });

  onProgress(100, 'Welcome to Namma Mysuru.');

  let isDriving = false;
  let velocity = 0;
  let missionGoal = palacePt;
  let hudClock = 0;

  const cathedralPt = wgs84ToMetric(12.3219, 76.6580, mapData.center);
  const templePt = wgs84ToMetric(12.2726, 76.6730, mapData.center);
  const landmarkVectors = MYSURU_LANDMARKS.map((lm) => ({
    name: lm.name,
    vec: wgs84ToMetric(lm.lat, lm.lon, mapData.center),
  }));

  const normalizeKey = (key: string) =>
    ['w', 'ArrowUp'].includes(key)
      ? 'forward'
      : ['s', 'ArrowDown'].includes(key)
        ? 'back'
        : ['a', 'ArrowLeft'].includes(key)
          ? 'left'
          : ['d', 'ArrowRight'].includes(key)
            ? 'right'
            : key === 'Space'
              ? 'brake'
              : key.toLowerCase() === 'e'
                ? 'interact'
                : key;

  const toggleVehicle = () => {
    velocity = 0;
    if (isDriving) {
      const side = new Vector3(Math.cos(rider.rotation.y), 0, -Math.sin(rider.rotation.y));
      walker.root.position.copyFrom(rider.position.add(side.scale(2.0)));
      walker.root.rotation.y = rider.rotation.y;
      walker.root.setEnabled(true);
      isDriving = false;
      return 'walking' as const;
    }
    if (Vector3.Distance(walker.root.position, rider.position) > 9) return null;
    walker.root.setEnabled(false);
    isDriving = true;
    return 'driving' as const;
  };

  const setDriveKey = (key: string, down: boolean) => {
    const normalized = normalizeKey(key);
    if (normalized === 'interact') {
      if (down && !keys.has('interact')) toggleVehicle();
      down ? keys.add(normalized) : keys.delete(normalized);
      return;
    }
    down ? keys.add(normalized) : keys.delete(normalized);
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  let lastFrameAt = performance.now();

  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;
    const timeSec = now * 0.001;

    const forward = keys.has('forward');
    const back = keys.has('back');
    const left = keys.has('left');
    const right = keys.has('right');
    const brake = keys.has('brake');

    const activeRoot = isDriving ? rider : walker.root;
    const maxForward = isDriving ? 15.0 : 3.6;
    const maxReverse = isDriving ? 5.0 : 1.5;
    const accel = isDriving ? 6.0 : 8.5;

    if (forward) velocity = clamp(velocity + dt * accel, -maxReverse, maxForward);
    else if (back) velocity = clamp(velocity - dt * accel, -maxReverse, maxForward);
    else velocity *= Math.max(0, 1 - dt * (brake ? 8.0 : 4.2));

    if (Math.abs(velocity) > 0.05) {
      const turnRate = isDriving ? 1.85 : 2.8;
      activeRoot.rotation.y += ((right ? 1 : 0) - (left ? 1 : 0)) * dt * turnRate * Math.sign(velocity);
    } else if (!isDriving && (left || right)) {
      activeRoot.rotation.y += ((right ? 1 : 0) - (left ? 1 : 0)) * dt * 2.6;
    }

    const yaw = activeRoot.rotation.y;
    // Clamp movement inside active Zone 1 so player cannot walk past the locked PWD barricades
    activeRoot.position.x = clamp(activeRoot.position.x + Math.sin(yaw) * velocity * dt, -38, 38);
    activeRoot.position.z = clamp(activeRoot.position.z + Math.cos(yaw) * velocity * dt, -8, 245);

    animateHuman(walker, now / 115, isDriving ? 0 : Math.min(Math.abs(velocity) / 2.6, 0.85));

    // Human Eye-Level Street Camera
    const forwardVec = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const camDist = isDriving ? 5.8 : 3.5;
    const camHeight = isDriving ? 2.15 : 1.78;
    const desiredCamPos = activeRoot.position
      .subtract(forwardVec.scale(camDist))
      .add(new Vector3(0, camHeight, 0));
    camera.position = Vector3.Lerp(camera.position, desiredCamPos, Math.min(1, dt * 10));
    camera.setTarget(
      activeRoot.position.add(new Vector3(0, isDriving ? 1.35 : 1.48, 0)).add(forwardVec.scale(6.5))
    );

    // 1. Animate Wind Swaying Tree Leaf Canopies
    for (let i = 0; i < windCanopyNodes.length; i++) {
      const node = windCanopyNodes[i];
      node.rotation.z = Math.sin(timeSec * 1.8 + i * 0.7) * 0.035;
      node.rotation.x = Math.cos(timeSec * 1.4 + i * 0.5) * 0.025;
    }

    // 2. Animate Flying Birds & Wing Flapping
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      b.angle += b.speed * dt;
      const bx = Math.cos(b.angle) * b.radius;
      const bz = b.centerZ + Math.sin(b.angle) * b.radius;
      const by = b.height + Math.sin(timeSec * 2 + i) * 0.8;
      b.root.position.set(bx, by, bz);
      b.root.rotation.y = -b.angle;
      const flap = Math.sin(timeSec * 11 + i * 1.3) * 0.55;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }

    // 3. Animate KSRTC Bus, Private Cars & NPC Auto
    for (const veh of movingVehicles) {
      veh.z += veh.dir * veh.speed * dt;
      if (veh.dir === 1 && veh.z > veh.maxZ) veh.z = veh.minZ;
      if (veh.dir === -1 && veh.z < veh.minZ) veh.z = veh.maxZ;
      veh.node.position.set(veh.laneX, 0.05, veh.z);
      veh.node.rotation.y = veh.dir === 1 ? 0 : Math.PI;
    }

    // 4. Animate Sidewalk Pedestrians
    for (const ped of pedestrians) {
      ped.z += ped.dir * ped.speed * dt;
      if (ped.z > 220) ped.dir = -1;
      if (ped.z < 12) ped.dir = 1;
      ped.rig.root.position.set(ped.x, 0.05, ped.z);
      ped.rig.root.rotation.y = ped.dir === 1 ? 0 : Math.PI;
      animateHuman(ped.rig, now / 140, 0.48);
    }

    hudClock += dt;
    if (hudClock > 0.08) {
      hudClock = 0;
      const distToScooter = Vector3.Distance(walker.root.position, rider.position);
      const distToGoal = Math.hypot(activeRoot.position.x - missionGoal.x, activeRoot.position.z - missionGoal.z);

      const targetVec = isDriving ? missionGoal : rider.position;
      const worldAngleToTarget = Math.atan2(
        targetVec.x - activeRoot.position.x,
        targetVec.z - activeRoot.position.z
      );
      const relativeAngle = worldAngleToTarget - yaw;

      let nearestName = 'AMBAVILAS PALACE AVENUE';
      let minDist = Infinity;
      for (const lm of landmarkVectors) {
        const d = Math.hypot(activeRoot.position.x - lm.vec.x, activeRoot.position.z - lm.vec.z);
        if (d < minDist) {
          minDist = d;
          nearestName = lm.name;
        }
      }

      const gps = metricToWgs84(activeRoot.position.x, activeRoot.position.z, mapData.center);
      onHUD({
        speed: Math.abs(velocity) * 3.6,
        nearby: nearestName,
        distanceToDestination: distToGoal,
        distanceToScooter: distToScooter,
        targetHeadingAngle: relativeAngle,
        playerYaw: yaw,
        playerX: activeRoot.position.x,
        playerZ: activeRoot.position.z,
        lat: gps.lat,
        lon: gps.lon,
        mode: isDriving ? 'driving' : 'walking',
        canEnterVehicle: !isDriving && distToScooter <= 8.5,
      });
    }

    scene.render();
  });

  engine.resize();
  window.addEventListener('resize', () => engine.resize());
  onReady(mapData);

  return {
    rendererName,
    mapSource: mapData.sourceLabel,
    mapData,
    setDriveKey,
    toggleVehicle,
    setMission: (_enabled: boolean, missionId = 'palace-parcel') => {
      missionGoal =
        missionId === 'coffee-delivery'
          ? cathedralPt
          : missionId === 'golden-photo'
            ? templePt
            : palacePt;
    },
  };
}