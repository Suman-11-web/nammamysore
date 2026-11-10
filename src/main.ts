// src/main.ts
import { createWorld, type WorldStatus } from './world';
import {
  MYSURU_LANDMARKS,
  TOTAL_DISCOVERABLE_PLACES,
  gpsToSvgPixel,
  svgPixelToGps,
  renderDaariMysuruMap,
  type MapCollection,
  type MapFeature,
} from './map-architecture';
import type { LoadedMysuruMap } from './world/map/MapTypes';
import './style.css';
const MAP_READY_FOR_PLAY = false;
const app = document.querySelector<HTMLDivElement>('#app')!;
const initial = {
  cash: 0,
  completed: [] as string[],
  active: '',
  player: 'Guest rider',
  discovered: ['market', 'palace'] as string[],
};

const missions = [
  {
    id: 'palace-parcel',
    title: 'Get to Ambavilas Palace North Gate',
    shortTitle: 'A parcel for the palace caretaker',
    description: 'Aunty at Devaraja Market has one last Mysuru Mallige parcel before she closes. The palace guard is waiting.',
    reward: 450,
    time: '07 MIN',
    distance: '1.2 KM',
    destination: 'Mysuru Palace',
    kannadaZone: 'ಮೈಸೂರು ಅರಮನೆ',
  },
  {
    id: 'coffee-delivery',
    title: 'Deliver two filter coffees to St. Philomena’s',
    shortTitle: 'Two filter coffees before the bells',
    description: 'A double degree-coffee order for the cathedral gate. Keep the brass tumblers upright past K.R. Circle.',
    reward: 200,
    time: '08 MIN',
    distance: '1.8 KM',
    destination: 'St. Philomena’s Cathedral',
    kannadaZone: 'ಸೇಂಟ್ ಫಿಲೋಮಿನಾ ಚರ್ಚ್',
  },
  {
    id: 'golden-photo',
    title: 'Climb Chamundi Hill before the lights dim',
    shortTitle: 'Golden-hour photo for Nandu',
    description: 'Nandu wants one last picture of the palace lights from Chamundi Hill summit. Take the hairpin road.',
    reward: 300,
    time: '18 MIN',
    distance: '5.0 KM',
    destination: 'Chamundeshwari Temple',
    kannadaZone: 'ಚಾಮುಂಡೇಶ್ವರಿ ದೇವಸ್ಥಾನ',
  },
];

let progress = { ...initial };
let activeMission = false;
let activeMissionId: string | null = null;
let missionIndex = 0;
let world: Awaited<ReturnType<typeof createWorld>> | null = null;
let loadedRealMap: LoadedMysuruMap | null = null;

let currentPlayerGps = { lat: 12.3130, lon: 76.6540 };
let customWaypointGps: { lat: number; lon: number } | null = null;
let mapZoom = 1;
let mapPan = { x: 0, y: 0 };

