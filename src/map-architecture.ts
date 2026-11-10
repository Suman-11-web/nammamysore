// src/map-architecture.ts

export type PoiCategory =
  | 'objective'
  | 'pickup'
  | 'dropoff'
  | 'person'
  | 'vehicle'
  | 'shop'
  | 'discovered'
  | 'collectible'
  | 'trouble'
  | 'police'
  | 'property'
  | 'your-property'
  | 'race'
  | 'sidestory';

export interface MysuruLandmark {
  id: string;
  name: string;
  kannadaName: string;
  district: string;
  category: 'royal' | 'market' | 'sacred' | 'nature' | 'transit' | 'neighborhood';
  poiType: PoiCategory;
  priceTag?: string;
  lat: number;
  lon: number;
  elevationMeters: number;
  radiusMeters: number;
  status: 'BUILT' | 'IN PROGRESS' | 'PLANNED';
  description: string;
  dx: number;
  dy: number;
  majorLabel?: boolean;
}

export interface LockedNeighborhood {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
}

export interface MysuruWaterBody {
  id: string;
  name: string;
  lat: number;
  lon: number;
  rxMeters: number;
  rzMeters: number;
}

export interface MapFeature {
  id?: number | string;
  geometry?: {
    type: string;
    coordinates: number[][] | number[][][];
  };
  properties?: {
    osm_id?: number;
    name?: string;
    road_class?: string;
  };
}

export interface MapCollection {
  type?: string;
  features?: MapFeature[];
}

export const MYSURU_CENTER = { lat: 12.3052, lon: 76.6552, baseElevation: 770 };

export const MYSURU_BOUNDS = {
  west: 76.615,
  east: 76.695,
  south: 12.268,
  north: 12.338,
};

export const METERS_PER_DEG_LON = 108600;
export const METERS_PER_DEG_LAT = 111000;

export const POI_COLORS: Record<PoiCategory, { fill: string; stroke: string }> = {
  objective: { fill: '#f59e0b', stroke: '#fef3c7' },
  pickup: { fill: '#22c55e', stroke: '#dcfce7' },
  dropoff: { fill: '#ef4444', stroke: '#fee2e2' },
  person: { fill: '#38bdf8', stroke: '#e0f2fe' },
  vehicle: { fill: '#60a5fa', stroke: '#dbeafe' },
  shop: { fill: '#a855f7', stroke: '#f3e8ff' },
  discovered: { fill: '#eab308', stroke: '#fef9c3' },
  collectible: { fill: '#f43f5e', stroke: '#ffe4e6' },
  trouble: { fill: '#f97316', stroke: '#ffedd5' },
  police: { fill: '#3b82f6', stroke: '#eff6ff' },
  property: { fill: '#4ade80', stroke: '#dcfce7' },
  'your-property': { fill: '#ffffff', stroke: '#94a3b8' },
  race: { fill: '#cbd5e1', stroke: '#f8fafc' },
  sidestory: { fill: '#c084fc', stroke: '#f3e8ff' },
};

