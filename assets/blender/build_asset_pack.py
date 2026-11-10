"""Generate realistic PBR low-to-mid-poly GLB assets for Namma Mysuru / Mysuru After Hours.

Run from terminal:
  blender -b --python assets/blender/build_asset_pack.py

Or open Blender -> Scripting tab -> New -> Paste this script -> Click Run Script (▶).
"""

import math
import os
from pathlib import Path
import bpy


def resolve_output_dir() -> Path:
    try:
        root = Path(__file__).resolve().parents[2]
        if (root / "package.json").exists():
            out = root / "public" / "assets"
            out.mkdir(parents=True, exist_ok=True)
            return out
    except NameError:
        pass
    home_project = Path.home() / "mysuru-after-hours" / "public" / "assets"
    home_project.mkdir(parents=True, exist_ok=True)
    return home_project


OUT = resolve_output_dir()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def pbr_mat(name: str, rgb: tuple[float, float, float], metallic=0.0, roughness=0.75, emission=0.0, alpha=1.0):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, alpha)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs and emission > 0:
            bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    return material


# Realistic Mysuru PBR Material Palette
PALACE_OCHRE = pbr_mat("PalaceOchreStone", (0.83, 0.71, 0.54), 0.0, 0.72)
PALACE_ROSE = pbr_mat("PalacePinkMarble", (0.64, 0.32, 0.25), 0.05, 0.55)
PALACE_GOLD = pbr_mat("PalaceGildedBrass", (0.86, 0.62, 0.18), 0.78, 0.28, emission=0.15)
PALACE_BULB = pbr_mat("PalaceDasaraBulb", (1.0, 0.88, 0.52), 0.0, 0.1, emission=1.8)
DARK_VOID = pbr_mat("ArchShadowVoid", (0.11, 0.10, 0.09), 0.0, 0.95)

STORE_PLASTER = pbr_mat("StoreLimePlaster", (0.82, 0.78, 0.70), 0.0, 0.82)
STORE_TERRACOTTA = pbr_mat("DevarajaTerracotta", (0.72, 0.36, 0.24), 0.0, 0.78)
SHUTTER_STEEL = pbr_mat("RollingShutterSteel", (0.32, 0.35, 0.38), 0.65, 0.48)
CONCRETE_GREY = pbr_mat("ChajjaConcrete", (0.52, 0.51, 0.48), 0.0, 0.88)
SIGN_RED = pbr_mat("MysuruSignRed", (0.58, 0.11, 0.11), 0.1, 0.4, emission=0.2)
SIGN_GREEN = pbr_mat("MysuruSignGreen", (0.09, 0.34, 0.22), 0.1, 0.4, emission=0.2)
MALL_GLASS = pbr_mat("MallCurtainGlass", (0.14, 0.26, 0.34), 0.35, 0.15, alpha=0.82)

AUTO_YELLOW = pbr_mat("AutoSaffronYellow", (0.92, 0.66, 0.12), 0.18, 0.32)
AUTO_GREEN = pbr_mat("AutoForestGreen", (0.07, 0.32, 0.21), 0.18, 0.36)
CANVAS_BLACK = pbr_mat("AutoCanvasHood", (0.12, 0.13, 0.14), 0.0, 0.88)
KSRTC_RED = pbr_mat("KsrtcBusRed", (0.74, 0.14, 0.12), 0.22, 0.35)
KSRTC_CREAM = pbr_mat("KsrtcBusCream", (0.92, 0.89, 0.82), 0.1, 0.4)
TYRE_RUBBER = pbr_mat("TyreRubber", (0.08, 0.09, 0.09), 0.0, 0.92)
CHROME_METAL = pbr_mat("ChromeRim", (0.78, 0.80, 0.82), 0.9, 0.2)

HUMAN_SKIN = pbr_mat("HumanSkin", (0.62, 0.41, 0.29), 0.0, 0.68)
HUMAN_SHIRT = pbr_mat("HumanTealJacket", (0.07, 0.46, 0.48), 0.0, 0.78)
HUMAN_DENIM = pbr_mat("HumanDarkJeans", (0.11, 0.16, 0.26), 0.0, 0.85)
HUMAN_HAIR = pbr_mat("HumanBlackHair", (0.07, 0.06, 0.06), 0.05, 0.82)
EYE_WHITE = pbr_mat("EyeSclera", (0.96, 0.96, 0.96), 0.0, 0.2)
EYE_PUPIL = pbr_mat("EyePupil", (0.05, 0.05, 0.05), 0.0, 0.1)
SHOE_LEATHER = pbr_mat("ShoeLeather", (0.15, 0.16, 0.18), 0.1, 0.5)