app.innerHTML = `
  <!-- =====================================================================
       1. LANDING PAGE: NAMMA MYSURU (PRESERVED)
       ===================================================================== -->
  <section class="intro-screen" id="intro-screen" aria-label="Namma Mysuru Landing Page">
    <div class="namma-hero">
      <img class="intro-photo" src="/assets/places/mysuru-palace.jpg" alt="Mysuru Palace at dusk" />
      <div class="intro-shade"></div>

      <header class="namma-topnav">
        <div class="topnav-left">
          <button class="ost-pill" id="landing-music-toggle" title="Toggle Namma Mysuru Soundtrack">
            <span class="eq-bars" id="landing-eq"><i></i><i></i><i></i></span>
            <span id="landing-music-state">SOUND ON</span>
          </button>
          <button class="ost-skip" id="landing-music-next" title="Switch track (music1 / music2)">⏭</button>
        </div>

        <nav class="topnav-links" aria-label="Landing sections">
          <a href="#section-trailer">Trailer</a>
          <a href="#section-city">The city</a>
          <a href="#section-game">The game</a>
          <a href="#section-howto">How to play</a>
          <a href="#section-footer">Press</a>
          <button class="nav-play-btn" data-trigger="enter-game">Coming Soon</button>
        </nav>
      </header>

      <div class="namma-hero-content">
        <div class="namma-logo-badge" aria-label="Namma Mysuru">
          <span class="logo-petals"><i></i><b></b></span>
          <span class="logo-line-1">NAMMA</span>
          <span class="logo-line-2">MYSURU</span>
          <span class="logo-road-swoosh"></span>
        </div>

        <h1 class="namma-hero-headline">
          MYSURU, NOW<br/>
          <span class="underline-brush">PLAYABLE</span> IN YOUR BROWSER.
        </h1>

        <div class="namma-hero-ctas">
          <button class="btn-play-free" id="enter-city" data-trigger="enter-game">
            <span>Coming Soon</span>
            <kbd>LOCKED</kbd>
          </button>
          <button class="btn-vote-full" id="hero-vote-btn">
            <span>🗳 Vote for the full version</span>
          </button>
          <button class="btn-open-daari" id="landing-open-map">
            <span>⌖ Open Daari Map</span>
          </button>
        </div>

        <p class="namma-hero-specs">
          Free &nbsp;•&nbsp; No download &nbsp;•&nbsp; No sign-up &nbsp;•&nbsp; Runs on most laptops
        </p>
      </div>

      <a href="#section-trailer" class="scroll-cue" aria-label="Scroll down">
        <span>SCROLL</span>
        <i></i>
      </a>

      <div class="ingame-footage-pill">
        <span class="footage-dot"></span> IN-GAME FOOTAGE
      </div>
    </div>

    <!-- TRAILER SECTION -->
    <section class="namma-section trailer-showcase-section" id="section-trailer">
      <div class="namma-container">
        <h2 class="condensed-display-title">
          EIGHTY-NINE SECONDS<br/>
          OF <span>MYSURU</span>
        </h2>
        <p class="section-lead">
          Mayflower evenings, a three-wheeled auto with opinions, and a chase past K.R. Circle.
          <strong>Every frame is the game itself.</strong> Sound on.
        </p>

        <div class="inline-video-player" id="inline-video-player">
          <video id="custom-trailer-video" poster="/assets/places/mysuru-palace.jpg" preload="none" playsinline>
            <source src="/assets/trailer.mp4" type="video/mp4" />
          </video>

          <div class="video-fallback-stage" id="video-fallback-stage">
            <img id="fallback-slide-img" src="/assets/places/mysuru-palace.jpg" alt="Mysuru in-game scene" />
            <div class="video-fallback-vignette"></div>
            <div class="video-scene-caption">
              <span class="scene-pill" id="fallback-scene-tag">SCENE 01 / 04 · AMBAVILAS PALACE</span>
              <h3 id="fallback-scene-heading">97,000 bulbs on a Sunday evening.</h3>
              <p id="fallback-scene-sub">Drive from Devaraja Market past K.R. Circle as the palace lights switch on.</p>
            </div>
            <button class="video-center-play" id="video-center-play" aria-label="Play trailer preview">▶</button>
          </div>

          <div class="video-control-bar">
            <button class="vc-btn" id="vc-play-toggle" aria-label="Play or pause trailer">▶</button>
            <span class="vc-time" id="vc-time">0:00 / 1:29</span>
            <div class="vc-timeline" id="vc-timeline">
              <div class="vc-progress" id="vc-progress" style="width: 0%"></div>
            </div>
            <button class="vc-btn" id="vc-sound-toggle" title="Toggle soundtrack">🔊</button>
            <button class="vc-btn" id="vc-fullscreen" title="Fullscreen">⛶</button>
          </div>
        </div>
      </div>
    </section>

    <!-- CITY SHOWCASE -->
    <section class="namma-section city-showcase-section" id="section-city">
      <div class="namma-container">
        <div class="section-split-head">
          <div>
            <h2 class="condensed-display-title">
              CHAPTER 01:<br/>
              <span>DEVARAJA TO CHAMUNDI</span>
            </h2>
            <p class="section-lead" id="section-game">
              Real OpenStreetMap geometry of Mysuru turned into a stylised evening sandbox.
              Pick up parcels at Devaraja Market, grab Mysore Pak on Sayyaji Rao Road, or climb the hairpin bends to Chamundi Hill.
            </p>
          </div>
          <button class="btn-play-free" id="landing-open-map-2">
            <span>⌖ Explore Daari Map (28 Places)</span>
          </button>
        </div>

        <div class="mysuru-cards-grid">
          <article class="mysuru-spot-card" data-spot="palace">
            <img src="/assets/places/mysuru-palace.jpg" alt="Ambavilas Palace" />
            <div class="spot-card-body">
              <small>ROYAL QUARTER · ಮೈಸೂರು ಅರಮನೆ</small>
              <h3>Ambavilas Palace & K.R. Circle</h3>
              <p>Drive around the illuminated Indo-Saracenic colonnades, Hardinge Circle, and clock tower.</p>
            </div>
          </article>
          <article class="mysuru-spot-card" data-spot="cathedral">
            <img src="/assets/places/st-philomena.jpg" alt="St. Philomena’s Cathedral" />
            <div class="spot-card-body">
              <small>ASHOKA ROAD · ಸೇಂಟ್ ಫಿಲೋಮಿನಾ</small>
              <h3>St. Philomena’s Twin Spires</h3>
              <p>Deliver steaming brass tumblers of filter coffee up Ashoka Road before the evening bells.</p>
            </div>
          </article>
          <article class="mysuru-spot-card" data-spot="chamundi">
            <img src="/assets/places/chamundeshwari-temple.jpg" alt="Chamundi Hill" />
            <div class="spot-card-body">
              <small>1,062M SUMMIT · ಚಾಮುಂಡಿ ಬೆಟ್ಟ</small>
              <h3>Chamundi Hill & Nandi</h3>
              <p>Test your three-wheeler up the ghat road past the monolithic Nandi for a panoramic city view.</p>
            </div>
          </article>
        </div>

        <div class="howto-strip" id="section-howto">
          <div class="howto-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span>Walk or steer your auto-rickshaw</span></div>
          <div class="howto-item"><kbd>E</kbd> <span>Hop in / step out of nearby yellow auto</span></div>
          <div class="howto-item"><kbd>SPACE</kbd> <span>Handbrake / slow down</span></div>
          <div class="howto-item"><kbd>M</kbd> <span>Open Daari live city map & waypoints</span></div>
        </div>
      </div>
    </section>

    <!-- PRE-FOOTER BANNER -->
    <section class="namma-prefooter">
      <div class="namma-container prefooter-inner">
        <div class="prefooter-left">
          <div class="social-pills-row">
            <a href="https://www.instagram.com/_namma_mysore/" target="_blank" rel="noreferrer" class="social-pill">◎ Instagram</a>
            <a href="#section-trailer" class="social-pill">▶ YouTube</a>
          </div>
          <p class="prefooter-question">This is our first draft. Want the full Mysuru game, on PC and phone?</p>
          <button class="btn-vote-full" id="prefooter-vote-btn">Vote for the full version</button>
        </div>

        <div class="prefooter-right">
          <div class="rajyotsava-frame">
            <img src="/assets/places/mysuru-palace.jpg" alt="Kannada Rajyotsava in Namma Mysuru" />
            <span class="corner-br tl"></span>
            <span class="corner-br tr"></span>
            <span class="corner-br bl"></span>
            <span class="corner-br br"></span>
          </div>
          <strong class="kannada-greeting">ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಶುಭಾಶಯಗಳು</strong>
          <small class="kannada-sub">Happy Kannada Rajyotsava, on the big screen, in the game.</small>
        </div>
      </div>
    </section>

    <!-- DARK FOOTER -->
    <footer class="namma-footer" id="section-footer">
      <div class="namma-container">
        <div class="footer-grid">
          <div class="footer-brand-col">
            <div class="namma-logo-badge small">
              <span class="logo-petals"><i></i><b></b></span>
              <span class="logo-line-1">NAMMA</span>
              <span class="logo-line-2">MYSURU</span>
              <span class="logo-road-swoosh"></span>
            </div>
            <p>
              Namma Mysuru is a free open-world game set in a stylised Mysuru (Mysore),
              played in your laptop’s browser. No download, no sign-up.
              <strong>Chapter 1: Devaraja Market & Palace Quarter.</strong>
            </p>
          </div>

          <ul class="footer-links-col">
            <li><a href="#" data-trigger="enter-game">Play</a></li>
            <li><a href="#section-howto">How to play</a></li>
            <li><a href="#" data-trigger="enter-game">Missions</a></li>
            <li><a href="#" id="footer-open-map">The map</a></li>
            <li><a href="#section-city">What’s new</a></li>
            <li><a href="#" data-trigger="enter-game">Free, no download</a></li>
            <li><a href="#section-city">About</a></li>
            <li><a href="#photo-credits">Credits</a></li>
          </ul>

          <ul class="footer-links-col">
            <li><a href="#section-trailer">Trailer</a></li>
            <li><a href="#" id="footer-cheats-link">Cheats</a></li>
            <li><a href="#" data-trigger="enter-game">Jobs</a></li>
            <li><a href="#" data-trigger="enter-game">Vehicles</a></li>
            <li><a href="#section-city">Indian open-world game</a></li>
            <li><a href="https://thesuman.in" target="_blank" rel="noreferrer">Press kit</a></li>
            <li><a href="#section-footer">Privacy</a></li>
          </ul>

          <div class="footer-follow-col">
            <span class="footer-eyebrow">FOLLOW THE CITY</span>
            <div class="footer-social-squares">
              <a href="https://www.instagram.com/_namma_mysore/" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
              <a href="#section-trailer" aria-label="YouTube">▶</a>
            </div>
            <p class="footer-contact-line">Something broke? <a href="mailto:sumanofficial.dev@gmail.com">Report a bug</a></p>
            <p class="footer-contact-line">Press and everything else: <a href="mailto:sumanofficial.dev@gmail.com">sumanofficial.dev@gmail.com</a></p>
          </div>
        </div>

        <div class="footer-legal" id="photo-credits">
          <p>All footage is in-game. Every shop and brand in the game is a parody; Namma Mysuru is a work of fiction.</p>
          <p>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. Live weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>.</p>
          <p>© 2026 Namma Mysuru. Made in Mysuru.</p>
        </div>
      </div>
    </footer>
  </section>

  <audio id="city-music" preload="auto"></audio>

  <!-- =====================================================================
       2. SCREENSHOT 1: ILLUSTRATED FULL-SCREEN LOADING OVERLAY (0% -> 100%)
       ===================================================================== -->
  <section class="benglooru-loader" id="stage-loader" aria-live="polite">
    <img class="loader-bg-art" src="/assets/places/mysuru-palace.jpg" alt="Loading Namma Mysuru" />
    <div class="loader-rain-overlay"></div>
    <div class="loader-vignette"></div>

    <div class="loader-content">
      <div class="namma-logo-badge loader-logo">
        <span class="logo-petals"><i></i><b></b></span>
        <span class="logo-line-1">NAMMA</span>
        <span class="logo-line-2">MYSURU</span>
        <span class="logo-road-swoosh"></span>
      </div>

      <div class="loader-bottom-bar">
        <p class="loader-flavor-text" id="loader-flavor-text">Waiting for the KSRTC Dasara Volvos...</p>
        <div class="loader-progress-track">
          <div class="loader-progress-fill" id="loader-progress-fill" style="width: 15%">
            <span class="loader-bus-icon" aria-hidden="true">🚌</span>
          </div>
        </div>
        <div class="loader-meta-row">
          <span class="loader-zone-label" id="loader-sub-stage">Loading Devaraja Market & Palace Quarter</span>
          <strong class="loader-percent" id="loader-percent">15%</strong>
        </div>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       3. SCREENSHOT 2: FULL-BLEED 3D HUMAN-EYE STREET VIEW & FLOATING HUD
       ===================================================================== -->
  <div class="app-shell" id="stage">
    <canvas id="game-canvas" aria-label="Playable 3D Mysuru city"></canvas>

    <!-- Top-Left Mission Objective ("/ Get on the scooter") -->
    <div class="hud-top-left">
      <span class="hud-slash">/</span>
      <strong id="objective-text">Get on the scooter</strong>
    </div>

    <!-- Top-Right Wallet Card + Keys/Menu Pill -->
    <div class="hud-top-right">
      <div class="hud-wallet-box">
        <span class="wallet-slash">/</span>
        <div class="wallet-stack">
          <small>WALLET</small>
          <strong id="cash-readout">₹0</strong>
        </div>
      </div>
      <div class="hud-shortcut-bar">
        <button class="hud-key-btn" id="toggle-keys-drawer"><kbd>F1</kbd> Keys</button>
        <button class="hud-key-btn" id="toggle-esc-menu"><kbd>Esc</kbd> Menu</button>
        <button class="hud-key-btn" id="sound-button" title="Toggle music">♫ <span>ON</span></button>
      </div>
    </div>

    <!-- Center-Bottom Player Feet Chevron + Distance ("▼ 20 m") -->
    <div class="hud-feet-marker" id="hud-feet-marker">
      <div class="feet-chevron" id="feet-chevron">▼</div>
      <span class="feet-distance" id="feet-distance">20 m</span>
    </div>

    <!-- Bottom-Left Live DAARI Mini-Map Radar + Green Health Bar -->
    <div class="hud-bottom-left">
      <div class="daari-minimap-card" id="expand-map" title="Click or press M to open full Daari Map">
        <span class="minimap-title">DAARI</span>
        <canvas id="daari-radar-canvas" width="210" height="210"></canvas>
        <div class="minimap-bottom-row">
          <div class="minimap-left-icons">
            <span class="mm-north">N</span>
            <span class="mm-icon">⚙</span>
            <span class="mm-icon">⌖</span>
          </div>
          <span class="minimap-target-dist"><i class="mm-dot"></i> <b id="minimap-dist-label">20 m</b></span>
        </div>
      </div>

      <div class="health-bar">
        <span class="health-heart">♥</span>
        <div class="health-track"><div class="health-fill" style="width: 100%"></div></div>
        <strong class="health-num">100</strong>
      </div>
    </div>

    <!-- Context Action Prompt ("Press E to get in auto") -->
    <button class="vehicle-toggle" id="vehicle-toggle">GET ON SCOOTER / AUTO <kbd>E</kbd></button>

    <div class="stage-toast" id="stage-toast" aria-live="polite"></div>

    <!-- Slide-Over Pause / Jobs / Controls Menu (Toggled via Esc or F1) -->
    <aside class="briefing-drawer" id="briefing">
      <div class="briefing-head">
        <div>
          <span class="eyebrow">NAMMA MYSURU · PAUSE & JOBS</span>
          <h1 id="scene-location">DEVARAJA MARKET</h1>
        </div>
        <button class="close-button" id="close-briefing" aria-label="Resume game">×</button>
      </div>
      <p class="intro">Use <b>WASD</b> or Arrow keys to walk and drive. Press <b>E</b> near the yellow auto/scooter to hop in, and <b>M</b> for the full Daari map.</p>

      <section class="mission-card">
        <div class="mission-head">
          <span class="eyebrow">ACTIVE CONTRACT <span id="mission-index">01 / 03</span></span>
          <span class="reward" id="mission-card-reward">+ ₹450</span>
        </div>
        <h2 id="mission-title">A parcel for the palace caretaker</h2>
        <p id="mission-desc">Aunty at Devaraja Market has one last delivery before she closes.</p>
        <div class="mission-meta">
          <span id="mission-time">◷ 07 MIN</span>
          <span id="mission-distance">↗ 1.2 KM</span>
          <span id="mission-destination">MYSURU PALACE</span>
        </div>
        <div class="mission-actions">
          <button class="primary-button" id="ride-button"><span id="ride-button-label">TAKE THIS JOB</span><b>↗</b></button>
          <button class="next-job" id="next-job" aria-label="Next job">↻</button>
        </div>
      </section>

      <div class="drawer-Footer-actions">
        <button class="primary-button" id="open-full-map"><span>⌖ OPEN FULL DAARI MAP (M)</span></button>
        <button class="next-job" id="back-to-landing" title="Exit to title screen" style="width:auto;padding:0 12px;font-size:11px;">TITLE SCREEN</button>
      </div>
      <div class="side-footer">
        <span id="save-indicator"><span>✓</span> SAVED</span>
        <span>SKY: <b id="weather-temp">26°</b> <span id="weather-copy">MYSURU</span></span>
      </div>
    </aside>

    <!-- =====================================================================
         4. FULLSCREEN "DAARI" DARK MYSURU MAP MODAL (Press M)
         ===================================================================== -->
    <div class="modal-backdrop daari-modal-backdrop" id="map-modal" aria-hidden="true">
      <section class="daari-shell" aria-label="Daari Mysuru Map">
        <div class="daari-top-bar">
          <div class="daari-top-objective">
            <span class="daari-slash">/</span>
            <strong id="daari-top-goal">Get to Ambavilas Palace North Gate</strong>
          </div>
        </div>

        <div class="daari-body">
          <div class="daari-map-canvas" id="daari-map-canvas">
            <div class="daari-scale-bar"><span>200 m</span><i></i></div>
            <div class="daari-places-pill">
              <span class="places-dot"></span>
              PLACES FOUND <b id="daari-places-count">2 / ${TOTAL_DISCOVERABLE_PLACES}</b>
            </div>
            <svg id="city-map-svg" class="daari-svg" viewBox="0 0 1000 760" role="img" aria-label="Daari OpenStreetMap of Mysuru"></svg>
            <div class="daari-zoom-controls">
              <button id="daari-zoom-in" title="Zoom in">+</button>
              <button id="daari-zoom-out" title="Zoom out">−</button>
              <button id="daari-zoom-reset" title="Recenter">⌖</button>
            </div>
            <div class="daari-osm-credit">© OpenStreetMap contributors</div>
          </div>

          <aside class="daari-sidebar">
            <div class="daari-wallet-row">
              <span class="daari-brand">DAARI</span>
              <span class="daari-divider-slash">/</span>
              <div class="daari-wallet">
                <small>WALLET</small>
                <strong id="daari-wallet-amount">₹0</strong>
              </div>
            </div>

            <div class="daari-zone-header">
              <h2 id="daari-zone-eng">DEVARAJA MARKET</h2>
              <p id="daari-zone-kan">ದೇವರಾಜ ಮಾರುಕಟ್ಟೆ</p>
            </div>

            <div class="daari-legend-grid">
              <div class="legend-item"><span class="lg-you">▲</span> You</div>
              <div class="legend-item"><span class="lg-dot" style="background:#f59e0b"></span> Objective</div>
              <div class="legend-item"><span class="lg-line"></span> Route</div>
              <div class="legend-item"><span class="lg-dot" style="background:#22c55e"></span> Pick-up</div>
              <div class="legend-item"><span class="lg-dot" style="background:#ef4444"></span> Drop-off</div>
              <div class="legend-item"><span class="lg-dot" style="background:#38bdf8"></span> Waypoint</div>
              <div class="legend-item"><span class="lg-dot" style="background:#38bdf8"></span> Person</div>
              <div class="legend-item"><span class="lg-dot" style="background:#60a5fa"></span> Vehicle</div>
              <div class="legend-item"><span class="lg-dot" style="background:#a855f7"></span> Shop</div>
              <div class="legend-item"><span class="lg-dot" style="background:#eab308"></span> Discovered place</div>
              <div class="legend-item"><span class="lg-dot" style="background:#f43f5e"></span> Collectible</div>
              <div class="legend-item"><span class="lg-dot" style="background:#f97316"></span> Trouble</div>
              <div class="legend-item"><span class="lg-dot" style="background:#3b82f6"></span> Police</div>
              <div class="legend-item"><span class="lg-dot" style="background:#4ade80"></span> Property for sale</div>
              <div class="legend-item"><span class="lg-dot" style="background:#ffffff"></span> Your property</div>
              <div class="legend-item"><span class="lg-dot" style="background:#cbd5e1"></span> Street race</div>
              <div class="legend-item"><span class="lg-dot" style="background:#c084fc"></span> Side story</div>
            </div>

            <div class="daari-selected-info">
              <small>SELECTED ON MAP</small>
              <strong id="map-selected-place">DEVARAJA MARKET</strong>
              <span id="map-current-address">Sayyaji Rao Road · ಮೈಸೂರು</span>
              <span id="map-coordinates">12.3130° N · 76.6540° E</span>
            </div>

            <div class="daari-instructions">
              <p>Click: set waypoint</p>
              <p>Right click: clear</p>
              <p>Scroll: zoom · Drag: pan</p>
              <p class="close-map-row">
                <button class="daari-close-btn" data-close="map-modal"><kbd>M</kbd> Close map</button>
              </p>
              <small>Map data © OpenStreetMap contributors</small>
            </div>
          </aside>
        </div>
      </section>
    </div>

    <div class="toast" id="app-toast" aria-live="polite"></div>
  </div>`;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const maybeById = <T extends Element>(id: string) => document.getElementById(id) as T | null;