// 12 Primary 3D World Landmarks
export const MYSURU_LANDMARKS: MysuruLandmark[] = [
  {
    id: 'palace',
    name: 'AMBAVILAS PALACE',
    kannadaName: 'ಮೈಸೂರು ಅರಮನೆ',
    district: 'Agrahara · Royal Quarter',
    category: 'royal',
    poiType: 'discovered',
    lat: 12.3052,
    lon: 76.6552,
    elevationMeters: 772,
    radiusMeters: 240,
    status: 'BUILT',
    description: 'Indo-Saracenic royal palace with 97,000 incandescent bulbs and golden domes.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'market',
    name: 'DEVARAJA MARKET',
    kannadaName: 'ದೇವರಾಜ ಮಾರುಕಟ್ಟೆ',
    district: 'Sayyaji Rao Road',
    category: 'market',
    poiType: 'your-property',
    lat: 12.3130,
    lon: 76.6540,
    elevationMeters: 774,
    radiusMeters: 160,
    status: 'BUILT',
    description: 'Your starting adda. Jasmine cones, banana stalls, and yellow-top autos.',
    dx: 12,
    dy: -8,
    majorLabel: true,
  },
  {
    id: 'kr-circle',
    name: 'K.R. CIRCLE SIGNAL',
    kannadaName: 'ಕೆ.ಆರ್. ವೃತ್ತ',
    district: 'Central Heritage Core',
    category: 'transit',
    poiType: 'objective',
    priceTag: 'Objective · 420 m',
    lat: 12.3092,
    lon: 76.6546,
    elevationMeters: 773,
    radiusMeters: 130,
    status: 'BUILT',
    description: 'Central rotary connecting Sayyaji Rao Road and Albert Victor Road.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'cathedral',
    name: 'ST. PHILOMENA’S',
    kannadaName: 'ಸೇಂಟ್ ಫಿಲೋಮಿನಾ ಚರ್ಚ್',
    district: 'Lashkar Mohalla',
    category: 'sacred',
    poiType: 'discovered',
    lat: 12.3219,
    lon: 76.6580,
    elevationMeters: 776,
    radiusMeters: 220,
    status: 'BUILT',
    description: 'Twin 175-foot Neo-Gothic spires lit up against the evening sky.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'chamundi',
    name: 'CHAMUNDI TEMPLE',
    kannadaName: 'ಚಾಮುಂಡೇಶ್ವರಿ ದೇವಸ್ಥಾನ',
    district: 'Chamundi Hill Summit',
    category: 'sacred',
    poiType: 'dropoff',
    lat: 12.2726,
    lon: 76.6730,
    elevationMeters: 1062,
    radiusMeters: 260,
    status: 'BUILT',
    description: 'Hilltop gopura overlooking the entire Mysuru city grid.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'nandi',
    name: 'MONOLITHIC NANDI',
    kannadaName: 'ನಂದಿ ವಿಗ್ರಹ',
    district: 'Chamundi Hairpin Curve',
    category: 'sacred',
    poiType: 'collectible',
    lat: 12.2818,
    lon: 76.6675,
    elevationMeters: 940,
    radiusMeters: 150,
    status: 'BUILT',
    description: '350-year-old carved granite Nandi halfway up the hill climb.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'zoo',
    name: 'MYSURU ZOO GATE',
    kannadaName: 'ಮೈಸೂರು ಮೃಗಾಲಯ',
    district: 'Indiranagar · Nazarbad',
    category: 'nature',
    poiType: 'pickup',
    lat: 12.3026,
    lon: 76.6648,
    elevationMeters: 768,
    radiusMeters: 190,
    status: 'BUILT',
    description: 'Sri Chamarajendra Zoological Gardens main avenue.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'karanji',
    name: 'KARANJI LAKE',
    kannadaName: 'ಕರಂಜಿ ಕೆರೆ',
    district: 'Siddhartha Nagar',
    category: 'nature',
    poiType: 'sidestory',
    lat: 12.2948,
    lon: 76.6710,
    elevationMeters: 764,
    radiusMeters: 240,
    status: 'BUILT',
    description: 'Quiet eastern lakefront and walk-through aviary.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'kukkarahalli',
    name: 'KUKKARAHALLI TANK',
    kannadaName: 'ಕುಕ್ಕರಹಳ್ಳಿ ಕೆರೆ',
    district: 'Manasagangotri',
    category: 'nature',
    poiType: 'sidestory',
    lat: 12.3065,
    lon: 76.6240,
    elevationMeters: 766,
    radiusMeters: 550,
    status: 'BUILT',
    description: 'Western sunset tank bordering the University of Mysore.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'railway',
    name: 'MYSURU JUNCTION',
    kannadaName: 'ಮೈಸೂರು ರೈಲು ನಿಲ್ದಾಣ',
    district: 'Irwin Road West',
    category: 'transit',
    poiType: 'vehicle',
    lat: 12.3168,
    lon: 76.6455,
    elevationMeters: 775,
    radiusMeters: 180,
    status: 'BUILT',
    description: 'Prepaid auto stand and Malgudi-era railway arches.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'bannimantap',
    name: 'BANNIMANTAP STADIUM',
    kannadaName: 'ಬನ್ನಿಮಂಟಪ',
    district: 'Northern Parade Grounds',
    category: 'neighborhood',
    poiType: 'race',
    lat: 12.3310,
    lon: 76.6450,
    elevationMeters: 771,
    radiusMeters: 300,
    status: 'BUILT',
    description: 'Torchlight parade grounds and late-night 2-stroke drag strip.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
  {
    id: 'jp-nagar',
    name: 'J.P. NAGAR SANTHE',
    kannadaName: 'ಜೆ.ಪಿ. ನಗರ ಸಂತೆ',
    district: 'Southern Ring Grid',
    category: 'neighborhood',
    poiType: 'shop',
    lat: 12.2830,
    lon: 76.6480,
    elevationMeters: 765,
    radiusMeters: 340,
    status: 'BUILT',
    description: 'Evening vegetable santhe and filter kaapi katte.',
    dx: 12,
    dy: 4,
    majorLabel: true,
  },
];

// Additional Street-Level Mysuru Shops, Properties, Races & Trouble Spots (like Screenshot 1)
export const MYSURU_STREET_POIS: Array<{
  id: string;
  name: string;
  poiType: PoiCategory;
  lat: number;
  lon: number;
  dx?: number;
  dy?: number;
}> = [
  { id: 'guru-sweet', name: 'Guru Sweet Mart (Mysore Pak ₹180)', poiType: 'shop', lat: 12.3112, lon: 76.6525, dx: -155, dy: -6 },
  { id: 'mylari', name: 'Hotel Original Vinayaka Mylari', poiType: 'shop', lat: 12.3038, lon: 76.6602, dx: 10, dy: 4 },
  { id: 'kaapi-katte', name: 'Agrahara Kaapi Katte', poiType: 'shop', lat: 12.2995, lon: 76.6512, dx: 10, dy: 4 },
  { id: 'churmuri-cart', name: 'Churmuri & Nannari Cart · ₹4,000', poiType: 'property', lat: 12.3075, lon: 76.6585, dx: 10, dy: -6 },
  { id: 'park-lot', name: 'Pay-and-park lot · ₹9,500', poiType: 'property', lat: 12.3148, lon: 76.6505, dx: 10, dy: 4 },
  { id: '1bhk-kuvempu', name: '1BHK, Nazarbad · ₹8,000', poiType: 'property', lat: 12.3060, lon: 76.6630, dx: 10, dy: 4 },
  { id: 'silk-loom', name: 'KSIC Silk Weaving Unit · ₹12,500', poiType: 'property', lat: 12.2920, lon: 76.6460, dx: 10, dy: 4 },
  { id: 'adjust-garage', name: 'Adjust Maadi Auto Garage', poiType: 'vehicle', lat: 12.3195, lon: 76.6520, dx: 10, dy: 4 },
  { id: 'lansdowne', name: 'Lansdowne Book Bazaar', poiType: 'collectible', lat: 12.3072, lon: 76.6518, dx: -135, dy: 12 },
  { id: 'hardinge', name: 'Hardinge Circle Sprint (Autos)', poiType: 'race', lat: 12.3032, lon: 76.6582, dx: 10, dy: 14 },
  { id: 'laskar-police', name: 'Lashkar Traffic Nakabandi', poiType: 'police', lat: 12.3162, lon: 76.6568, dx: 10, dy: 4 },
  { id: 'ramaswamy', name: 'Ramaswamy Circle Bus Stop', poiType: 'person', lat: 12.2975, lon: 76.6472, dx: 10, dy: 4 },
  { id: 'maharaja-college', name: 'Maharaja’s College Grounds', poiType: 'discovered', lat: 12.3036, lon: 76.6425, dx: -140, dy: 4 },
  { id: 'dd-urs-trouble', name: 'D. Devaraj Urs Rd Parking Argument', poiType: 'trouble', lat: 12.3105, lon: 76.6480, dx: -175, dy: -6 },
  { id: 'rrr-mess', name: 'Hotel RRR Bamboo Biryani', poiType: 'shop', lat: 12.3122, lon: 76.6562, dx: 10, dy: 4 },
  { id: 'betel-stall', name: 'Chiguru Viledele Stall (₹99)', poiType: 'shop', lat: 12.2950, lon: 76.6558, dx: 10, dy: 4 },
];

export const LOCKED_MYSURU_AREAS: LockedNeighborhood[] = [
  { id: 'saraswathipuram', name: 'SARASWATHIPURAM', subtitle: 'Out buying Mysuru Mallige at 4th Main.', lat: 12.2965, lon: 76.6265 },
  { id: 'vijayanagar', name: 'VIJAYANAGAR 2ND STAGE', subtitle: 'Waiting for the 6:30 PM filter coffee.', lat: 12.3265, lon: 76.6255 },
  { id: 'siddharthanagar', name: 'SIDDHARTHA LAYOUT', subtitle: 'Still stuck near the Nazarbad signal.', lat: 12.3095, lon: 76.6815 },
  { id: 'hebbal-infosys', name: 'HEBBAL INFOSYS CAMPUS', subtitle: 'In a stand-up meeting. Back in five.', lat: 12.2795, lon: 76.6805 },
];

export const MYSURU_WATER_BODIES: MysuruWaterBody[] = [
  { id: 'kukkarahalli-water', name: 'Kukkarahalli Lake', lat: 12.3065, lon: 76.6240, rxMeters: 480, rzMeters: 330 },
  { id: 'karanji-water', name: 'Karanji Lake', lat: 12.2948, lon: 76.6710, rxMeters: 360, rzMeters: 230 },
  { id: 'dalvoy-water', name: 'Dalvoy Lake', lat: 12.2755, lon: 76.6520, rxMeters: 400, rzMeters: 240 },
];

export const TOTAL_DISCOVERABLE_PLACES = MYSURU_LANDMARKS.length + MYSURU_STREET_POIS.length; // 28

export function gpsToWorldMeters(lat: number, lon: number): { x: number; y: number; z: number } {
  const x = (lon - MYSURU_CENTER.lon) * METERS_PER_DEG_LON;
  const z = (MYSURU_CENTER.lat - lat) * METERS_PER_DEG_LAT;
  const y = computeMysuruElevation(lat, lon);
  return { x, y, z };
}

export function worldMetersToGps(x: number, z: number): { lat: number; lon: number } {
  return {
    lat: MYSURU_CENTER.lat - z / METERS_PER_DEG_LAT,
    lon: MYSURU_CENTER.lon + x / METERS_PER_DEG_LON,
  };
}

export function computeMysuruElevation(lat: number, lon: number): number {
  const hillLat = 12.2726;
  const hillLon = 76.6730;
  const dx = (lon - hillLon) * METERS_PER_DEG_LON;
  const dz = (hillLat - lat) * METERS_PER_DEG_LAT;
  const distSq = dx * dx + (dz * 1.25) * (dz * 1.25);
  const hillRadiusSq = 1450 * 1450;
  if (distSq > hillRadiusSq * 2.4) return 0;
  return 68 * Math.exp(-distSq / hillRadiusSq);
}

export function gpsToSvgPixel(lon: number, lat: number, width = 1000, height = 760): { x: number; y: number } {
  return {
    x: ((lon - MYSURU_BOUNDS.west) / (MYSURU_BOUNDS.east - MYSURU_BOUNDS.west)) * width,
    y: ((MYSURU_BOUNDS.north - lat) / (MYSURU_BOUNDS.north - MYSURU_BOUNDS.south)) * height,
  };
}

export function svgPixelToGps(x: number, y: number, width = 1000, height = 760): { lat: number; lon: number } {
  return {
    lon: MYSURU_BOUNDS.west + (x / width) * (MYSURU_BOUNDS.east - MYSURU_BOUNDS.west),
    lat: MYSURU_BOUNDS.north - (y / height) * (MYSURU_BOUNDS.north - MYSURU_BOUNDS.south),
  };
}

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char);

