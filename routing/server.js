// server.js — HTTP wrapper so the frontend can call the routing module.
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { planRoutes, autocomplete } = require('./routes');
const { DEMO_PAIRS } = require('./demoData');

const app = express();
app.use(cors());

// GET /api/routes?origin=...&dest=...&modes=train,bus,train%2Bbus,driving
app.get('/api/routes', async (req, res) => {
  const { origin, dest, modes } = req.query;
  if (!origin || !dest) return res.status(400).json({ error: 'origin and dest are required' });
  try {
    const result = await planRoutes(origin, dest, {
      modes: modes ? String(modes).split(',').map((m) => m.trim()).filter(Boolean) : undefined,
    });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/places?q=kollam  -> autocomplete suggestions (demo places first)
app.get('/api/places', async (req, res) => {
  res.json(await autocomplete(req.query.q));
});

// GET /api/demo-pairs -> quick-pick buttons for the demo
app.get('/api/demo-pairs', (req, res) => {
  res.json(DEMO_PAIRS.map((p) => ({ key: p.key, origin: p.origin, dest: p.dest })));
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    googleKey: !!process.env.GOOGLE_MAPS_API_KEY,
    mock: process.env.USE_MOCK === 'true',
    estimates: String(process.env.USE_ESTIMATES).toLowerCase() !== 'false',
  });
});

// Serve the built frontend (app/dist) so the whole app runs from one URL: `npm run build` then `npm start`.
const APP_DIST = path.join(__dirname, '..', 'app', 'dist');
if (fs.existsSync(APP_DIST)) {
  app.use(express.static(APP_DIST));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(APP_DIST, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Routing API on http://localhost:${PORT}`));
