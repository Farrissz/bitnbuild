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

// ---------- geocoding ----------
async function geocode(input) {
  if (input && typeof input === 'object' && 'lat' in input) {
    return { lat: Number(input.lat), lng: Number(input.lng), label: input.label || 'Pinned location' };
  }
  const text = String(input || '').trim();
  if (!text) return null;
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]), label: 'Your location' };

  return cached(`geo:${text.toLowerCase()}`, 24 * 3600e3, async () => {
    if (!isDown('photon')) {
      try {
        const url = `${PHOTON_URL}?q=${encodeURIComponent(text)}&limit=1&lang=en&lat=${biasLat()}&lon=${biasLng()}`;
        const data = await getJson(url);
        const f = data.features && data.features[0];
        if (f) return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label: shortLabel(text) };
      } catch (e) {
        markDown('photon');
        console.warn('Photon geocode failed:', e.message);
      }
    }
    try {
      const cc = process.env.REGION_CODE ? `&countrycodes=${process.env.REGION_CODE.toLowerCase()}` : '';
      const data = await getJson(`${NOMINATIM_URL}?format=jsonv2&limit=1${cc}&q=${encodeURIComponent(text)}`);
      if (data[0]) return { lat: Number(data[0].lat), lng: Number(data[0].lon), label: shortLabel(text) };
    } catch (e) {
      console.warn('Nominatim geocode failed:', e.message);
    }
    // Offline fallback: a Kerala station name inside the text ("Kottayam", "Ernakulam Junction").
    const t = text.toLowerCase();
    const st = KERALA_STATIONS.find((x) => t.includes(x.name.toLowerCase()) || x.name.toLowerCase().startsWith(t));
    return st ? { lat: st.lat, lng: st.lng, label: shortLabel(text) } : null;
  });
}

async function suggestPlaces(text) {
  const q = String(text || '').trim();
  if (q.length < 3 || isDown('photon')) return [];
  try {
    return await cached(`suggest:${q.toLowerCase()}`, 3600e3, async () => {
      const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=${biasLat()}&lon=${biasLng()}`;
      const data = await getJson(url, {}, 5000);
      const seen = new Set();
      return (data.features || [])
        .map((f) => photonLabel(f.properties || {}))
        .filter((d) => d && !seen.has(d) && seen.add(d))
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

module.exports = { geocode, suggestPlaces, roadRoute, nearestStations, haversineKm };
