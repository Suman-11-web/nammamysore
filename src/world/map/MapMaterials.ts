// src/world/map/MapMaterials.ts
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MYSURU_SHOP_SIGNS } from './MapConfig';

export interface CityMaterialPack {
  ground: StandardMaterial;
  asphaltMajor: StandardMaterial;
  asphaltLocal: StandardMaterial;
  sidewalkKerb: StandardMaterial;
  centerLine: StandardMaterial;
  facadeMaterials: StandardMaterial[];
  roofMaterial: StandardMaterial;
  signMaterials: StandardMaterial[];
  foliageDark: StandardMaterial;
  foliageMid: StandardMaterial;
  bark: StandardMaterial;
  bollard: StandardMaterial;
}

function createAsphaltMaterial(scene: Scene, name: string, baseHex: string, withGrain = true): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  const tex = new DynamicTexture(`${name}-tex`, { width: 256, height: 256 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  if (withGrain) {
    for (let i = 0; i < 1800; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, 2, 2);
    }
    // Subtle tyre wear tracks
    ctx.fillStyle = 'rgba(15, 18, 22, 0.14)';
    ctx.fillRect(52, 0, 36, 256);
    ctx.fillRect(168, 0, 36, 256);
  }
  tex.update();
  tex.wrapU = 1;
  tex.wrapV = 1;
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.06, 0.06, 0.07);
  return mat;
}