const appToast = (message: string) => {
  const el = byId('app-toast');
  el.textContent = message;
  el.classList.add('visible');
  window.setTimeout(() => el.classList.remove('visible'), 2900);
};

/* ============================================================================
 * CONTINUOUS DUAL-TRACK SOUNDTRACK ENGINE (music1.mp3 ⇄ music2.mp3)
 * ============================================================================ */
const PLAYLIST = [
  { src: '/music/music1.mp3', title: 'Track 01 · Mysuru Dusk' },
  { src: '/music/music2.mp3', title: 'Track 02 · Chamundi Night Drive' },
];

class MysuruMusicEngine {
  private audio: HTMLAudioElement;
  private index = 0;
  private isPlaying = false;
  private userPaused = false;
  private switching = false;

  constructor(audioElement: HTMLAudioElement) {
    this.audio = audioElement;
    this.audio.preload = 'auto';
    this.audio.loop = false;
    this.audio.volume = 0.28;
    this.audio.src = PLAYLIST[this.index].src;

    this.audio.addEventListener('ended', () => void this.nextTrack(true));
    this.audio.addEventListener('error', () => {
      if (!this.switching) window.setTimeout(() => void this.nextTrack(true), 600);
    });
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.syncUI();
    });
    this.audio.addEventListener('pause', () => {
      if (!this.switching) {
        this.isPlaying = false;
        this.syncUI();
      }
    });

    const unlock = () => {
      if (!this.isPlaying && !this.userPaused) void this.play();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    this.syncUI();
  }

  public async play() {
    this.userPaused = false;
    try {
      await this.audio.play();
      this.isPlaying = true;
      this.syncUI();
    } catch {
      this.audio.addEventListener(
        'canplay',
        () => {
          if (!this.userPaused && !this.isPlaying) void this.audio.play().catch(() => undefined);
        },
        { once: true }
      );
    }
  }

  public pause() {
    this.userPaused = true;
    this.isPlaying = false;
    this.audio.pause();
    this.syncUI();
  }

  public toggle() {
    if (this.isPlaying) {
      this.pause();
      appToast('Soundtrack paused.');
    } else {
      void this.play();
      appToast(`Playing ${PLAYLIST[this.index].title}`);
    }
  }

  public async nextTrack(autoAdvance = false) {
    this.switching = true;
    this.index = (this.index + 1) % PLAYLIST.length;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = PLAYLIST[this.index].src;
    this.audio.load();
    this.syncUI();

    if (autoAdvance || !this.userPaused) {
      try {
        await this.audio.play();
        this.isPlaying = true;
      } catch {
        this.audio.addEventListener(
          'canplaythrough',
          () => {
            if (!this.userPaused) void this.audio.play().catch(() => undefined);
          },
          { once: true }
        );
      }
    }
    this.switching = false;
    this.syncUI();
  }

  public syncUI() {
    const soundBtn = maybeById<HTMLButtonElement>('sound-button');
    if (soundBtn) {
      soundBtn.innerHTML = `♫ <span>${this.isPlaying ? 'ON' : 'OFF'}</span>`;
    }
    const landingToggle = maybeById('landing-music-toggle');
    const landingState = maybeById('landing-music-state');
    if (landingToggle) landingToggle.classList.toggle('playing', this.isPlaying);
    if (landingState) landingState.textContent = this.isPlaying ? `OST 0${this.index + 1} ON` : 'SOUND OFF';
  }
}

