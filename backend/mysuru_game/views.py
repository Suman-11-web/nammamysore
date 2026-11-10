import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .models import PlayerProgress, RoadSegment

DEFAULT_PROGRESS = {"cash": 1250, "completed": [], "active": ""}


def _payload(request):
    try:
        return json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"ready": True})


@require_GET
def auth_status(request):
    return JsonResponse({"authenticated": request.user.is_authenticated, "email": request.user.email if request.user.is_authenticated else None})


@require_POST
def signup(request):
    data = _payload(request)
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    User = get_user_model()
    if "@" not in email or len(password) < 8:
        return JsonResponse({"error": "Enter a valid email and a password with at least 8 characters."}, status=400)
    if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
        return JsonResponse({"error": "An account with that email already exists. Sign in instead."}, status=409)
    user = User.objects.create_user(username=email, email=email, password=password)
    login(request, user)
    return JsonResponse({"authenticated": True, "email": user.email})


@require_POST
def login_view(request):
    data = _payload(request)
    email = str(data.get("email", "")).strip().lower()
    user = authenticate(request, username=email, password=str(data.get("password", "")))
    if user is None:
        return JsonResponse({"error": "That email and password didn’t match. Try again."}, status=401)
    login(request, user)
    return JsonResponse({"authenticated": True, "email": user.email})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"authenticated": False})


@require_http_methods(["GET", "POST"])
def progress(request):
    if request.method == "POST":
        return save_progress(request)
    if request.user.is_authenticated:
        saved, _ = PlayerProgress.objects.get_or_create(user=request.user)
        return JsonResponse({"cash": saved.cash, "completed": saved.completed_missions, "active": saved.active_mission})
    return JsonResponse(request.session.get("game_progress", DEFAULT_PROGRESS))


@require_POST
def save_progress(request):
    data = _payload(request)
    try:
        current = {
            "cash": max(0, min(int(data.get("cash", 1250)), 99999999)),
            "completed": [str(item)[:80] for item in data.get("completed", []) if isinstance(item, str)][:100],
            "active": str(data.get("active", "palace-parcel"))[:80],
        }
    except (TypeError, ValueError):
        return JsonResponse({"error": "That save could not be read."}, status=400)
    if request.user.is_authenticated:
        PlayerProgress.objects.update_or_create(user=request.user, defaults={"cash": current["cash"], "completed_missions": current["completed"], "active_mission": current["active"]})
    else:
        request.session["game_progress"] = current
    return JsonResponse(current)


@require_GET
def map_data(request):
    features = []
    roads = RoadSegment.objects.only("name", "road_class", "geometry").order_by("osm_id")[:1800]
    for road in roads:
        features.append({
            "type": "Feature",
            "properties": {"name": road.name, "road_class": road.road_class},
            "geometry": {"type": "LineString", "coordinates": list(road.geometry.coords)},
        })
    return JsonResponse({"type": "FeatureCollection", "features": features})
