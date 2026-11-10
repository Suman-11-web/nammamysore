
import json
import os

import osmnx as ox
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Polygon, MultiPolygon

# Mysore Palace area — first test region
CENTER_LAT = 12.3052
CENTER_LON = 76.6552
RADIUS_METERS = 900

# Mysuru is in UTM zone 43N.
TARGET_CRS = "EPSG:32643"

# Output goes into the Babylon viewer's public folder.
OUTPUT_FILE = "../map-viewer/public/data/mysuru-map.json"

ox.settings.use_cache = True
ox.settings.log_console = True

print("Downloading Mysuru road network...")
graph = ox.graph_from_point(
    (CENTER_LAT, CENTER_LON),
    dist=RADIUS_METERS,
    network_type="drive",
    simplify=True
)

print("Downloading building footprints...")
buildings_gdf = ox.features_from_point(
    (CENTER_LAT, CENTER_LON),
    tags={"building": True},
    dist=RADIUS_METERS
)

roads_gdf = ox.graph_to_gdfs(
    graph,
    nodes=False,
    edges=True
)

print("Projecting geographic data into metres...")
roads_gdf = roads_gdf.to_crs(TARGET_CRS)
buildings_gdf = buildings_gdf.to_crs(TARGET_CRS)

transformer = Transformer.from_crs(
    "EPSG:4326",
    TARGET_CRS,
    always_xy=True
)

origin_x, origin_y = transformer.transform(CENTER_LON, CENTER_LAT)


def local_coords(line):
    return [
        [
            round(x - origin_x, 2),
            round(y - origin_y, 2)
        ]
        for x, y in line.coords
    ]


def get_height(tags):
    height = tags.get("height")

    if height is not None:
        try:
            # Handles common values such as "12" and "12 m".
            return max(3.0, float(str(height).lower().replace("m", "").strip()))
        except (ValueError, TypeError):
            pass

    levels = tags.get("building:levels")

    if levels is not None:
        try:
            return max(3.0, float(levels) * 3.2)
        except (ValueError, TypeError):
            pass

    # Approximation where OSM has no height information.
    return 8.5


roads = []

for _, row in roads_gdf.iterrows():
    geometry = row.geometry

    if geometry is None:
        continue

    if isinstance(geometry, LineString):
        lines = [geometry]
    elif isinstance(geometry, MultiLineString):
        lines = list(geometry.geoms)
    else:
        continue

    highway = row.get("highway", "residential")

    if isinstance(highway, list):
        highway = highway[0] if highway else "residential"

    for line in lines:
        coords = local_coords(line)

        if len(coords) >= 2:
            roads.append({
                "highway": str(highway),
                "coords": coords
            })


building_items = []

for _, row in buildings_gdf.iterrows():
    geometry = row.geometry

    if geometry is None:
        continue

    if isinstance(geometry, Polygon):
        polygons = [geometry]
    elif isinstance(geometry, MultiPolygon):
        polygons = list(geometry.geoms)
    else:
        continue

    tags = row.to_dict()
    height = get_height(tags)

    for polygon in polygons:
        if polygon.area < 12:
            continue

        ring = local_coords(polygon.exterior)

        if len(ring) >= 4:
            building_items.append({
                "height": height,
                "ring": ring
            })


result = {
    "center": {
        "latitude": CENTER_LAT,
        "longitude": CENTER_LON,
        "radius_meters": RADIUS_METERS
    },
    "roads": roads,
    "buildings": building_items
}

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
    json.dump(result, file)

print("\nExtraction complete!")
print("Road segments:", len(roads))
print("Building footprints:", len(building_items))
print("Saved to:", OUTPUT_FILE)