const musicEngine = new MysuruMusicEngine(byId<HTMLAudioElement>('city-music'));

/* ============================================================================
 * TRAILER VIDEO PLAYER WIDGET CONTROLS
 * ============================================================================ */
function initTrailerPlayer() {
  const video = maybeById<HTMLVideoElement>('custom-trailer-video');
  const fallbackStage = maybeById<HTMLElement>('video-fallback-stage');
  const centerPlayBtn = maybeById<HTMLButtonElement>('video-center-play');
  const playToggleBtn = maybeById<HTMLButtonElement>('vc-play-toggle');
  const progressBar = maybeById<HTMLElement>('vc-progress');
  const timeLabel = maybeById<HTMLElement>('vc-time');
  const soundToggle = maybeById<HTMLButtonElement>('vc-sound-toggle');
  const fullscreenBtn = maybeById<HTMLButtonElement>('vc-fullscreen');
  const playerContainer = maybeById<HTMLElement>('inline-video-player');

  if (!video || !fallbackStage) return;

  // Ensure video is muted so background soundtrack continues playing smoothly
  video.muted = true;
  if (soundToggle) soundToggle.textContent = '🔇';

  let isVideoPlaying = false;

  const togglePlay = (e?: Event) => {
    if (e) e.stopPropagation();
    if (isVideoPlaying) {
      video.pause();
    } else {
      fallbackStage.style.opacity = '0';
      fallbackStage.style.pointerEvents = 'none';
      void video.play().then(() => {
        isVideoPlaying = true;
        if (playToggleBtn) playToggleBtn.textContent = '❚❚';
      }).catch((err) => {
        console.warn('Video play prevented or trailer.mp4 missing:', err);
        appToast('Trailer file (trailer.mp4) missing in public/assets/');
        fallbackStage.style.opacity = '1';
        fallbackStage.style.pointerEvents = 'auto';
      });
    }
  };

  video.addEventListener('play', () => {
    isVideoPlaying = true;
    fallbackStage.style.opacity = '0';
    fallbackStage.style.pointerEvents = 'none';
    if (playToggleBtn) playToggleBtn.textContent = '❚❚';
  });

  video.addEventListener('pause', () => {
    isVideoPlaying = false;
    fallbackStage.style.opacity = '1';
    fallbackStage.style.pointerEvents = 'auto';
    if (playToggleBtn) playToggleBtn.textContent = '▶';
  });

  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      if (progressBar) progressBar.style.width = `${pct}%`;
      const curMin = Math.floor(video.currentTime / 60);
      const curSec = Math.floor(video.currentTime % 60);
      const durMin = Math.floor(video.duration / 60);
      const durSec = Math.floor(video.duration % 60);
      if (timeLabel) {
        timeLabel.textContent = `${curMin}:${String(curSec).padStart(2, '0')} / ${durMin}:${String(durSec).padStart(2, '0')}`;
      }
    }
  });

  video.addEventListener('ended', () => {
    isVideoPlaying = false;
    fallbackStage.style.opacity = '1';
    fallbackStage.style.pointerEvents = 'auto';
    if (playToggleBtn) playToggleBtn.textContent = '▶';
  });

  if (centerPlayBtn) {
    centerPlayBtn.addEventListener('click', togglePlay);
  }
  if (playToggleBtn) {
    playToggleBtn.addEventListener('click', togglePlay);
  }
  fallbackStage.addEventListener('click', togglePlay);

  if (soundToggle) {
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      soundToggle.textContent = video.muted ? '🔇' : '🔊';
    });
  }

  if (fullscreenBtn && playerContainer) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement) {
        void playerContainer.requestFullscreen().catch(() => undefined);
      } else {
        void document.exitFullscreen().catch(() => undefined);
      }
    });
  }
}

