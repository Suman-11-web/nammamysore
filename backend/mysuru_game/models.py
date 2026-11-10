from django.conf import settings
from django.contrib.gis.db import models


class PlayerProgress(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_progress")
    cash = models.PositiveIntegerField(default=1250)
    completed_missions = models.JSONField(default=list, blank=True)
    active_mission = models.CharField(max_length=80, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} — ₹{self.cash}"


class RoadSegment(models.Model):
    osm_id = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=180, blank=True)
    road_class = models.CharField(max_length=32, db_index=True)
    geometry = models.LineStringField(srid=4326, spatial_index=True)

    def __str__(self):
        return self.name or f"OSM road {self.osm_id}"


class MysuruPlace(models.Model):
    osm_id = models.BigIntegerField(unique=True, null=True, blank=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=48, blank=True)
    location = models.PointField(srid=4326, spatial_index=True)

    def __str__(self):
        return self.name
