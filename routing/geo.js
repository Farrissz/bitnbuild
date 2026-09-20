// geo.js — free, key-less map lookups used when a trip isn't a demo pair and Google gives nothing.
//
//   geocode(text | "lat,lng" | {lat,lng})  -> { lat, lng, label } | null     (Photon, then Nominatim)
//   suggestPlaces(text)                     -> [{ description }]              (Photon)
//   roadRoute(a, b)                         -> { km, min, source }            (OSRM, else straight-line estimate)
//   nearestStations(a, b)                   -> { from, to, source }           (Overpass, else built-in Kerala list)
//
// All of these use public OpenStreetMap services: keep traffic low (results are cached) and
// show "© OpenStreetMap contributors" wherever the results appear.

const { KERALA_STATIONS } = require('./stationsKerala');

const UA = process.env.OSM_USER_AGENT || "SpideySenseTransit/0.1 (Bit n' Build 2026 hackathon demo)";
const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/';
const OVERPASS_URL = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const STATION_RADIUS_M = 12000;

// Results are biased towards Kerala unless BIAS_LAT / BIAS_LNG say otherwise.
const biasLat = () => Number(process.env.BIAS_LAT || 10.0);
const biasLng = () => Number(process.env.BIAS_LNG || 76.4);

// ---------- helpers ----------
// If a service fails, skip it for a few minutes instead of making every search wait for its timeout.
const downUntil = {};
const isDown = (name) => (downUntil[name] || 0) > Date.now();
const markDown = (name) => { downUntil[name] = Date.now() + 5 * 60e3; };

const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await fn();
  if (value) cache.set(key, { value, until: Date.now() + ttlMs });
  return value;
}

async function getJson(url, init = {}, timeoutMs = 8000) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Short name for display: what the user typed, up to the first comma.
const shortLabel = (s) => String(s).split(',')[0].trim();

function photonLabel(p) {
  const parts = [p.name || [p.housenumber, p.street].filter(Boolean).join(' '), p.city || p.county || p.district, p.state];
  return parts.filter((x, i) => x && parts.indexOf(x) === i).join(', ');
}

// ---------- Kerala only ----------
// Places outside Kerala are rejected. Set LIMIT_TO_KERALA=false to allow anywhere.
const KERALA = { minLat: 8.15, maxLat: 12.85, minLng: 74.8, maxLng: 77.45 };
const keralaOnly = () => String(process.env.LIMIT_TO_KERALA).toLowerCase() !== 'false';
const inKeralaBox = (p) =>
  p.lat >= KERALA.minLat && p.lat <= KERALA.maxLat && p.lng >= KERALA.minLng && p.lng <= KERALA.maxLng;
const isKeralaState = (state) => /kerala|കേരളം/i.test(String(state || ''));
function inKerala(p, state) {
  if (!keralaOnly()) return true;
  if (!inKeralaBox(p)) return false;
  return state ? isKeralaState(state) : true; // the box also covers bits of Tamil Nadu and Karnataka
}
const photonArea = () =>
  keralaOnly()
    ? `&bbox=${KERALA.minLng},${KERALA.minLat},${KERALA.maxLng},${KERALA.maxLat}`
    : `&lat=${biasLat()}&lon=${biasLng()}`;

// Names of places outside Kerala. Checked against the whole search text, so a Kerala place that
// merely contains one of these words ("UAE Exchange, Kochi") still works.
const OUTSIDE_KERALA = new Set([
  'oman', 'muscat', 'salalah', 'sohar', 'nizwa', 'uae', 'u a e', 'united arab emirates', 'emirates', 'dubai',
  'abu dhabi', 'sharjah', 'ajman', 'fujairah', 'ras al khaimah', 'al ain', 'qatar', 'doha', 'saudi', 'saudi arabia',
  'ksa', 'riyadh', 'jeddah', 'dammam', 'kuwait', 'bahrain', 'manama', 'gcc', 'gulf', 'usa', 'us', 'america',
  'united states', 'uk', 'united kingdom', 'england', 'london', 'canada', 'australia', 'singapore', 'malaysia',
  'sri lanka', 'maldives', 'nepal', 'bangladesh', 'pakistan', 'china', 'japan', 'germany', 'europe', 'asia', 'africa',
  'india', 'bharat', 'tamil nadu', 'tamilnadu', 'karnataka', 'andhra pradesh', 'telangana', 'maharashtra', 'goa',
  'gujarat', 'rajasthan', 'punjab', 'delhi', 'new delhi', 'west bengal', 'bihar', 'odisha', 'uttar pradesh',
  'madhya pradesh', 'assam', 'puducherry', 'pondicherry', 'lakshadweep', 'chennai', 'madras', 'bangalore',
  'bengaluru', 'mumbai', 'bombay', 'hyderabad', 'pune', 'kolkata', 'calcutta', 'coimbatore', 'madurai', 'trichy',
  'tiruchirappalli', 'salem', 'erode', 'tirunelveli', 'kanyakumari', 'nagercoil', 'ooty', 'mysore', 'mysuru',
  'mangalore', 'mangaluru', 'udupi', 'coorg', 'kodagu',
]);
const TOO_BROAD = new Set(['kerala', 'keralam', 'കേരളം']);
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z\u0d00-\u0d7f]+/g, ' ').trim();

