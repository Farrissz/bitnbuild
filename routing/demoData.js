// demoData.js — hardcoded routes for the "synchronized arrival" demo.
//
// Times are OFFSETS FROM NOW (minutes), so the demo looks live whenever you run it.
// A pair matches when the origin text contains any `match.origin` keyword AND the
// destination text contains any `match.dest` keyword (case-insensitive).
// Pairs are one-directional. Swap in whatever places your demo script uses.
//
// Leg fields: mode (DRIVE | WALK | AUTO | TRAIN | BUS | FERRY), min, km, line, from, to, stops,
// waitBefore (minutes spent waiting before this leg starts).

const DEMO_PAIRS = [
  {
    key: 'kollam-technopark',
    origin: 'Kollam Junction, Kollam',
    dest: 'Technopark, Thiruvananthapuram',
    match: { origin: ['kollam'], dest: ['technopark', 'kazhakkoottam', 'kazhakuttam'] },
    options: [
      {
        mode: 'driving', summary: 'Via NH 66', startIn: 0,
        legs: [{ mode: 'DRIVE', min: 100, km: 68, instruction: 'Drive via NH 66 to Technopark' }],
      },
      {
        mode: 'train+bus', synced: true, summary: 'MEMU → Technopark feeder bus', startIn: 6,
        legs: [
          { mode: 'WALK', min: 7, km: 0.5, to: 'Kollam Junction' },
          { mode: 'TRAIN', min: 62, km: 55, line: 'Kollam–Thiruvananthapuram MEMU', from: 'Kollam Junction', to: 'Kazhakkoottam', stops: 12, waitBefore: 3 },
          { mode: 'BUS', min: 9, km: 3, line: 'Technopark Feeder', from: 'Kazhakkoottam Station', to: 'Technopark Phase 1', stops: 3, waitBefore: 4 },
          { mode: 'WALK', min: 3, km: 0.2, to: 'Technopark' },
        ],
      },
      {
        mode: 'train+bus', summary: 'MEMU → regular city bus', startIn: 6,
        legs: [
          { mode: 'WALK', min: 7, km: 0.5, to: 'Kollam Junction' },
          { mode: 'TRAIN', min: 62, km: 55, line: 'Kollam–Thiruvananthapuram MEMU', from: 'Kollam Junction', to: 'Kazhakkoottam', stops: 12, waitBefore: 3 },
          { mode: 'BUS', min: 11, km: 3, line: 'KSRTC City Bus', from: 'Kazhakkoottam Junction', to: 'Technopark Phase 1', stops: 4, waitBefore: 23 },
          { mode: 'WALK', min: 3, km: 0.2, to: 'Technopark' },
        ],
      },
      {
        mode: 'bus', summary: 'KSRTC Fast Passenger', startIn: 4,
        legs: [
          { mode: 'WALK', min: 10, km: 0.8, to: 'Kollam KSRTC Bus Stand' },
          { mode: 'BUS', min: 105, km: 60, line: 'KSRTC Fast Passenger', from: 'Kollam KSRTC Bus Stand', to: 'Kazhakkoottam', stops: 14, waitBefore: 3 },
          { mode: 'WALK', min: 15, km: 1.2, to: 'Technopark' },
        ],
      },
    ],
  },

  {
    key: 'mgroad-airport',
    origin: 'MG Road, Ernakulam',
    dest: 'Cochin International Airport',
    match: { origin: ['mg road', 'ernakulam', 'kochi'], dest: ['airport', 'cial', 'nedumbassery'] },
    options: [
      {
        mode: 'driving', summary: 'Via NH 544', startIn: 0,
        legs: [{ mode: 'DRIVE', min: 58, km: 31, instruction: 'Drive via NH 544 to Cochin International Airport' }],
      },
      {
        mode: 'train+bus', synced: true, summary: 'Kochi Metro → airport feeder bus', startIn: 3,
        legs: [
          { mode: 'WALK', min: 4, km: 0.3, to: 'MG Road Metro' },
          { mode: 'TRAIN', min: 33, km: 17, line: 'Kochi Metro (towards Aluva)', from: 'MG Road Metro', to: 'Aluva Metro', stops: 14, waitBefore: 3 },
          { mode: 'BUS', min: 22, km: 12, line: 'Airport Feeder', from: 'Aluva Metro', to: 'CIAL Departures', stops: 2, waitBefore: 5 },
          { mode: 'WALK', min: 2, km: 0.1, to: 'Terminal entrance' },
        ],
      },
      {
        mode: 'train+bus', summary: 'Kochi Metro → regular KSRTC bus', startIn: 3,
        legs: [
          { mode: 'WALK', min: 4, km: 0.3, to: 'MG Road Metro' },
          { mode: 'TRAIN', min: 33, km: 17, line: 'Kochi Metro (towards Aluva)', from: 'MG Road Metro', to: 'Aluva Metro', stops: 14, waitBefore: 3 },
          { mode: 'BUS', min: 26, km: 12, line: 'KSRTC Ordinary', from: 'Aluva Bus Stand', to: 'Airport Junction', stops: 7, waitBefore: 27 },
          { mode: 'WALK', min: 9, km: 0.7, to: 'Terminal entrance' },
        ],
      },
      {
        mode: 'bus', summary: 'KSRTC AC Airport Bus', startIn: 8,
        legs: [
          { mode: 'WALK', min: 6, km: 0.4, to: 'MG Road Bus Stop' },
          { mode: 'BUS', min: 72, km: 31, line: 'KSRTC AC Airport Bus', from: 'MG Road Bus Stop', to: 'CIAL Departures', stops: 9, waitBefore: 6 },
        ],
      },
    ],
  },

  {
    key: 'kottayam-infopark',
    origin: 'Kottayam Railway Station',
    dest: 'Infopark, Kakkanad',
    match: { origin: ['kottayam'], dest: ['infopark', 'kakkanad'] },
    options: [
      {
        mode: 'driving', summary: 'Via NH 183 and Tripunithura', startIn: 0,
        legs: [{ mode: 'DRIVE', min: 110, km: 62, instruction: 'Drive via NH 183 and Tripunithura to Infopark' }],
      },
      {
        mode: 'train+bus', synced: true, summary: 'Train → Infopark feeder bus', startIn: 5,
        legs: [
          { mode: 'WALK', min: 6, km: 0.4, to: 'Kottayam Railway Station' },
          { mode: 'TRAIN', min: 55, km: 48, line: 'Kottayam–Ernakulam Passenger', from: 'Kottayam', to: 'Tripunithura', stops: 8, waitBefore: 4 },
          { mode: 'BUS', min: 24, km: 10, line: 'Infopark Feeder', from: 'Tripunithura Station', to: 'Infopark Phase 1', stops: 5, waitBefore: 5 },
          { mode: 'WALK', min: 3, km: 0.2, to: 'Infopark' },
        ],
      },
      {
        mode: 'train+bus', summary: 'Train → regular city bus', startIn: 5,
        legs: [
          { mode: 'WALK', min: 6, km: 0.4, to: 'Kottayam Railway Station' },
          { mode: 'TRAIN', min: 55, km: 48, line: 'Kottayam–Ernakulam Passenger', from: 'Kottayam', to: 'Tripunithura', stops: 8, waitBefore: 4 },
          { mode: 'BUS', min: 30, km: 10, line: 'Private City Bus', from: 'Tripunithura Statue Jn', to: 'Kakkanad', stops: 11, waitBefore: 21 },
          { mode: 'WALK', min: 8, km: 0.6, to: 'Infopark' },
        ],
      },
      {
        mode: 'bus', summary: 'KSRTC to Vyttila Hub → city bus', startIn: 4,
        legs: [
          { mode: 'WALK', min: 8, km: 0.6, to: 'Kottayam KSRTC Bus Stand' },
          { mode: 'BUS', min: 95, km: 58, line: 'KSRTC Fast Passenger', from: 'Kottayam KSRTC', to: 'Vyttila Mobility Hub', stops: 12, waitBefore: 3 },
          { mode: 'BUS', min: 25, km: 9, line: 'City Bus (Kakkanad)', from: 'Vyttila Mobility Hub', to: 'Infopark Phase 1', stops: 6, waitBefore: 9 },
        ],
      },
    ],
  },
];

