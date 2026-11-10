# Mysuru After Hours

A playable browser-game prototype set across Mysuru. It takes its city-game cue from [Benglooru](https://benglooru.com/) and uses the supplied Mysuru screenshot itself as the in-game map image.

## Run the game

Install Node.js 20 or newer, then run this from the project folder:

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. The game includes bundled Mysuru OpenStreetMap roads, the supplied map screenshot, and local landmark photos, so the chapter works without an account or database. Progress is saved in this browser. Use **W A S D** or the arrow keys to walk and drive, and press **E** near the yellow auto to get in or out. **Space** slows you down.

The landing screen opens a short photo-led city trailer and a four-scene preview. The supplied music tracks play in order; browsers that block sound until a user gesture start the playlist when you choose **Enter Mysuru**. The sound button pauses or resumes it.

To refresh the bundled road data while online:

```sh
npm run map:update
```

This requests road geometry from the OpenStreetMap Overpass API and updates `public/data/mysuru-roads.geojson`.

## Run in Docker with lower laptop load

Stop any host Vite server with `Ctrl+C`, then run the game-only container:

```sh
docker compose -f compose.lite.yaml up
```

Open `http://localhost:5174`. This uses the bundled OSM map and browser saves; it does not start Django, GDAL, or PostGIS. Stop it with `Ctrl+C`. The 3D scene is also capped at 30 FPS to reduce GPU load.

## Optional accounts and PostGIS

The full backend stack is more demanding. On Apple Silicon, its official PostGIS image runs under emulation; use it only when you need Django accounts or database-backed saves:

```sh
docker compose --profile full up --build
```

Open `http://localhost:5173`. The first startup downloads the app and PostGIS images, creates the database, imports Mysuru roads, and starts the game. The backend adds accounts, database-backed progress, and the PostGIS road API; the frontend still falls back to the bundled road snapshot if the API or Overpass is unavailable.

The game has third-person walking and auto driving, simple traffic, animated pedestrians, three delivery jobs, and a live map popup with a moving marker and closest named road from the local OSM data. The dashboard keeps the attached map screenshot. The 3D chapter concentrates on the central Mysuru streets and nearby landmark areas; the upcoming city list is Mysuru Zoo, Karanji Lake, and Brindavan Gardens. Weather uses Open-Meteo when reachable and otherwise shows a local fallback. Stop the containers with `Ctrl+C`; run `docker compose down` to stop and remove them. Road data and saves stay in the PostGIS volume. To refresh the database roads later:

```sh
docker compose exec backend python manage.py import_mysuru_osm --force
```

Then reload the browser to rebuild the 3D city from the updated road data.

To run the backend without Docker, install PostGIS and follow these steps:

```sh
brew install gdal
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations mysuru_game
python manage.py migrate
python manage.py runserver
```

Homebrew installs GDAL along with the GEOS and PROJ libraries GeoDjango needs; the settings file detects their standard Homebrew paths on macOS. Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and `POSTGRES_PORT` for the local PostGIS database. Enable the PostGIS extension in that database before migrating (`CREATE EXTENSION postgis;`). To connect the frontend to a separately running Django server on port 8000, start Vite with `VITE_BACKEND_URL=http://127.0.0.1:8000 npm run dev`. Without that setting, the frontend uses its bundled OSM roads and browser storage without API proxy errors.

To import Mysuru highway and street geometry into PostGIS, run:

```sh
python manage.py import_mysuru_osm
```

The importer uses OpenStreetMap's Overpass API and stores `LineString` road geometry in PostGIS. The supplied screenshot is used as the game map, with clickable hotspots over its palace, cathedral, and Chamundi Temple markers. Imported OSM streets form the 3D road network. Weather is read from Open-Meteo for Mysuru and falls back to a warm evening if the service is unavailable.

Blender is optional for the first run. To export the low-poly palace, cathedral, Chamundi temple, and auto-rickshaw assets into `public/assets`, run `blender -b --python assets/blender/build_asset_pack.py`. Babylon.js loads those GLB models when they are present and keeps its procedural versions as a fallback. Real landmark photographs are included in `public/assets/places`; their photographers, source pages, and licenses are listed in [ATTRIBUTIONS.md](public/assets/places/ATTRIBUTIONS.md).

## What is wired up

- HTML5 canvas game view with CSS3 interface and TypeScript controls.
- Babylon.js city scene, WebGPU preference with WebGL 2 fallback.
- Third-person follow camera and light ambient traffic for an open-world driving feel.
- The attached Mysuru map image, with clickable palace, cathedral and Chamundi Temple hotspots.
- OpenStreetMap import command, GeoJSON API and geographic PostGIS models.
- Open-Meteo current conditions, Django account endpoints and saved mission progress.
- Procedural city blocks and an auto-rickshaw, so the first visit is immediately playable without downloaded 3D assets.