function createKerbMaterial(scene: Scene): StandardMaterial {
  const mat = new StandardMaterial('mysuru-sidewalk-kerb', scene);
  const tex = new DynamicTexture('kerb-tex', { width: 256, height: 256 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  // Concrete paving slabs
  ctx.fillStyle = '#8b887f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#6e6b63';
  ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // Yellow & black painted Indian kerb edge strip
  for (let y = 0; y < 256; y += 64) {
    ctx.fillStyle = (y / 64) % 2 === 0 ? '#e5a928' : '#222426';
    ctx.fillRect(0, y, 26, 64);
    ctx.fillRect(230, y, 26, 64);
  }
  tex.update();
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.04, 0.04, 0.04);
  return mat;
}

function createBuildingFacadeMaterial(
  scene: Scene,
  index: number,
  wallHex: string,
  trimHex: string,
  isCommercial: boolean
): StandardMaterial {
  const mat = new StandardMaterial(`mysuru-facade-${index}`, scene);
  const tex = new DynamicTexture(`facade-tex-${index}`, { width: 512, height: 512 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Base plaster wall
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal floor slab bands (4 storeys on texture canvas)
  const floors = 4;
  const floorH = 512 / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH;
    // Floor cornice / chajja sunshade ledge
    ctx.fillStyle = trimHex;
    ctx.fillRect(0, y, 512, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y + 10, 512, 5);

    // Ground floor (bottom row f === 3) gets rolling shop shutters & signboard strip if commercial
    if (f === floors - 1 && isCommercial) {
      const sign = MYSURU_SHOP_SIGNS[index % MYSURU_SHOP_SIGNS.length];
      ctx.fillStyle = sign.bg;
      ctx.fillRect(14, y + 14, 484, 34);
      ctx.fillStyle = sign.fg;
      ctx.font = '700 17px Arial';
      ctx.fillText(sign.kan, 28, y + 36);
      ctx.font = '700 12px monospace';
      ctx.fillText(sign.eng, 235, y + 35);

      // Metallic rolling shop shutters below signboard
      for (let sx = 24; sx < 480; sx += 115) {
        ctx.fillStyle = '#4c525a';
        ctx.fillRect(sx, y + 54, 96, floorH - 58);
        ctx.strokeStyle = '#333840';
        ctx.lineWidth = 2;
        for (let sy = y + 60; sy < 508; sy += 8) {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 96, sy);
          ctx.stroke();
        }
      }
      continue;
    }

    // Upper floor windows with warm lit/unlit evening rooms
    const cols = 4;
    const colW = 512 / cols;
    for (let c = 0; c < cols; c++) {
      const wx = c * colW + 24;
      const wy = y + 26;
      const ww = colW - 48;
      const wh = floorH - 46;

      // Window frame
      ctx.fillStyle = '#2d3238';
      ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

      // Lit warm room vs dark reflective glass
      const lit = (index + f * 3 + c * 7) % 5 === 0;
      ctx.fillStyle = lit ? '#e8b856' : '#23303d';
      ctx.fillRect(wx, wy, ww, wh);

      // Window mullions/bars
      ctx.fillStyle = '#3a4047';
      ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      ctx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    }
  }

  tex.update();
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  return mat;
}

export function createCityMaterialPack(scene: Scene): CityMaterialPack {
  const ground = createAsphaltMaterial(scene, 'mysuru-earth-ground', '#7c7669', true);

  const asphaltMajor = createAsphaltMaterial(scene, 'mysuru-asphalt-major', '#35383d', true);
  const asphaltLocal = createAsphaltMaterial(scene, 'mysuru-asphalt-local', '#42454b', true);
  const sidewalkKerb = createKerbMaterial(scene);

  const centerLine = new StandardMaterial('mysuru-road-centerline', scene);
  centerLine.diffuseColor = Color3.FromHexString('#e8e4d5');
  centerLine.emissiveColor = new Color3(0.18, 0.17, 0.14);
  centerLine.specularColor = Color3.Black();

  // Realistic Mysuru lime plaster, sandstone, terracotta, and whitewashed building palettes
  const palettes: Array<[string, string, boolean]> = [
    ['#d8cbb8', '#9e8d76', true],  // Old Sayyaji Rao Rd Commercial
    ['#c99e7a', '#8c6244', true],  // Terracotta Market Shopfront
    ['#dcd9ce', '#a39f93', false], // Saraswathipuram Ivory Apartment
    ['#cfb893', '#947b56', true],  // Heritage Ochre Commercial
    ['#bfcad0', '#7e8c94', false], // Modern Concrete Office/PG
    ['#d4c2b4', '#8f7968', false], // Agrahara Residential House
  ];

  const facadeMaterials = palettes.map(([wall, trim, comm], i) =>
    createBuildingFacadeMaterial(scene, i, wall, trim, comm)
  );

  const roofMaterial = createAsphaltMaterial(scene, 'mysuru-roof-concrete', '#6e6a63', true);

  const signMaterials = MYSURU_SHOP_SIGNS.map((sign, idx) => {
    const mat = new StandardMaterial(`shop-sign-${idx}`, scene);
    const tex = new DynamicTexture(`shop-sign-tex-${idx}`, { width: 512, height: 128 }, scene, false);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = sign.bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = sign.fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = sign.fg;
    ctx.font = '700 38px Arial';
    ctx.fillText(sign.kan, 24, 58);
    ctx.font = '700 22px monospace';
    ctx.fillText(sign.eng, 24, 102);
    tex.update();
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.22, 0.2, 0.15);
    return mat;
  });

  const foliageDark = new StandardMaterial('mysuru-foliage-dark', scene);
  foliageDark.diffuseColor = Color3.FromHexString('#2e4f34');
  foliageDark.specularColor = Color3.Black();

  const foliageMid = new StandardMaterial('mysuru-foliage-mid', scene);
  foliageMid.diffuseColor = Color3.FromHexString('#3d633e');
  foliageMid.specularColor = Color3.Black();

  const bark = new StandardMaterial('mysuru-tree-bark', scene);
  bark.diffuseColor = Color3.FromHexString('#4d392b');
  bark.specularColor = Color3.Black();

  const bollard = new StandardMaterial('mysuru-bollard', scene);
  bollard.diffuseColor = Color3.FromHexString('#e5a928');

  return {
    ground,
    asphaltMajor,
    asphaltLocal,
    sidewalkKerb,
    centerLine,
    facadeMaterials,
    roofMaterial,
    signMaterials,
    foliageDark,
    foliageMid,
    bark,
    bollard,
  };
}