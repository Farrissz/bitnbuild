// routes.js — Routing & Maps module
//
//   getRoutes(origin, dest, opts?)  -> Promise<Route[]>
//   planRoutes(origin, dest, opts?) -> Promise<{ routes, warnings, ... }>
//   autocomplete(input)             -> Promise<[{ description, placeId, source }]>
//
// origin/dest can be: an address/place name string, "lat,lng", "place_id:ChIJ...",
// or { lat, lng }.
//
// Uses Google Routes API (computeRoutes) — the replacement for the legacy
// Directions / Distance Matrix APIs, which new Cloud projects can't enable.
// Falls back to demo data (demoData.js) when there's no key, USE_MOCK=true,
// or Google returns nothing for a demo pair.

const { findDemoPair, buildDemoRoutes, demoPlaceNames } = require('./demoData');

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const TIMEOUT_MS = 8000;

// Google vehicle types -> our two buckets.
const TRAIN_TYPES = new Set([
  'RAIL', 'HEAVY_RAIL', 'COMMUTER_TRAIN', 'HIGH_SPEED_TRAIN', 'LONG_DISTANCE_TRAIN',
  'METRO_RAIL', 'SUBWAY', 'MONORAIL', 'TRAM',
]);
const BUS_TYPES = new Set(['BUS', 'INTERCITY_BUS', 'TROLLEYBUS', 'SHARE_TAXI']);

// One transit call per variant; results are merged and de-duplicated.
// allowedTravelModes is a *preference* to Google, so we still classify every result ourselves.
const TRANSIT_VARIANTS = [
  null,                                        // Google's best mix
  ['TRAIN', 'RAIL', 'SUBWAY', 'LIGHT_RAIL'],   // rail-preferred
  ['BUS'],                                     // bus-preferred
];

const DRIVE_MASK = [
  'routes.duration', 'routes.distanceMeters', 'routes.description', 'routes.polyline.encodedPolyline',
  'routes.legs.steps.navigationInstruction', 'routes.legs.steps.distanceMeters', 'routes.legs.steps.staticDuration',
].join(',');

const TRANSIT_MASK = [
  'routes.duration', 'routes.distanceMeters', 'routes.polyline.encodedPolyline',
  'routes.legs.steps.travelMode', 'routes.legs.steps.staticDuration', 'routes.legs.steps.distanceMeters',
  'routes.legs.steps.navigationInstruction', 'routes.legs.steps.transitDetails',
].join(',');

// ---------- env (read lazily so dotenv can load first) ----------
const apiKey = () => process.env.GOOGLE_MAPS_API_KEY || '';
const forceMock = () => String(process.env.USE_MOCK).toLowerCase() === 'true';
const syncMaxWait = () => Number(process.env.SYNC_MAX_WAIT_MIN || 10);
const regionParams = () => (process.env.REGION_CODE ? { regionCode: process.env.REGION_CODE } : {});
const displayTz = () => process.env.DISPLAY_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

// ---------- small helpers ----------
const secs = (d) => (d ? parseInt(d, 10) || 0 : 0); // "1234s" -> 1234

function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const fmtDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

const fmtTime = (d) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: displayTz() }).format(new Date(d));

function toWaypoint(x) {
  if (x && typeof x === 'object' && 'lat' in x) {
    return { location: { latLng: { latitude: Number(x.lat), longitude: Number(x.lng) } } };
  }
  const s = String(x).trim();
  if (/^place_id:/i.test(s)) return { placeId: s.slice(9) };
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { location: { latLng: { latitude: Number(m[1]), longitude: Number(m[2]) } } };
  return { address: s };
}

function vehicleCategory(type) {
  if (TRAIN_TYPES.has(type)) return 'TRAIN';
  if (BUS_TYPES.has(type)) return 'BUS';
  if (type === 'FERRY') return 'FERRY';
  return 'OTHER';
}

function classifyMode(cats) {
  if (cats.size === 0) return 'walking';
  const train = cats.has('TRAIN');
  const bus = cats.has('BUS');
  if (train && bus) return 'train+bus';
  if (train && cats.size === 1) return 'train';
  if (bus && cats.size === 1) return 'bus';
  return 'transit';
}

// Adds formatted fields; every route (Google or demo) goes through here.
function finish(route, now) {
  const dep = new Date(route.departure);
  const arr = new Date(route.arrival);
  const duration = Math.round((arr - dep) / 1000);
  return {
    mode: route.mode,
    summary: route.summary,
    duration,
    durationText: fmtDuration(duration),
    departure: dep.toISOString(),
    arrival: arr.toISOString(),
    departureText: fmtTime(dep),
    arrivalText: fmtTime(arr),
    leaveInMin: Math.max(0, Math.round((dep - now) / 60000)),
    distanceMeters: route.distanceMeters || 0,
    synced: !!route.synced,
    syncInfo: route.syncInfo || null,
    transfers: route.transfers || [],
    steps: route.steps.map((s) => ({ ...s, durationText: fmtDuration(s.duration) })),
    polyline: route.polyline || null,
    source: route.source,
  };
}