export function renderDaariMysuruMap(
  svg: SVGSVGElement,
  features: MapFeature[],
  playerGps: { lat: number; lon: number },
  waypointGps: { lat: number; lon: number } | null,
  onSelectPoi: (id: string, name: string, subtitle: string) => void
): void {
  const majorPaths: string[] = [];
  const secondaryPaths: string[] = [];
  const localPaths: string[] = [];

  for (const feature of features) {
    if (feature.geometry?.type !== 'LineString') continue;
    const coords = feature.geometry.coordinates as number[][];
    if (coords.length < 2) continue;

    const roadClass = feature.properties?.road_class ?? 'residential';
    const isMajor = ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link'].includes(roadClass);
    const isSecondary = ['secondary', 'secondary_link', 'tertiary', 'tertiary_link'].includes(roadClass);

    const d = coords
      .map(([lon, lat], index) => {
        const pt = gpsToSvgPixel(lon, lat);
        return `${index === 0 ? 'M' : 'L'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(' ');

    if (isMajor) {
      majorPaths.push(`<path class="daari-road-major" d="${d}" />`);
    } else if (isSecondary) {
      secondaryPaths.push(`<path class="daari-road-secondary" d="${d}" />`);
    } else {
      localPaths.push(`<path class="daari-road-local" d="${d}" />`);
    }
  }

  // Green parks & Teal lakes (like Screenshot 1)
  const waterAndParksSvg = [
    ...MYSURU_WATER_BODIES.map((lake) => {
      const pt = gpsToSvgPixel(lake.lon, lake.lat);
      const rx = (lake.rxMeters / ((MYSURU_BOUNDS.east - MYSURU_BOUNDS.west) * METERS_PER_DEG_LON)) * 1000;
      const ry = (lake.rzMeters / ((MYSURU_BOUNDS.north - MYSURU_BOUNDS.south) * METERS_PER_DEG_LAT)) * 760;
      return `<g class="daari-water-group">
        <ellipse class="daari-park-zone" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" rx="${(rx * 1.5).toFixed(1)}" ry="${(ry * 1.4).toFixed(1)}" />
        <ellipse class="daari-water-poly" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" />
      </g>`;
    }),
    // Curzon Park / Palace Gardens & Chamundi Reserve Green Polygons
    (() => {
      const pal = gpsToSvgPixel(76.6552, 12.3052);
      const hill = gpsToSvgPixel(76.6730, 12.2726);
      return `
        <rect x="${(pal.x - 36).toFixed(1)}" y="${(pal.y - 28).toFixed(1)}" width="72" height="56" rx="8" class="daari-park-zone" />
        <ellipse cx="${hill.x.toFixed(1)}" cy="${hill.y.toFixed(1)}" rx="120" ry="85" class="daari-park-zone" />
      `;
    })(),
  ].join('');

  // Golden-Orange Route Path from Player -> K.R. Circle -> Palace -> Active Target
  const playerPt = gpsToSvgPixel(playerGps.lon, playerGps.lat);
  const krPt = gpsToSvgPixel(76.6546, 12.3092);
  const palPt = gpsToSvgPixel(76.6552, 12.3052);
  const targetPt = waypointGps ? gpsToSvgPixel(waypointGps.lon, waypointGps.lat) : palPt;

  const routeSvg = `
    <path class="daari-route-glow" d="M${playerPt.x.toFixed(1)} ${playerPt.y.toFixed(1)} L${krPt.x.toFixed(1)} ${krPt.y.toFixed(1)} L${targetPt.x.toFixed(1)} ${targetPt.y.toFixed(1)}" />
    <path class="daari-route-line" d="M${playerPt.x.toFixed(1)} ${playerPt.y.toFixed(1)} L${krPt.x.toFixed(1)} ${krPt.y.toFixed(1)} L${targetPt.x.toFixed(1)} ${targetPt.y.toFixed(1)}" />
  `;

  // Street-level POIs
  const streetPoisSvg = MYSURU_STREET_POIS.map((poi) => {
    const { x, y } = gpsToSvgPixel(poi.lon, poi.lat);
    const color = POI_COLORS[poi.poiType];
    const dx = poi.dx ?? 10;
    const dy = poi.dy ?? 4;
    return `<g class="daari-poi" data-poi-id="${poi.id}" data-poi-name="${escapeXml(poi.name)}" data-poi-sub="Mysuru Street Point">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${color.fill}" stroke="#121324" stroke-width="2" />
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="${color.stroke}" />
      <text class="daari-poi-text" x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}">${escapeXml(poi.name)}</text>
    </g>`;
  }).join('');

  // 12 Major Landmarks
  const majorLandmarksSvg = MYSURU_LANDMARKS.map((lm) => {
    const { x, y } = gpsToSvgPixel(lm.lon, lm.lat);
    const color = POI_COLORS[lm.poiType];
    return `<g class="daari-poi major" data-poi-id="${lm.id}" data-poi-name="${escapeXml(lm.name)}" data-poi-sub="${escapeXml(lm.kannadaName)} · ${escapeXml(lm.district)}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.2" fill="${color.fill}" stroke="#121324" stroke-width="2.2" />
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8" fill="#ffffff" />
      <text class="daari-landmark-text" x="${(x + lm.dx).toFixed(1)}" y="${(y + lm.dy).toFixed(1)}">${escapeXml(lm.name)}</text>
      ${
        lm.priceTag
          ? `<text class="daari-objective-sub" x="${(x + lm.dx).toFixed(1)}" y="${(y + lm.dy + 13).toFixed(1)}">${escapeXml(lm.priceTag)}</text>`
          : ''
      }
    </g>`;
  }).join('');

  // Locked Peripheral Areas with Padlocks (like WHITEFIELD / JAYANAGAR / HSR LAYOUT in Screenshot 1)
  const lockedAreasSvg = LOCKED_MYSURU_AREAS.map((area) => {
    const { x, y } = gpsToSvgPixel(area.lon, area.lat);
    return `<g class="daari-locked-zone">
      <text class="daari-locked-title" x="${x.toFixed(1)}" y="${y.toFixed(1)}">🔒 ${escapeXml(area.name)}</text>
      <text class="daari-locked-sub" x="${x.toFixed(1)}" y="${(y + 13).toFixed(1)}">${escapeXml(area.subtitle)}</text>
    </g>`;
  }).join('');

  // Custom Waypoint Marker if clicked
  const waypointSvg = waypointGps
    ? (() => {
        const wp = gpsToSvgPixel(waypointGps.lon, waypointGps.lat);
        return `<g class="daari-waypoint-marker" transform="translate(${wp.x.toFixed(1)} ${wp.y.toFixed(1)})">
          <circle r="11" fill="#38bdf833" />
          <circle r="6.5" fill="#38bdf8" stroke="#ffffff" stroke-width="2.2" />
        </g>`;
      })()
    : '';

  svg.innerHTML = `
    <rect class="daari-bg" width="1000" height="760" fill="#121324" />
    <g id="daari-pan-zoom-group">
      ${waterAndParksSvg}
      ${localPaths.join('')}
      ${secondaryPaths.join('')}
      ${majorPaths.join('')}
      ${routeSvg}
      ${lockedAreasSvg}
      ${streetPoisSvg}
      ${majorLandmarksSvg}
      ${waypointSvg}
      <g id="player-map-dot" transform="translate(${playerPt.x.toFixed(1)} ${playerPt.y.toFixed(1)})">
        <circle class="daari-player-pulse" r="14" />
        <polygon points="0,-8 7,7 0,4 -7,7" fill="#ffffff" stroke="#121324" stroke-width="1.8" />
      </g>
    </g>
  `;

  svg.querySelectorAll<SVGGElement>('.daari-poi').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = el.dataset.poiId ?? '';
      const name = el.dataset.poiName ?? 'Mysuru Place';
      const sub = el.dataset.poiSub ?? '';
      onSelectPoi(id, name, sub);
    });
  });
}