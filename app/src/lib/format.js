// Shared display helpers.

export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

export const fmtDuration = (sec) => {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
};

// Step modes from the routing API: DRIVE | AUTO | WALK | TRAIN | BUS | FERRY | OTHER
export const STEP_META = {
  TRAIN: { icon: 'fa-train', color: 'text-spidey-blue', label: 'Train' },
  BUS: { icon: 'fa-bus', color: 'text-spidey-red', label: 'Bus' },
  FERRY: { icon: 'fa-ship', color: 'text-cyan-400', label: 'Ferry' },
  DRIVE: { icon: 'fa-car', color: 'text-amber-500', label: 'Cab' },
  AUTO: { icon: 'fa-taxi', color: 'text-amber-400', label: 'Auto' },
  WALK: { icon: 'fa-person-walking', color: 'text-slate-400', label: 'Walk' },
  OTHER: { icon: 'fa-shuffle', color: 'text-slate-300', label: 'Transit' },
};
export const stepMeta = (mode) => STEP_META[mode] || STEP_META.OTHER;

// Route modes from the routing API: driving | auto | train | bus | train+bus | transit | walking
export const ROUTE_LABEL = {
  'train+bus': 'Train + bus',
  train: 'Train only',
  bus: 'Bus only',
  driving: 'Cab / drive',
  auto: 'Auto rickshaw',
  transit: 'Mixed transit',
  walking: 'Walk',
};

// Route ids from the API are index-based, so reviews and trips use a stable key instead.
const slug = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
export const routeKey = (origin, dest, route) =>
  [slug(origin), slug(dest), slug(route?.summary || route?.mode)].join('__');

export const shortName = (userId) =>
  userId ? `Rider ${userId.replace(/^local-/, '').slice(0, 4).toUpperCase()}` : 'Rider';
