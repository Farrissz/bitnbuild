// Client for the routing server (routing/server.js — Person 1).
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

async function get(path) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error('Can’t reach the routing server. Start it with “npm run dev” from the project root.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Routing server error (${res.status})`);
  return data;
}

export const fetchRoutes = (origin, dest) =>
  get(`/api/routes?origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(dest)}`);

export const fetchPlaces = (q) => get(`/api/places?q=${encodeURIComponent(q || '')}`);

export const fetchDemoPairs = () => get('/api/demo-pairs');
