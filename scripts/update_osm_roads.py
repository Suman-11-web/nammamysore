#!/usr/bin/env python3
"""Fetch OSM roads and save a compact GeoJSON snapshot for the browser game."""

import argparse
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "mysuru-roads.geojson"
# In scripts/update_osm_roads.py, update lines 15 and 79:
BBOX = (12.255, 76.605, 12.348, 76.715)  # Expanded to cover Kukkarahalli to Chamundi Hill & Karanji Lake  # south, west, north, east
MAJOR = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link"}
DRIVABLE = MAJOR | {"residential", "unclassified", "living_street", "service", "road"}
PRIORITY = {name: index for index, name in enumerate(("motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link"))}


def read_source(input_path: Optional[str]) -> dict:
    if input_path:
        with open(input_path, encoding="utf-8") as source:
            return json.load(source)
    south, west, north, east = BBOX
    query = f'[out:json][timeout:180];way["highway"]({south},{west},{north},{east});out tags geom;'
    body = urllib.parse.urlencode({"data": query}).encode()
    endpoints = (
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
    )
    last_error = None
    for endpoint in endpoints:
        request = urllib.request.Request(
            endpoint,
            data=body,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "MysuruAfterHours/0.1 (browser game map refresh)",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                return json.loads(response.read())
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
            last_error = error
    raise RuntimeError(f"Could not reach an OpenStreetMap Overpass server: {last_error}")


def make_feature(way: dict) -> Optional[dict]:
    tags = way.get("tags", {})
    road_class = tags.get("highway")
    geometry = way.get("geometry", [])
    if road_class not in DRIVABLE or len(geometry) < 2:
        return None
    coordinates = [[point["lon"], point["lat"]] for point in geometry]
    return {
        "type": "Feature",
        "id": way["id"],
        "properties": {"osm_id": way["id"], "name": tags.get("name", ""), "road_class": road_class},
        "geometry": {"type": "LineString", "coordinates": coordinates},
    }



def compact_roads(source: dict, local_limit: int = 1400) -> list[dict]:
    major, local = [], {}
    bins = 12
    south, west, north, east = BBOX
    for way in source.get("elements", []):
        feature = make_feature(way)
        if not feature:
            continue
        road_class = feature["properties"]["road_class"]
        if road_class in MAJOR:
            major.append(feature)
            continue
        coords = feature["geometry"]["coordinates"]
        midpoint = coords[len(coords) // 2]
        ix = min(bins - 1, max(0, int((midpoint[0] - west) / (east - west) * bins)))
        iy = min(bins - 1, max(0, int((midpoint[1] - south) / (north - south) * bins)))
        local.setdefault((ix, iy), []).append(feature)

    major.sort(key=lambda feature: (PRIORITY.get(feature["properties"]["road_class"], 99), feature["id"]))
    for candidates in local.values():
        candidates.sort(key=lambda feature: (-len(feature["geometry"]["coordinates"]), feature["id"]))

    # Round-robin across small map cells so local streets cover all neighbourhoods.
    selected = []
    cells = sorted(local)
    while len(selected) < local_limit and cells:
        next_cells = []
        for cell in cells:
            roads = local[cell]
            if roads:
                selected.append(roads.pop(0))
            if roads:
                next_cells.append(cell)
            if len(selected) >= local_limit:
                break
        cells = next_cells
    return major + selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", help="use a saved Overpass JSON response instead of downloading")
    parser.add_argument("--local-limit", type=int, default=760, help="number of geographically sampled neighborhood roads")
    args = parser.parse_args()
    source = read_source(args.input)
    features = compact_roads(source, max(0, args.local_limit))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = {
        "type": "FeatureCollection",
        "name": "Mysuru streets",
        "license": "Open Database License 1.0",
        "attribution": "© OpenStreetMap contributors",
        "features": features,
    }
    OUTPUT.write_text(json.dumps(document, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {len(features):,} road segments ({OUTPUT.stat().st_size / 1024:.0f} KB) to {OUTPUT}")


if __name__ == "__main__":
    main()
