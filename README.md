CyberBytes Project Submission for Bit n' Build 2026

Selected problem statement:
**1. Spidey-Sense Transit (Multimodal Transit Sync)**

Commuting between local buses (like KSRTC), passenger ferries, and feeder autos often leaves passengers stranded due to unsynchronized timetables and sudden delays.
Build a project that: Creates a lightweight multimodal transit planner providing live crowdsourced schedule updates, simple transfer notifications, and alternative route suggestions.



Our solution:
We have decided to build a application (android/iOS)

---

## What's in the repo

| Folder | What it is | From branch |
|---|---|---|
| `routing/` | Node/Express API: route options, synced train+bus detection, demo data, place autocomplete | `main` (Person 1) |
| `app/` | React + Vite mobile web app (installable to the home screen) | integration of the three below |
| `app/src/App.jsx`, `app/src/features/routes/` | App shell, tabs, search and route screens | `person4-UI` |
| `app/src/features/trips/`, `app/src/config/firebase.js` | Group trips with join codes, live location sharing, Mapbox squad map | `person2-trips-and-location` |
| `app/src/features/prices/`, `payments/`, `reviews/` | Price comparison, group split calculator, route reviews | `feature-prices-reviews` |

## Run it

Needs Node 18+.

```bash
npm run setup      # installs root, routing/ and app/
npm run dev        # API on :3001 + app on http://localhost:5173
```

It works straight away without any keys:

- **Any two places** (towns, stations, landmarks) get estimated options: cab, auto, bus, walk, and train with an auto or local-bus connection when both ends are near a railway station. Times and fares are estimated from distance using free OpenStreetMap services (Photon for place search, OSRM for road distance, Overpass for stations), so an internet connection is needed.
- **Three demo trips** (Kollam to Technopark, MG Road to the airport, Kottayam to Infopark) have hand-made timetables that show the synced train+bus connection.
- Trips and reviews are kept on the device until Firebase keys are added.

Single-URL build (what to use for judging or deploying):

```bash
npm run build      # builds app/dist
npm start          # routing server serves the API and the app on http://localhost:3001
```

## Keys (all optional)

- `routing/.env` (copy `routing/.env.example`): `GOOGLE_MAPS_API_KEY` with **Routes API** and **Places API (New)** enabled, for live routes anywhere.
- `app/.env` (copy `app/.env.example`): `VITE_FIREBASE_*` to share trips, locations and reviews across phones (enable Anonymous sign-in and Firestore, then paste `firestore.rules`), and `VITE_MAPBOX_TOKEN` for the squad map.

Location sharing only works on `https://` or `localhost`. To test on phones, deploy or use a tunnel (for example `cloudflared tunnel --url http://localhost:3001`).

## Notes from the integration

- Fares are estimates from simple ₹ rules in `app/src/features/prices/fares.js`; replace with real fare tables.
- The split calculator works for every route: bus/train tickets are paid per person, and cabs (4 seats) and autos (3 seats) are shared. There's also a custom amount option.
- Estimated routes are never marked "synced", because there's no timetable behind them. Typical speeds and waits are at the top of `routing/estimate.js`.
- Showing estimated routes requires the credit "© OpenStreetMap contributors" (already in the app).
- `react-map-gl` v8 must be imported from `react-map-gl/mapbox`; the old root import doesn't build.
- Unused dependencies from the trips branch (`@vis.gl/react-google-maps`, `lucide-react`) were dropped.
- Person 3's standalone `components/App.jsx` test page was replaced by the real app.