// Why a search text can't be used, before looking anything up: 'outside', 'broad', or null.
function rejectReason(text) {
  if (!keralaOnly()) return null;
  const n = normName(text);
  if (OUTSIDE_KERALA.has(n)) return 'outside';
  if (TOO_BROAD.has(n)) return 'broad';
  return null;
}

// ---------- does the result match what was typed? ----------
// Photon always returns its closest guess, even for gibberish, so check the name is close to the query.
const ALIASES = {
  trivandrum: 'thiruvananthapuram', tvm: 'thiruvananthapuram', alleppey: 'alappuzha', calicut: 'kozhikode',
  quilon: 'kollam', cochin: 'kochi', trichur: 'thrissur', palghat: 'palakkad', cannanore: 'kannur',
  tellicherry: 'thalassery', badagara: 'vadakara', kasargod: 'kasaragod', changanacherry: 'changanassery',
};
const GENERIC = new Set([
  'road', 'rd', 'junction', 'jn', 'jct', 'station', 'railway', 'bus', 'stand', 'stop', 'terminal', 'nagar', 'street',
  'st', 'near', 'the', 'and', 'kerala', 'india', 'city', 'town', 'east', 'west', 'north', 'south', 'new', 'old',
]);
const words = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9\u0d00-\u0d7f]+/g, ' ').split(' ').filter(Boolean);

function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (w) => Array.from({ length: w.length - 1 }, (_, i) => w.slice(i, i + 2));
  const A = grams(a);
  const pool = grams(b);
  const total = A.length + pool.length;
  let hits = 0;
  for (const g of A) {
    const i = pool.indexOf(g);
    if (i >= 0) { hits += 1; pool.splice(i, 1); }
  }
  return (2 * hits) / total;
}

function matchesQuery(query, names) {
  const all = words(query).map((w) => ALIASES[w] || w).filter((w) => /[a-z\u0d00-\u0d7f]{3,}/.test(w));
  if (!all.length) return false; // "67", "12b" and similar can't be checked
  const key = all.filter((w) => !GENERIC.has(w));
  const target = words(names.filter(Boolean).join(' '));
  return (key.length ? key : all).some((q) => target.some((t) => similarity(q, t) >= 0.7 || (q.length >= 4 && t.startsWith(q))));
}

// Nominatim allows at most one request per second.
let nominatimQueue = Promise.resolve();
const nominatimSlot = () => {
  const slot = nominatimQueue.then(() => new Promise((r) => setTimeout(r, 1100)));
  nominatimQueue = slot;
  return nominatimQueue;
};

// ---------- geocoding ----------
async function geocode(input) {
  if (input && typeof input === 'object' && 'lat' in input) {
    const p = { lat: Number(input.lat), lng: Number(input.lng), label: input.label || 'Pinned location' };
    return inKerala(p) ? p : null;
  }
  const text = String(input || '').trim();
  if (!text || rejectReason(text)) return null;
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const p = { lat: Number(m[1]), lng: Number(m[2]), label: 'Your location' };
    return inKerala(p) ? p : null;
  }

  return cached(`geo:${text.toLowerCase()}`, 24 * 3600e3, async () => {
    if (!isDown('photon')) {
      try {
        const url = `${PHOTON_URL}?q=${encodeURIComponent(text)}&limit=5&lang=en${photonArea()}`;
        const data = await getJson(url);
        for (const f of data.features || []) {
          const pr = f.properties || {};
          const p = { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
          if (inKerala(p, pr.state) && matchesQuery(text, [pr.name, pr.street, pr.locality, pr.district, pr.city, pr.county])) {
            return { ...p, label: shortLabel(text) };
          }
        }
      } catch (e) {
        markDown('photon');
        console.warn('Photon geocode failed:', e.message);
      }
    }
    // Nominatim matches exact and alternative names (not fuzzy), so it's a good second opinion.
    if (!isDown('nominatim') && /[a-z\u0d00-\u0d7f]{3,}/i.test(text)) {
      try {
        await nominatimSlot();
        const area = keralaOnly()
          ? `&viewbox=${KERALA.minLng},${KERALA.maxLat},${KERALA.maxLng},${KERALA.minLat}&bounded=1&countrycodes=in`
          : '';
        const data = await getJson(`${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=3${area}&q=${encodeURIComponent(text)}`);
        for (const r of data || []) {
          const p = { lat: Number(r.lat), lng: Number(r.lon) };
          if (inKerala(p, r.address && r.address.state)) return { ...p, label: shortLabel(text) };
        }
      } catch (e) {
        markDown('nominatim');
        console.warn('Nominatim geocode failed:', e.message);
      }
    }
    // Offline fallback: a Kerala station name inside the text ("Kottayam", "Ernakulam Junction").
    const t = text.toLowerCase();
    const st = KERALA_STATIONS.find((x) => t.includes(x.name.toLowerCase()) || (t.length >= 4 && x.name.toLowerCase().startsWith(t)));
    return st ? { lat: st.lat, lng: st.lng, label: shortLabel(text) } : null;
  });
}