/* ============================================================================
 * LIVE BOTTOM-LEFT "DAARI" MINI-MAP RADAR RENDERER
 * ============================================================================ */
function drawMiniMapRadar(status: WorldStatus) {
  const radar = maybeById<HTMLCanvasElement>('daari-radar-canvas');
  if (!radar) return;
  const ctx = radar.getContext('2d');
  if (!ctx) return;

  const w = radar.width;
  const h = radar.height;
  ctx.fillStyle = '#141526';
  ctx.fillRect(0, 0, w, h);

  const scale = 0.65;
  ctx.save();
  ctx.translate(w / 2, h / 2);

  if (loadedRealMap) {
    ctx.fillStyle = '#292c47';
    for (const b of loadedRealMap.buildings) {
      const dx = b.centroid[0] - status.playerX;
      const dz = b.centroid[1] - status.playerZ;
      if (Math.abs(dx) > 190 || Math.abs(dz) > 190) continue;
      ctx.beginPath();
      b.ring.forEach(([rx, rz], idx) => {
        const px = (rx - status.playerX) * scale;
        const py = -(rz - status.playerZ) * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }

    for (const r of loadedRealMap.roads) {
      ctx.strokeStyle = r.isMajor ? '#f3dfa8' : '#53587d';
      ctx.lineWidth = r.isMajor ? 5.5 : 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      r.points.forEach(([rx, rz], idx) => {
        const px = (rx - status.playerX) * scale;
        const py = -(rz - status.playerZ) * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  ctx.rotate(status.playerYaw);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ============================================================================
 * DAARI FULLSCREEN MAP & TRAILER LOGIC
 * ============================================================================ */
let localMapFeatures: MapFeature[] = [];

function applyMapTransform() {
  const group = document.getElementById('daari-pan-zoom-group');
  if (group) {
    group.setAttribute(
      'transform',
      `translate(${500 + mapPan.x} ${380 + mapPan.y}) scale(${mapZoom}) translate(-500 -380)`
    );
  }
}

function redrawDaariMap() {
  const svg = document.getElementById('city-map-svg') as unknown as SVGSVGElement | null;
  if (!svg) return;
  renderDaariMysuruMap(svg, localMapFeatures, currentPlayerGps, customWaypointGps, (id, name, sub) => {
    if (!progress.discovered.includes(id)) {
      progress.discovered.push(id);
      saveProgress();
    }
    byId('daari-places-count').textContent = `${progress.discovered.length} / ${TOTAL_DISCOVERABLE_PLACES}`;
    byId('map-selected-place').textContent = name;
    byId('map-current-address').textContent = sub;
    appToast(`Discovered: ${name}`);
  });
  byId('daari-places-count').textContent = `${progress.discovered.length} / ${TOTAL_DISCOVERABLE_PLACES}`;
  applyMapTransform();
}

async function loadCityMap() {
  try {
    const response = await fetch('/data/mysuru-roads.geojson');
    if (response.ok) {
      const data = (await response.json()) as MapCollection;
      localMapFeatures = data.features ?? [];
    }
  } catch {
    localMapFeatures = [];
  }
  redrawDaariMap();
}

function bindDaariMapInteractions() {
  const canvas = byId('daari-map-canvas');
  const svg = byId<SVGSVGElement>('city-map-svg' as string);
  let dragging = false;
  let dragMoved = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      mapZoom = Math.max(0.85, Math.min(5.5, mapZoom * factor));
      applyMapTransform();
    },
    { passive: false }
  );

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.daari-zoom-controls')) return;
    dragging = true;
    dragMoved = false;
    startX = e.clientX - mapPan.x;
    startY = e.clientY - mapPan.y;
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.hypot(e.clientX - startX - mapPan.x, e.clientY - startY - mapPan.y) > 5) dragMoved = true;
    mapPan.x = e.clientX - startX;
    mapPan.y = e.clientY - startY;
    applyMapTransform();
  });

  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    if (!dragMoved && e.button === 0 && !(e.target as HTMLElement).closest('.daari-poi, .daari-zoom-controls')) {
      const rect = svg.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 1000;
      const rawY = ((e.clientY - rect.top) / rect.height) * 760;
      const mapX = (rawX - 500 - mapPan.x) / mapZoom + 500;
      const mapY = (rawY - 380 - mapPan.y) / mapZoom + 380;
      customWaypointGps = svgPixelToGps(mapX, mapY);
      redrawDaariMap();
      appToast('Waypoint set on Daari map.');
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    customWaypointGps = null;
    redrawDaariMap();
    appToast('Waypoint cleared.');
  });

  byId('daari-zoom-in').addEventListener('click', () => {
    mapZoom = Math.min(5.5, mapZoom * 1.25);
    applyMapTransform();
  });
  byId('daari-zoom-out').addEventListener('click', () => {
    mapZoom = Math.max(0.85, mapZoom * 0.8);
    applyMapTransform();
  });
  byId('daari-zoom-reset').addEventListener('click', () => {
    mapZoom = 1;
    mapPan = { x: 0, y: 0 };
    applyMapTransform();
  });
}
bindDaariMapInteractions();

function setModal(id: string, open: boolean) {
  const modal = byId(id);
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (id === 'map-modal' && open) redrawDaariMap();
}

function toastInScene(message: string) {
  const el = byId('stage-toast');
  el.textContent = message;
  el.classList.add('visible');
  window.setTimeout(() => el.classList.remove('visible'), 3200);
}

function drawProgress() {
  const mission = missions.find((item) => item.id === (activeMissionId ?? missions[missionIndex].id))!;
  const completed = progress.completed.includes(mission.id);
  const formattedCash = `₹${progress.cash.toLocaleString('en-IN')}`;
  byId('cash-readout').textContent = formattedCash;
  byId('daari-wallet-amount').textContent = formattedCash;
  byId('daari-top-goal').textContent = mission.title;
  byId('mission-title').textContent = completed ? 'Job complete. Pick another.' : mission.shortTitle;
  byId('mission-desc').textContent = mission.description;
  byId('mission-index').textContent = `${String(missionIndex + 1).padStart(2, '0')} / 03`;
  byId('mission-card-reward').textContent = `+ ₹${mission.reward}`;
  byId('mission-time').textContent = `◷ ${mission.time}`;
  byId('mission-distance').textContent = `↗ ${mission.distance}`;
  byId('mission-destination').textContent = mission.destination.toUpperCase();
  byId('ride-button-label').textContent = activeMission ? 'JOB IN PROGRESS' : completed ? 'JOB COMPLETE' : 'TAKE THIS JOB';
}

function saveProgress() {
  localStorage.setItem('mysuru-after-hours-save', JSON.stringify(progress));
}

async function loadProgress() {
  try {
    const local = localStorage.getItem('mysuru-after-hours-save');
    if (local) progress = { ...initial, ...JSON.parse(local) };
  } catch {
    /* fresh guest save */
  }
  drawProgress();
}

function drawHUD(status: WorldStatus) {
  currentPlayerGps = { lat: status.lat, lon: status.lon };
  byId('scene-location').textContent = status.nearby;

  const targetDist = Math.round(
    status.mode === 'walking' && !activeMission ? status.distanceToScooter : status.distanceToDestination
  );
  byId('feet-distance').textContent = `${targetDist} m`;
  byId('minimap-dist-label').textContent = `${targetDist} m`;
  byId('feet-chevron').style.transform = `rotate(${(status.targetHeadingAngle * 180) / Math.PI}deg)`;

  if (status.mode === 'walking' && !activeMission) {
    byId('objective-text').textContent = 'Get on the scooter';
  } else {
    const mission = missions.find((m) => m.id === (activeMissionId ?? missions[missionIndex].id))!;
    byId('objective-text').textContent = mission.title;
  }

  const vBtn = byId('vehicle-toggle');
  vBtn.classList.toggle('near-auto', status.canEnterVehicle || status.mode === 'driving');
  vBtn.innerHTML =
    status.mode === 'driving'
      ? 'STEP OUT <kbd>E</kbd>'
      : status.canEnterVehicle
        ? 'GET ON SCOOTER / AUTO <kbd>E</kbd>'
        : 'WALK TO SCOOTER <kbd>E</kbd>';

  drawMiniMapRadar(status);
}

const LOADER_FLAVOR_LINES = [
  'Waiting for the KSRTC Dasara Volvos...',
  'Warming up the filter coffee at Devaraja Market...',
  'Switching on 97,000 bulbs at Ambavilas Palace...',
  'Negotiating meter-mel-one-and-half at K.R. Circle...',
];

async function boot3DWorld() {
  if (world) {
    byId('stage-loader').classList.add('gone');
    return;
  }
  const loaderEl = byId('stage-loader');
  loaderEl.classList.remove('gone');

  try {
    world = await createWorld(
      byId<HTMLCanvasElement>('game-canvas'),
      drawHUD,
      (mapData) => {
        loadedRealMap = mapData;
        window.setTimeout(() => {
          loaderEl.classList.add('gone');
          toastInScene('WASD to walk · Press E near the yellow scooter/auto · Press M for Daari Map');
        }, 450);
      },
      (percent, stageText) => {
        byId('loader-progress-fill').style.width = `${percent}%`;
        byId('loader-percent').textContent = `${percent}%`;
        byId('loader-sub-stage').textContent = stageText;
        const flavorIdx = Math.min(LOADER_FLAVOR_LINES.length - 1, Math.floor(percent / 28));
        byId('loader-flavor-text').textContent = LOADER_FLAVOR_LINES[flavorIdx];
      }
    );
    if (activeMissionId) world.setMission(true, activeMissionId);
  } catch (error) {
    console.error(error);
    byId('loader-sub-stage').textContent = 'Error loading 3D context — check console.';
  }
}

function enterGameFromLanding(e?: Event) {
  if (e) e.preventDefault();
  if (!MAP_READY_FOR_PLAY) {
    appToast('🚧 Namma Mysuru Chapter 1 is currently under active construction. Stay tuned!');
    return;
  }
  void musicEngine.play();
  byId('intro-screen').classList.add('leaving');
  window.setTimeout(() => byId('intro-screen').classList.add('closed'), 550);
  void boot3DWorld();
}

/* ============================================================================
 * UI LISTENERS
 * ============================================================================ */
byId('landing-music-toggle').addEventListener('click', () => musicEngine.toggle());
byId('landing-music-next').addEventListener('click', () => void musicEngine.nextTrack(false));
byId('sound-button').addEventListener('click', () => musicEngine.toggle());

document.querySelectorAll<HTMLElement>('[data-trigger="enter-game"]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    enterGameFromLanding(e);
  });
});