// ---------- Google Routes API ----------
async function callRoutes(body, fieldMask) {
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Routes API ${res.status}: ${data?.error?.message || res.statusText}`);
  return data.routes || []; // {} (no routes) is a normal "nothing found" response
}

function normalizeDriving(r, now) {
  const duration = secs(r.duration);
  const steps = (r.legs || []).flatMap((l) => l.steps || []).map((s) => ({
    mode: 'DRIVE',
    instruction: s.navigationInstruction?.instructions || 'Continue',
    duration: secs(s.staticDuration),
    distanceMeters: s.distanceMeters || 0,
  }));
  return finish({
    mode: 'driving',
    source: 'google',
    summary: r.description ? `Via ${r.description}` : 'Driving',
    departure: now,
    arrival: new Date(now.getTime() + duration * 1000),
    distanceMeters: r.distanceMeters,
    polyline: r.polyline?.encodedPolyline,
    steps,
  }, now);
}

function normalizeTransit(r, now) {
  const steps = [];
  for (const s of (r.legs || []).flatMap((l) => l.steps || [])) {
    const td = s.transitDetails;
    if (td) {
      const line = td.transitLine || {};
      const vType = line.vehicle?.type || 'OTHER';
      const cat = vehicleCategory(vType);
      const name = line.nameShort || line.name || line.vehicle?.name?.text || 'Transit';
      const from = td.stopDetails?.departureStop?.name || '';
      const to = td.stopDetails?.arrivalStop?.name || '';
      const departure = td.stopDetails?.departureTime;
      const arrival = td.stopDetails?.arrivalTime;
      const label = cat === 'TRAIN' ? 'Train' : cat === 'BUS' ? 'Bus' : cat === 'FERRY' ? 'Ferry' : 'Take';
      steps.push({
        mode: cat,
        vehicleType: vType,
        instruction: `${label} ${name}${td.headsign ? ` towards ${td.headsign}` : ''}: ${from} → ${to}`,
        duration: secs(s.staticDuration) || (departure && arrival ? (Date.parse(arrival) - Date.parse(departure)) / 1000 : 0),
        distanceMeters: s.distanceMeters || 0,
        line: name,
        headsign: td.headsign || null,
        from,
        to,
        stops: td.stopCount ?? null,
        departure,
        arrival,
      });
    } else {
      // Routes API returns one step per walking instruction — merge consecutive walks into one leg.
      const prev = steps[steps.length - 1];
      if (prev && prev.mode === 'WALK') {
        prev.duration += secs(s.staticDuration);
        prev.distanceMeters += s.distanceMeters || 0;
      } else {
        steps.push({ mode: 'WALK', duration: secs(s.staticDuration), distanceMeters: s.distanceMeters || 0 });
      }
    }
  }
  steps.filter((s) => s.mode === 'WALK').forEach((s) => {
    s.instruction = `Walk ${fmtDistance(s.distanceMeters)}`;
  });

  const rides = steps.filter((s) => s.departure && s.arrival);

  // Door-to-door times: first ride's departure minus the walk before it, last ride's arrival plus the walk after.
  let departure;
  let arrival;
  if (rides.length) {
    const first = steps.indexOf(rides[0]);
    const last = steps.indexOf(rides[rides.length - 1]);
    const lead = steps.slice(0, first).reduce((a, s) => a + s.duration, 0);
    const trail = steps.slice(last + 1).reduce((a, s) => a + s.duration, 0);
    departure = new Date(Date.parse(rides[0].departure) - lead * 1000);
    arrival = new Date(Date.parse(rides[rides.length - 1].arrival) + trail * 1000);
  } else {
    departure = now;
    arrival = new Date(now.getTime() + secs(r.duration) * 1000);
  }

  const transfers = rides.slice(1).map((s, i) => ({
    at: s.from,
    fromMode: rides[i].mode,
    toMode: s.mode,
    gapMin: Math.round((Date.parse(s.departure) - Date.parse(rides[i].arrival)) / 60000),
  }));

  const mode = classifyMode(new Set(rides.map((s) => s.mode)));

  // Real-data version of the sync badge: train+bus where every transfer gap is short.
  const synced = mode === 'train+bus' && transfers.length > 0
    && transfers.every((t) => t.gapMin >= 0 && t.gapMin <= syncMaxWait());
  const tb = transfers.find((t) => t.fromMode === 'TRAIN' && t.toMode === 'BUS') || transfers[0];

  return finish({
    mode,
    source: 'google',
    summary: rides.map((s) => s.line).join(' → ') || 'Walk',
    departure,
    arrival,
    distanceMeters: r.distanceMeters,
    polyline: r.polyline?.encodedPolyline,
    steps,
    transfers,
    synced,
    syncInfo: synced && tb ? `Next ride leaves ${tb.gapMin} min after you reach ${tb.at}` : null,
  }, now);
}

async function fetchDriving(origin, dest, now) {
  const raw = await callRoutes({
    origin: toWaypoint(origin),
    destination: toWaypoint(dest),
    travelMode: 'DRIVE',
    computeAlternativeRoutes: true,
    languageCode: 'en',
    units: 'METRIC',
    ...regionParams(),
  }, DRIVE_MASK);
  return raw.map((r) => normalizeDriving(r, now));
}

async function fetchTransit(origin, dest, now) {
  const results = await Promise.allSettled(TRANSIT_VARIANTS.map((modes) => callRoutes({
    origin: toWaypoint(origin),
    destination: toWaypoint(dest),
    travelMode: 'TRANSIT',
    computeAlternativeRoutes: true,
    languageCode: 'en',
    units: 'METRIC',
    ...regionParams(),
    ...(modes ? { transitPreferences: { allowedTravelModes: modes } } : {}),
  }, TRANSIT_MASK)));

  if (results.every((r) => r.status === 'rejected')) throw results[0].reason;

  const seen = new Set();
  const out = [];
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    for (const raw of res.value) {
      const route = normalizeTransit(raw, now);
      const sig = route.steps.filter((s) => s.line).map((s) => `${s.line}@${s.departure}`).join('|') || 'walk-only';
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(route);
    }
  }
  return out;
}

// ---------- public API ----------
async function planRoutes(origin, dest, opts = {}) {
  if (!origin || !dest) throw new Error('origin and dest are required');
  const now = opts.now ? new Date(opts.now) : new Date();
  const warnings = [];
  let routes = [];

  const mock = opts.mock ?? forceMock();
  if (!mock && !apiKey()) warnings.push('GOOGLE_MAPS_API_KEY not set — demo data only.');

  if (!mock && apiKey()) {
    const [drive, transit] = await Promise.allSettled([
      fetchDriving(origin, dest, now),
      fetchTransit(origin, dest, now),
    ]);
    if (drive.status === 'fulfilled') routes.push(...drive.value);
    else warnings.push(`Driving: ${drive.reason.message}`);
    if (transit.status === 'fulfilled') routes.push(...transit.value);
    else warnings.push(`Transit: ${transit.reason.message}`);
  }

  const demo = findDemoPair(origin, dest);
  if (demo) {
    const hasDrive = routes.some((r) => r.mode === 'driving');
    const hasTransit = routes.some((r) => r.mode !== 'driving');
    for (const r of buildDemoRoutes(demo, now)) {
      const fillsGap = r.mode === 'driving' ? !hasDrive : !hasTransit;
      if (r.synced || fillsGap) routes.push(finish(r, now)); // synced option always shows for demo pairs
    }
  }

  if (opts.modes && opts.modes.length) routes = routes.filter((r) => opts.modes.includes(r.mode));
  routes.sort((a, b) => Date.parse(a.arrival) - Date.parse(b.arrival));
  routes = routes.map((r, i) => ({ id: `${r.source}-${r.mode}-${i + 1}`, ...r }));

  if (!routes.length) warnings.push('No routes found for this origin/destination.');
  return { origin, dest, generatedAt: now.toISOString(), routes, warnings };
}

async function getRoutes(origin, dest, opts) {
  return (await planRoutes(origin, dest, opts)).routes;
}

// Places API (New) autocomplete. Demo place names always come first so the demo pairs are one tap away.
async function autocomplete(input) {
  const q = String(input || '').trim();
  const demoHits = demoPlaceNames()
    .filter((n) => !q || n.toLowerCase().includes(q.toLowerCase()))
    .map((n) => ({ description: n, placeId: null, source: 'demo' }));
  if (!q || !apiKey() || forceMock()) return demoHits;

  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey() },
      body: JSON.stringify({
        input: q,
        ...(process.env.REGION_CODE ? { includedRegionCodes: [process.env.REGION_CODE.toLowerCase()] } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || res.statusText);
    const hits = (data.suggestions || [])
      .filter((s) => s.placePrediction)
      .map((s) => ({ description: s.placePrediction.text?.text, placeId: s.placePrediction.placeId, source: 'google' }));
    return [...demoHits, ...hits];
  } catch (e) {
    console.warn('Autocomplete failed:', e.message);
    return demoHits;
  }
}

module.exports = { getRoutes, planRoutes, autocomplete, normalizeTransit, normalizeDriving };
