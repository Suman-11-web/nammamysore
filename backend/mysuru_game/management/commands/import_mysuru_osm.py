from django.contrib.gis.geos import LineString
from django.core.management.base import BaseCommand, CommandError
import requests

from mysuru_game.models import RoadSegment


class Command(BaseCommand):
    help = "Import Mysuru highway ways in the game area from OpenStreetMap's Overpass API."

    def add_arguments(self, parser):
        parser.add_argument("--bbox", default="12.25,76.60,12.35,76.72", help="south,west,north,east")
        parser.add_argument("--endpoint", help="use one Overpass server instead of trying the public servers in order")
        parser.add_argument("--force", action="store_true", help="refresh rows even when road data already exists")

    def handle(self, *args, **options):
        try:
            south, west, north, east = (float(value) for value in options["bbox"].split(","))
        except (ValueError, TypeError):
            raise CommandError("bbox must be south,west,north,east")
        if RoadSegment.objects.exists() and not options["force"]:
            self.stdout.write("Mysuru OSM roads are already imported; pass --force to refresh them.")
            return
        query = f'[out:json][timeout:180];way["highway"]({south},{west},{north},{east});out tags geom;'
        endpoints = [options["endpoint"]] if options["endpoint"] else [
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass-api.de/api/interpreter",
        ]
        last_error = None
        for endpoint in endpoints:
            try:
                response = requests.post(
                    endpoint,
                    data={"data": query},
                    headers={"User-Agent": "MysuruAfterHours/0.1 (local game prototype)"},
                    timeout=210,
                )
                response.raise_for_status()
                ways = response.json().get("elements", [])
                break
            except (requests.RequestException, ValueError) as error:
                last_error = error
        else:
            raise CommandError(f"Overpass request failed: {last_error}") from last_error

        imported = 0
        for way in ways:
            geometry = way.get("geometry") or []
            if len(geometry) < 2:
                continue
            coords = [(point["lon"], point["lat"]) for point in geometry]
            tags = way.get("tags", {})
            RoadSegment.objects.update_or_create(
                osm_id=way["id"],
                defaults={
                    "name": tags.get("name", ""),
                    "road_class": tags.get("highway", "road"),
                    "geometry": LineString(*coords, srid=4326),
                },
            )
            imported += 1
        self.stdout.write(self.style.SUCCESS(f"Imported {imported:,} Mysuru road segments from OpenStreetMap."))