byId('toggle-keys-drawer').addEventListener('click', () => byId('briefing').classList.toggle('open'));
byId('toggle-esc-menu').addEventListener('click', () => byId('briefing').classList.toggle('open'));
byId('close-briefing').addEventListener('click', () => byId('briefing').classList.remove('open'));

byId('back-to-landing').addEventListener('click', (e) => {
  e.preventDefault();
  byId('briefing').classList.remove('open');
  const intro = byId('intro-screen');
  intro.classList.remove('closed', 'leaving');
});

byId('hero-vote-btn').addEventListener('click', () => {
  appToast('ಮೈಸೂರು ಧನ್ಯವಾದಗಳು! Your vote for the full Namma Mysuru edition is counted.');
});
byId('prefooter-vote-btn').addEventListener('click', () => {
  appToast('ಮೈಸೂರು ಧನ್ಯವಾದಗಳು! Your vote for the full Namma Mysuru edition is counted.');
});
byId('footer-cheats-link').addEventListener('click', (e) => {
  e.preventDefault();
  progress.cash += 500;
  saveProgress();
  drawProgress();
  appToast('Cheat code "MYSOREPAK" activated: +₹500 added to your wallet!');
});

byId('landing-open-map').addEventListener('click', () => setModal('map-modal', true));
byId('landing-open-map-2').addEventListener('click', () => setModal('map-modal', true));
byId('footer-open-map').addEventListener('click', (e) => {
  e.preventDefault();
  setModal('map-modal', true);
});
byId('expand-map').addEventListener('click', () => setModal('map-modal', true));
byId('open-full-map').addEventListener('click', () => {
  byId('briefing').classList.remove('open');
  setModal('map-modal', true);
});

