// estimate.js — route options for ANY two places, when there's no demo pair and no Google result.
//
// There is no timetable data here, so every time and wait is an ESTIMATE from distance and typical speeds.
// Routes are marked source: 'estimate' and are never flagged as synced.
// Output uses the same option/leg format as demoData.js, so it runs through the same builder.

const { geocode, roadRoute, nearestStations, haversineKm } = require('./geo');
const { buildDemoRoutes } = require('./demoData');

// Typical Kerala speeds (km/h) and waits (min). Tune these for your demo.
const SPEED = { walk: 4.5, auto: 22, cityBus: 20, ksrtc: 32, train: 45 };
const WAIT = { train: 12, ksrtc: 12, cityBus: 8, auto: 3 };
const WALK_MAX_KM = 1.2; // beyond this, first/last mile is by auto or bus

const mins = (km, kmh) => Math.max(1, Math.round((km / kmh) * 60));
const round1 = (x) => Math.round(x * 10) / 10;

// Getting between a point and a station: walk if close, otherwise a local bus or an auto.
function connector(km, from, to, by) {
  if (km <= WALK_MAX_KM) return [{ mode: 'WALK', min: mins(km, SPEED.walk), km: round1(km), to }];
  if (by === 'bus') {
    return [
      { mode: 'WALK', min: 4, km: 0.3, to: 'nearest bus stop' },
      { mode: 'BUS', min: mins(km, SPEED.cityBus), km: round1(km), line: 'Local bus', from, to, stops: Math.max(2, Math.round(km / 0.8)), waitBefore: WAIT.cityBus },
    ];
  }
  return [{ mode: 'AUTO', min: mins(km, SPEED.auto) + WAIT.auto, km: round1(km), to }];
}

function buildOptions(o, d, road, st) {
  const options = [];
  const km = road.km;

  options.push({
    mode: 'driving', summary: 'Cab', startIn: 0,
    legs: [{ mode: 'DRIVE', min: Math.round(road.min * 1.15), km: round1(km), instruction: `Cab to ${d.label}` }],
  });

  if (km <= 15) {
    options.push({
      mode: 'auto', summary: 'Auto rickshaw', startIn: 0,
      legs: [{ mode: 'AUTO', min: mins(km, SPEED.auto) + WAIT.auto, km: round1(km), to: d.label }],
    });
  }

  if (km <= 3) {
    options.push({ mode: 'walking', summary: 'Walk', startIn: 0, legs: [{ mode: 'WALK', min: mins(km, SPEED.walk), km: round1(km), to: d.label }] });
  }

  if (km >= 2) {
    const long = km > 25;
    options.push({
      mode: 'bus', summary: long ? 'KSRTC Fast Passenger' : 'Local bus', startIn: 0,
      legs: [
        { mode: 'WALK', min: 5, km: 0.35, to: 'nearest bus stop' },
        {
          mode: 'BUS', min: mins(km, long ? SPEED.ksrtc : SPEED.cityBus), km: round1(km),
          line: long ? 'KSRTC Fast Passenger' : 'Local bus', from: o.label, to: d.label,
          stops: Math.max(2, Math.round(km / (long ? 5 : 0.8))), waitBefore: long ? WAIT.ksrtc : WAIT.cityBus,
        },
        { mode: 'WALK', min: 5, km: 0.35, to: d.label },
      ],
    });
  }

  // Train only when both ends are near a station and the rail part is most of the trip.
  const { from: sa, to: sb } = st;
  if (sa && sb && sa.name !== sb.name) {
    const railKm = haversineKm(sa, sb) * 1.2;
    const firstKm = sa.km * 1.3;
    const lastKm = sb.km * 1.3;
    if (railKm >= 12 && firstKm + lastKm <= 0.6 * km) {
      const train = {
        mode: 'TRAIN', min: mins(railKm, SPEED.train), km: round1(railKm), line: 'Passenger / MEMU',
        from: sa.name, to: sb.name, stops: Math.max(1, Math.round(railKm / 7)), waitBefore: WAIT.train,
      };
      const first = connector(firstKm, o.label, sa.name, 'auto');
      const variants = lastKm > WALK_MAX_KM ? ['bus', 'auto'] : ['walk'];
      for (const v of variants) {
        const legs = [...first, train, ...connector(lastKm, sb.name, d.label, v)];
        const hasBus = legs.some((l) => l.mode === 'BUS');
        options.push({
          mode: hasBus ? 'train+bus' : 'train',
          summary: `Train from ${sa.name}${v === 'bus' ? ' → local bus' : v === 'auto' ? ' → auto' : ''}`,
          startIn: 0,
          legs,
        });
      }
    }
  }
  return options;
}

// Returns { routes, warnings }. routes are unfinished route objects (routes.js formats them).
async function estimateRoutes(origin, dest, now) {
  const warnings = [];
  const [o, d] = await Promise.all([geocode(origin), geocode(dest)]);
  if (!o) warnings.push(`Couldn’t find “${origin}” in Kerala. Try a town, station or landmark name.`);
  if (!d) warnings.push(`Couldn’t find “${dest}” in Kerala. Try a town, station or landmark name.`);
  if (!o || !d) return { routes: [], warnings };
  if (haversineKm(o, d) < 0.2) return { routes: [], warnings: ['Start and destination are the same place.'] };

  const [road, st] = await Promise.all([roadRoute(o, d), nearestStations(o, d)]);
  if (road.source !== 'osrm') warnings.push('Road distance is a straight-line estimate (map routing unavailable).');

  const routes = buildDemoRoutes({ options: buildOptions(o, d, road, st) }, now, 'estimate');
  return { routes, warnings, points: { origin: o, dest: d } };
}

module.exports = { estimateRoutes, buildOptions };