const norm = (s) => String(s || '').toLowerCase();

function findDemoPair(origin, dest) {
  const o = norm(origin);
  const d = norm(dest);
  return DEMO_PAIRS.find(
    (p) => p.match.origin.some((k) => o.includes(k)) && p.match.dest.some((k) => d.includes(k))
  ) || null;
}

function legInstruction(leg) {
  if (leg.mode === 'DRIVE') return leg.instruction || 'Drive';
  if (leg.mode === 'WALK') return leg.to ? `Walk to ${leg.to}` : 'Walk';
  if (leg.mode === 'AUTO') return leg.to ? `Auto rickshaw to ${leg.to}` : 'Auto rickshaw';
  const kind = leg.mode === 'TRAIN' ? 'Train' : leg.mode === 'FERRY' ? 'Ferry' : 'Bus';
  return `${kind} ${leg.line}: ${leg.from} → ${leg.to}`;
}

// Turns one demo pair into route objects (not yet formatted — routes.js finishes them).
// estimate.js reuses this with source 'estimate'.
function buildDemoRoutes(pair, now, source = 'demo') {
  const built = pair.options.map((opt) => {
    let t = now.getTime() + opt.startIn * 60000;
    const departure = new Date(t);

    const steps = opt.legs.map((leg) => {
      t += (leg.waitBefore || 0) * 60000;
      const dep = new Date(t);
      t += leg.min * 60000;
      const arr = new Date(t);
      const step = {
        mode: leg.mode,
        instruction: legInstruction(leg),
        duration: leg.min * 60,
        distanceMeters: Math.round((leg.km || 0) * 1000),
      };
      if (leg.line) {
        Object.assign(step, {
          line: leg.line, from: leg.from, to: leg.to, stops: leg.stops ?? null,
          departure: dep.toISOString(), arrival: arr.toISOString(),
        });
      }
      return step;
    });

    const rides = steps.filter((s) => s.line);
    const transfers = rides.slice(1).map((s, i) => ({
      at: s.from,
      fromMode: rides[i].mode,
      toMode: s.mode,
      gapMin: Math.round((Date.parse(s.departure) - Date.parse(rides[i].arrival)) / 60000),
    }));

    return {
      mode: opt.mode,
      source,
      summary: opt.summary,
      departure,
      arrival: new Date(t),
      distanceMeters: steps.reduce((a, s) => a + s.distanceMeters, 0),
      polyline: null,
      steps,
      transfers,
      synced: !!opt.synced,
      syncInfo: null,
    };
  });

  // Write the sync message, including how much earlier it gets you vs the unsynced connection.
  const unsynced = built.find((r) => r.mode === 'train+bus' && !r.synced);
  for (const r of built.filter((x) => x.synced)) {
    const t = r.transfers.find((x) => x.fromMode === 'TRAIN' && x.toMode === 'BUS') || r.transfers[0];
    let msg = t ? `Bus leaves ${t.gapMin} min after your train reaches ${t.at}` : 'Connections line up';
    if (unsynced) {
      const saved = Math.round((unsynced.arrival - r.arrival) / 60000);
      if (saved > 0) msg += ` — arrives ${saved} min earlier than the regular connection`;
    }
    r.syncInfo = msg;
  }
  return built;
}

const demoPlaceNames = () => [...new Set(DEMO_PAIRS.flatMap((p) => [p.origin, p.dest]))];

module.exports = { DEMO_PAIRS, findDemoPair, buildDemoRoutes, demoPlaceNames };