TREE_BARK = pbr_mat("MysuruTreeBark", (0.28, 0.20, 0.14), 0.0, 0.95)
LEAF_DARK = pbr_mat("MysuruLeafDark", (0.16, 0.34, 0.17), 0.0, 0.82)
LEAF_MID = pbr_mat("MysuruLeafMid", (0.23, 0.44, 0.21), 0.0, 0.80)
LEAF_BRIGHT = pbr_mat("MysuruLeafBright", (0.31, 0.52, 0.24), 0.0, 0.78)


def add_box(name, loc, dim, mat, bevel=0.02, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    return obj


def add_cyl(name, loc, radius, depth, mat, vertices=16, rot=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def add_sphere(name, loc, dim, mat, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=0.5, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def export_glb(filename: str, before_set: set):
    created = [obj for obj in bpy.data.objects if obj not in before_set]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in created:
        obj.select_set(True)
    if created:
        bpy.context.view_layer.objects.active = created[0]
        filepath = OUT / filename
        bpy.ops.export_scene.gltf(
            filepath=str(filepath),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_yup=True,
        )
        print(f"Exported: {filepath}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in created:
        bpy.data.objects.remove(obj, do_unlink=True)


# 1. MYSURU ARAMANE (AMBAVILAS PALACE)
def build_mysuru_aramane():
    before = set(bpy.data.objects)
    # Stepped granite base plinth
    add_box("AramanePlinth", (0, 0, 0.6), (48.0, 26.0, 1.2), CONCRETE_GREY, 0.08)
    # Main 3-storey Indo-Saracenic wing
    add_box("AramaneMainWing", (0, 0, 5.8), (44.0, 20.0, 9.2), PALACE_OCHRE, 0.1)
    # Central Durbar Projection
    add_box("AramaneDurbarProjection", (0, -2.0, 7.2), (18.0, 21.0, 12.0), PALACE_ROSE, 0.1)
    # Flanking East & West Pavilions
    for sx in (-18.5, 18.5):
        add_box(f"AramaneSideWing_{sx}", (sx, -1.5, 6.6), (9.0, 22.0, 10.8), PALACE_OCHRE, 0.08)

    # 9 Indo-Saracenic Arched Bays & Fluted Columns along front facade
    for idx, x in enumerate(range(-16, 18, 4)):
        add_cyl(f"FlutedPillar_{idx}", (x, -11.2, 5.2), 0.45, 8.2, PALACE_GOLD, 12)
        if x < 16:
            add_cyl(f"CuspedArch_{idx}", (x + 2.0, -10.8, 6.2), 1.4, 0.8, DARK_VOID, 12, rot=(math.pi / 2, 0, 0))
            add_box(f"DasaraBulbRow_{idx}", (x + 2.0, -11.3, 9.6), (3.8, 0.25, 0.25), PALACE_BULB, 0.02)

    # 5 Onion Domes + Drums + Kalasha Finials
    domes = [(0, -2.0, 16.2, 6.8, True), (-10.0, 0, 13.0, 4.4, False), (10.0, 0, 13.0, 4.4, False), (-18.5, -1.5, 13.8, 4.8, False), (18.5, -1.5, 13.8, 4.8, False)]
    for i, (dx, dy, dz, sz, is_main) in enumerate(domes):
        add_cyl(f"DomeDrum_{i}", (dx, dy, dz - 2.0), sz * 0.42, 2.6, PALACE_OCHRE, 16)
        add_sphere(f"OnionDome_{i}", (dx, dy, dz), (sz, sz, sz * 0.88), PALACE_GOLD if is_main else PALACE_ROSE, 20, 12)
        add_cyl(f"Kalasha_{i}", (dx, dy, dz + sz * 0.52), 0.35, 2.2, PALACE_GOLD, 10)

    export_glb("mysuru-palace.glb", before)


# 2. REALISTIC ANATOMICAL HUMAN (WITH 5-FINGER HANDS, EYES, NOSE, EARS & SHOES)
def build_anatomical_human():
    before = set(bpy.data.objects)
    # Torso & Pelvis
    add_cyl("TorsoChest", (0, 0, 1.24), 0.19, 0.44, HUMAN_SHIRT, 16, scale=(1.0, 0.65, 1.0))
    add_cyl("TorsoWaist", (0, 0, 0.92), 0.16, 0.24, HUMAN_SHIRT, 16, scale=(1.0, 0.65, 1.0))
    add_cyl("Neck", (0, 0, 1.50), 0.062, 0.13, HUMAN_SKIN, 12)

    # Head, Eyes, Pupils, Nose, Ears & Layered Wavy Hair
    add_sphere("Head", (0, 0, 1.66), (0.21, 0.23, 0.26), HUMAN_SKIN, 18, 14)
    add_sphere("HairCrown", (0, 0.01, 1.73), (0.225, 0.245, 0.18), HUMAN_HAIR, 16, 12)
    add_sphere("HairBack", (0, 0.04, 1.66), (0.21, 0.16, 0.22), HUMAN_HAIR, 14, 10)

    for side in (-1, 1):
        add_sphere(f"EyeWhite_{side}", (side * 0.045, -0.105, 1.67), (0.032, 0.02, 0.024), EYE_WHITE, 10, 8)
        add_sphere(f"EyePupil_{side}", (side * 0.045, -0.114, 1.67), (0.015, 0.01, 0.015), EYE_PUPIL, 8, 6)
        add_box(f"Eyebrow_{side}", (side * 0.045, -0.11, 1.695), (0.04, 0.012, 0.009), HUMAN_HAIR, 0.002)
        add_sphere(f"Ear_{side}", (side * 0.108, 0.0, 1.65), (0.022, 0.035, 0.052), HUMAN_SKIN, 8, 6)

    add_cyl("NoseBridge", (0, -0.116, 1.645), 0.014, 0.042, HUMAN_SKIN, 8)

    # Arms, Forearms, Palms & 5 Articulated Fingers per Hand
    for side, tag in ((-1, "L"), (1, "R")):
        sx = side * 0.235
        add_cyl(f"UpperArm_{tag}", (sx, 0, 1.30), 0.052, 0.24, HUMAN_SHIRT, 12)
        add_cyl(f"Forearm_{tag}", (sx, 0, 1.05), 0.040, 0.26, HUMAN_SKIN, 12)
        add_box(f"Palm_{tag}", (sx, 0, 0.89), (0.028, 0.068, 0.072), HUMAN_SKIN, 0.005)

        # 5 Distinct Fingers: Thumb (0) + Index (1) + Middle (2) + Ring (3) + Little (4)
        finger_y_offsets = [-0.028, -0.018, -0.005, 0.008, 0.021]
        finger_lengths = [0.036, 0.048, 0.054, 0.048, 0.038]
        for f_idx in range(5):
            flen = finger_lengths[f_idx]
            fy = finger_y_offsets[f_idx]
            if f_idx == 0:
                # Angled thumb
                add_cyl(f"Finger_{tag}_{f_idx}", (sx, fy - 0.012, 0.875), 0.0065, flen, HUMAN_SKIN, 8, rot=(0.45, 0, 0))
            else:
                add_cyl(f"Finger_{tag}_{f_idx}", (sx, fy, 0.855 - flen * 0.5), 0.0058, flen, HUMAN_SKIN, 8)

    # Legs & 5-Toe Contoured Shoes
    for side, tag in ((-1, "L"), (1, "R")):
        lx = side * 0.105
        add_cyl(f"Thigh_{tag}", (lx, 0, 0.61), 0.072, 0.42, HUMAN_DENIM, 14)
        add_cyl(f"Calf_{tag}", (lx, 0, 0.24), 0.054, 0.38, HUMAN_DENIM, 14)
        add_box(f"Shoe_{tag}", (lx, -0.045, 0.04), (0.10, 0.24, 0.08), SHOE_LEATHER, 0.018)

    export_glb("mysuru-human.glb", before)


# 3. INDIAN AUTO-RICKSHAW
def build_auto_rickshaw():
    before = set(bpy.data.objects)
    add_box("AutoRearBody", (0, 0.35, 0.62), (1.36, 1.45, 0.78), AUTO_GREEN, 0.06)
    add_box("AutoYellowWaist", (0, 0.35, 1.02), (1.40, 1.48, 0.32), AUTO_YELLOW, 0.04)
    add_cyl("AutoFrontNose", (0, -0.68, 0.68), 0.42, 0.88, AUTO_YELLOW, 14)
    add_box("AutoWindshield", (0, -0.58, 1.32), (1.18, 0.06, 0.52), MALL_GLASS, 0.01, rot=(0.22, 0, 0))
    add_cyl("AutoCanopyHood", (0, 0.15, 1.66), 0.69, 1.85, CANVAS_BLACK, 14, rot=(math.pi / 2, 0, 0), scale=(1.0, 1.0, 0.34))

    for idx, (wx, wy) in enumerate(((0, -0.88), (-0.66, 0.72), (0.66, 0.72))):
        add_cyl(f"AutoWheel_{idx}", (wx, wy, 0.28), 0.28, 0.20, TYRE_RUBBER, 14, rot=(0, math.pi / 2, 0))
        add_cyl(f"AutoRim_{idx}", (wx, wy, 0.28), 0.14, 0.22, CHROME_METAL, 10, rot=(0, math.pi / 2, 0))

    export_glb("auto-rickshaw.glb", before)


# 4. KSRTC GOVERNMENT BUS
def build_ksrtc_bus():
    before = set(bpy.data.objects)
    add_box("KsrtcLowerChassis", (0, 0, 1.25), (2.55, 9.6, 1.55), KSRTC_RED, 0.06)
    add_box("KsrtcUpperCabin", (0, 0, 2.65), (2.52, 9.5, 1.35), KSRTC_CREAM, 0.06)
    add_box("KsrtcWindowBand", (0, 0, 2.62), (2.56, 8.4, 0.88), MALL_GLASS, 0.02)
    add_box("KsrtcWindshield", (0, -4.76, 2.45), (2.28, 0.10, 1.05), MALL_GLASS, 0.02)
    for idx, (wx, wy) in enumerate(((-1.22, -3.1), (1.22, -3.1), (-1.22, 2.8), (1.22, 2.8))):
        add_cyl(f"BusTyre_{idx}", (wx, wy, 0.49), 0.49, 0.36, TYRE_RUBBER, 16, rot=(0, math.pi / 2, 0))
    export_glb("ksrtc-bus.glb", before)


# 5. LOCAL MYSURU STOREFRONT & MALL BLOCK
def build_mysuru_storefront():
    before = set(bpy.data.objects)
    add_box("StoreMainStructure", (0, 0, 5.4), (13.5, 12.0, 10.8), STORE_PLASTER, 0.05)
    for level_z in (3.6, 7.2, 10.8):
        add_box(f"ChajjaLedge_{level_z}", (0, -6.2, level_z), (14.0, 0.9, 0.28), CONCRETE_GREY, 0.02)
    add_box("ShopSignboard", (0, -6.12, 3.1), (12.6, 0.22, 0.95), SIGN_RED, 0.02)
    for sx in (-4.0, 0.0, 4.0):
        add_box(f"RollingShutter_{sx}", (sx, -6.04, 1.35), (3.2, 0.12, 2.5), SHUTTER_STEEL, 0.01)
    export_glb("mysuru-storefront.glb", before)


# 6. MULTI-LEAF REALISTIC MYSURU TREE
def build_mysuru_tree():
    before = set(bpy.data.objects)
    add_cyl("TreeTrunk", (0, 0, 2.1), 0.34, 4.2, TREE_BARK, 10)
    clusters = [
        (0, 0, 5.8, (5.2, 5.0, 2.2), LEAF_DARK),
        (-2.2, 1.2, 5.2, (4.2, 3.8, 1.8), LEAF_MID),
        (2.2, -1.1, 5.3, (4.2, 3.8, 1.8), LEAF_BRIGHT),
        (-1.6, -1.8, 5.5, (3.8, 3.6, 1.7), LEAF_MID),
        (1.8, 1.8, 5.4, (3.9, 3.7, 1.7), LEAF_DARK),
    ]
    for i, (cx, cy, cz, dim, mat_leaf) in enumerate(clusters):
        add_sphere(f"LeafCanopy_{i}", (cx, cy, cz), dim, mat_leaf, 10, 8)
    export_glb("mysuru-tree.glb", before)


build_mysuru_aramane()
build_anatomical_human()
build_auto_rickshaw()
build_ksrtc_bus()
build_mysuru_storefront()
build_mysuru_tree()
print(f"All Namma Mysuru GLB assets exported to: {OUT}")