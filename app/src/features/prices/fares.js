// Fare ESTIMATES in ₹ for the demo — replaces the old $ MOCK_PRICE_DATABASE.
// Swap these rules for real fare tables (KSRTC, Indian Railways, Kochi Metro, Water Metro) when available.
const round5 = (x) => Math.max(5, Math.round(x / 5) * 5);

export function stepFare(step) {
  const km = (step.distanceMeters || 0) / 1000;
  const line = (step.line || '').toLowerCase();
  switch (step.mode) {
    case 'TRAIN':
      if (line.includes('metro')) return Math.min(60, round5(10 + 2.5 * km)); // metro-style slab, capped
      return round5(Math.max(10, 0.3 * km)); // unreserved passenger / MEMU
    case 'BUS':
      if (/\bac\b/.test(line)) return round5(Math.max(30, 2 * km));
      if (line.includes('fast')) return round5(Math.max(15, 1.1 * km));
      return round5(Math.max(10, km)); // ordinary / city / feeder
    case 'FERRY':
      return round5(Math.max(20, 2 * km));
    case 'DRIVE':
      return round5(60 + 16 * km); // cab: base + per km
    case 'AUTO':
      return round5(30 + 15 * Math.max(0, km - 1.5)); // ₹30 minimum for 1.5 km, then per km
    case 'OTHER':
      return round5(Math.max(10, km));
    default:
      return 0; // WALK
  }
}

// Fare for one rider (a cab or auto counted as the whole vehicle).
export const routeFare = (route) => (route.steps || []).reduce((sum, s) => sum + stepFare(s), 0);

// Seats per shared vehicle. Everything else (bus, train, metro, ferry) is one ticket per person.
const SHARED = {
  DRIVE: { seats: 4, one: 'cab', many: 'cabs', label: 'Cab' },
  AUTO: { seats: 3, one: 'auto', many: 'autos', label: 'Auto' },
};

// Group cost for any route: tickets are per person, cabs/autos are shared by everyone riding in them.
export function splitCost(route, people) {
  const n = Math.max(1, people);
  let ticketEach = 0;
  const shared = {};
  for (const s of route.steps || []) {
    const fare = stepFare(s);
    if (!fare) continue;
    if (SHARED[s.mode]) shared[s.mode] = (shared[s.mode] || 0) + fare;
    else ticketEach += fare;
  }

  const lines = [];
  if (ticketEach) lines.push({ label: `Tickets ₹${ticketEach} × ${n} ${n === 1 ? 'person' : 'people'}`, amount: ticketEach * n });
  let sharedTotal = 0;
  for (const [mode, fare] of Object.entries(shared)) {
    const v = SHARED[mode];
    const count = Math.ceil(n / v.seats);
    sharedTotal += fare * count;
    lines.push({ label: `${v.label} ₹${fare} × ${count} ${count === 1 ? v.one : v.many}, shared`, amount: fare * count });
  }

  const total = ticketEach * n + sharedTotal;
  return { total, perPerson: Math.ceil(total / n), lines };
}