async function suggestPlaces(text) {
  const q = String(text || '').trim();
  if (q.length < 3 || isDown('photon')) return [];
  try {
    return await cached(`suggest:${q.toLowerCase()}`, 3600e3, async () => {
      const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=8&lang=en${photonArea()}`;
      const data = await getJson(url, {}, 5000);
      const seen = new Set();
      return (data.features || [])
        .filter((f) => inKerala({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }, f.properties?.state))
        .map((f) => photonLabel(f.properties || {}))
        .filter((d) => d && !seen.has(d) && seen.add(d))
        .slice(0, 6)
        .map((description) => ({ description, placeId: null, source: 'osm' }));
    });
  } catch (e) {
    markDown('photon');
    console.warn('Photon suggestions failed:', e.message);
    return [];
  }
}

// ---------- roads ----------
async function roadRoute(a, b) {
  const key = `road:${a.lat.toFixed(4)},${a.lng.toFixed(4)}:${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  const osrm = isDown('osrm') ? null : await cached(key, 3600e3, async () => {
    try {
      const data = await getJson(`${OSRM_URL}${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=false`);
      const r = data.code === 'Ok' && data.routes && data.routes[0];
      return r ? { km: r.distance / 1000, min: r.duration / 60, source: 'osrm' } : null;
    } catch (e) {
      markDown('osrm');
      console.warn('OSRM failed:', e.message);
      return null;
    }
  });
  if (osrm) return osrm;
  const km = haversineKm(a, b) * 1.35; // roads are rarely straight
  const kmh = km > 30 ? 45 : 28; // highway vs town driving
  return { km, min: (km / kmh) * 60, source: 'straight-line' };
}

// ---------- railway stations ----------
const METRO_VALUES = new Set(['subway', 'light_rail', 'monorail', 'funicular', 'miniature', 'tram']);
function isMainlineStation(tags = {}) {
  if (METRO_VALUES.has(tags.station)) return false;
  if (tags.subway === 'yes' || tags.light_rail === 'yes' || tags.monorail === 'yes') return false;
  if (tags.disused || tags['disused:railway'] || tags.abandoned) return false;
  return Boolean(tags['name:en'] || tags.name);
}

function nearest(list, p) {
  let best = null;
  for (const s of list) {
    const km = haversineKm(p, s);
    if (km * 1000 <= STATION_RADIUS_M && (!best || km < best.km)) best = { ...s, km };
  }
  return best;
}

async function nearestStations(a, b) {
  const key = `st:${a.lat.toFixed(3)},${a.lng.toFixed(3)}:${b.lat.toFixed(3)},${b.lng.toFixed(3)}`;
  const fromOsm = isDown('overpass') ? null : await cached(key, 24 * 3600e3, async () => {
    const around = (p) => `nwr(around:${STATION_RADIUS_M},${p.lat},${p.lng})["railway"="station"];`;
    const query = `[out:json][timeout:10];(${around(a)}${around(b)});out center tags;`;
    try {
      const data = await getJson(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      }, 9000);
      const list = (data.elements || [])
        .filter((e) => isMainlineStation(e.tags))
        .map((e) => ({
          name: e.tags['name:en'] || e.tags.name,
          lat: e.lat ?? e.center?.lat,
          lng: e.lon ?? e.center?.lon,
        }))
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
      return { from: nearest(list, a), to: nearest(list, b), source: 'osm' };
    } catch (e) {
      markDown('overpass');
      console.warn('Overpass failed, using built-in Kerala stations:', e.message);
      return null;
    }
  });
  if (fromOsm) return fromOsm;
  return { from: nearest(KERALA_STATIONS, a), to: nearest(KERALA_STATIONS, b), source: 'built-in' };
}

module.exports = { geocode, suggestPlaces, roadRoute, nearestStations, haversineKm, matchesQuery, inKerala, rejectReason };