document.querySelectorAll<HTMLElement>('[data-close]').forEach((button) =>
  button.addEventListener('click', () => setModal(button.dataset.close!, false))
);

byId('ride-button').addEventListener('click', () => {
  const mission = missions[missionIndex];
  activeMission = true;
  activeMissionId = mission.id;
  world?.setMission(true, mission.id);
  drawProgress();
  byId('briefing').classList.remove('open');
  toastInScene(`Job started: ${mission.title}`);
});

byId('next-job').addEventListener('click', () => {
  missionIndex = (missionIndex + 1) % missions.length;
  drawProgress();
});

byId('vehicle-toggle').addEventListener('click', () => {
  const mode = world?.toggleVehicle();
  if (!mode) toastInScene('Walk closer to the yellow scooter/auto and press E.');
  else toastInScene(mode === 'driving' ? 'Riding through real Mysuru streets!' : 'Back on foot.');
});

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select')) return;

  if (event.key === 'Escape') {
    if (byId('map-modal').classList.contains('open')) {
      setModal('map-modal', false);
    } else {
      byId('briefing').classList.toggle('open');
    }
    return;
  }

  if (event.key === 'F1') {
    event.preventDefault();
    byId('briefing').classList.toggle('open');
    return;
  }

  if (event.key.toLowerCase() === 'm' && !event.repeat) {
    event.preventDefault();
    const isOpen = byId('map-modal').classList.contains('open');
    setModal('map-modal', !isOpen);
    return;
  }

  if (event.key === 'Enter' && !byId('intro-screen').classList.contains('closed') && !byId('map-modal').classList.contains('open')) {
    enterGameFromLanding();
    return;
  }

  const modalOpen = document.querySelector('.modal-backdrop.open') !== null;
  const driveKey = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && !modalOpen;
  if (driveKey) {
    world?.setDriveKey(event.key, true);
    event.preventDefault();
  }
  if (event.key.toLowerCase() === 'e' && !event.repeat && !modalOpen) {
    world?.setDriveKey('e', true);
    event.preventDefault();
  }
  if (event.code === 'Space' && !event.repeat && !modalOpen) {
    world?.setDriveKey('Space', true);
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))
    world?.setDriveKey(event.key, false);
  if (event.key.toLowerCase() === 'e') world?.setDriveKey('e', false);
  if (event.code === 'Space') world?.setDriveKey('Space', false);
});

void (async function init() {
  void loadProgress();
  await loadCityMap();
  initTrailerPlayer();
})();