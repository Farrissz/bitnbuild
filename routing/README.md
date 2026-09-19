# Routing & Maps module

Returns driving and transit route options (with train / bus / train+bus separated) and a demo-ready
"synchronized arrival" option. Works immediately on demo data; switches to live Google data once a key is in `.env`.

## Run

```bash
npm install
cp .env.example .env        # add GOOGLE_MAPS_API_KEY, or set USE_MOCK=true
npm run try                 # prints routes for the first demo pair
npm run try -- "MG Road, Ernakulam" "Cochin International Airport"
npm start                   # API on http://localhost:3001
```

## Google Cloud setup

Directions API and Distance Matrix API are **legacy** since March 2025 and can't be enabled on new projects.
Enable these instead: **Routes API** and **Places API (New)**. Billing must be enabled on the project.
Restrict the key to those two APIs. Keep the key on this server — never ship it in frontend code.

If a call fails, the reason appears in the response's `warnings` array (e.g. `Routes API 403: ...` means the API
isn't enabled or the key is restricted wrongly).

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/routes?origin=...&dest=...` | Route options. Optional `&modes=train,bus,train%2Bbus,driving` |
| `GET /api/places?q=...` | Autocomplete (demo places listed first) |
| `GET /api/demo-pairs` | The hardcoded demo pairs — use as quick-pick buttons |
| `GET /api/health` | Shows whether a key is loaded |

`origin` / `dest` accept a place name or address, `lat,lng`, or `place_id:ChIJ...`.
**Send the text description** (not only the place ID) so demo pairs still match by keyword.

## Response shape

```js
{
  routes: [{
    id, mode,            // 'driving' | 'train' | 'bus' | 'train+bus' | 'transit' | 'walking'
    summary,             // "MEMU → Technopark feeder bus"
    duration, durationText,              // seconds, "1 h 28 min"
    departure, arrival,                  // ISO strings
    departureText, arrivalText,          // "4:10 PM"
    leaveInMin,
    synced, syncInfo,                    // true + "Bus leaves 4 min after your train reaches ..."
    transfers: [{ at, fromMode, toMode, gapMin }],
    steps: [{ mode, instruction, duration, durationText, distanceMeters,
              line?, from?, to?, stops?, departure?, arrival? }],   // mode: DRIVE | WALK | TRAIN | BUS | FERRY | OTHER
    polyline,            // encoded polyline (Google results only), null for demo
    source               // 'google' | 'demo'
  }],
  warnings: []
}
```

Routes are sorted by arrival time. Frontend call:

```js
const r = await fetch(`http://localhost:3001/api/routes?origin=${encodeURIComponent(o)}&dest=${encodeURIComponent(d)}`);
const { routes } = await r.json();
```

As a plain module (no server): `const { getRoutes } = require('./routes'); await getRoutes(origin, dest);`

## How the synchronized arrival works

- **Demo pairs** (`demoData.js`): three hardcoded origin→destination pairs, each with a synced train+bus option,
  an unsynced one for comparison, bus-only, and driving. Times are offsets from *now*, so the demo looks live at any hour.
  For a demo pair, the synced option is always added; the other demo options only fill in when Google returns nothing.
- **Real Google results**: a train+bus route gets `synced: true` when every transfer gap is ≤ `SYNC_MAX_WAIT_MIN` (default 10).

To add or change a demo pair, copy a block in `DEMO_PAIRS` and edit the `match` keywords and leg minutes.

## Attribution

When showing Google route results, display "Powered by Google, ©2026 Google" (the Routes API doesn't return it).
