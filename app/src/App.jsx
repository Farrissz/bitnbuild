import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { initAnonymousAuth } from './config/firebase';
import { fetchRoutes } from './lib/api';
import { fmtTime, routeKey } from './lib/format';
import SearchView from './features/routes/SearchView';
import ResultsView from './features/routes/ResultsView';
import { TripPage } from './features/trips/TripPage';
import SplitPayment from './features/payments/SplitPayment';
import ReviewForm from './features/reviews/ReviewForm';
import { routeFare } from './features/prices/fares';

// Integrated app: Person 4's shell and tabs, Person 1's routing API, Person 2's trips/location,
// Person 3's prices, split payment and reviews.
const TABS = [
  { id: 'search', label: 'Search', icon: 'fa-magnifying-glass' },
  { id: 'routes', label: 'Routes', icon: 'fa-route' },
  { id: 'squad', label: 'Squad', icon: 'fa-users' },
  { id: 'reviews', label: 'Reviews', icon: 'fa-star' },
];

// Search-screen checkboxes -> route modes returned by the routing API.
const PREF_MODES = {
  sync: ['train+bus', 'train'],
  bus: ['bus'],
  ferry: ['transit'],
  cab: ['driving', 'auto'],
};

const isVisible = (route, prefs) => {
  if (route.mode === 'walking') return prefs.sync || prefs.bus || prefs.ferry;
  if (prefs.ferry && route.steps.some((s) => s.mode === 'FERRY')) return true;
  return Object.entries(PREF_MODES).some(([k, modes]) => prefs[k] && modes.includes(route.mode));
};

export default function App() {
  const [view, setView] = useState('search');
  const [userId, setUserId] = useState(null);
  const [origin, setOrigin] = useState('Kollam Junction, Kollam');
  const [dest, setDest] = useState('Technopark, Thiruvananthapuram');
  const [prefs, setPrefs] = useState({ sync: true, bus: true, ferry: true, cab: false });
  const [search, setSearch] = useState({ status: 'idle', routes: [], warnings: [], origin: '', dest: '', error: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { initAnonymousAuth().then(setUserId); }, []);

  const showToast = useCallback((msg) => setToast({ msg, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const runSearch = async (o = origin, d = dest) => {
    if (!o.trim() || !d.trim()) { showToast('Enter both a start and a destination.'); return; }
    setSearch((s) => ({ ...s, status: 'loading', error: '' }));
    setView('routes');
    try {
      const data = await fetchRoutes(o.trim(), d.trim());
      const routes = data.routes.map((r) => ({ ...r, key: routeKey(o, d, r), fare: routeFare(r) }));
      setSearch({ status: 'done', routes, warnings: data.warnings || [], origin: o.trim(), dest: d.trim(), error: '' });
      const pick = routes.find((r) => r.synced)
        || routes.find((r) => !['driving', 'auto', 'walking'].includes(r.mode))
        || routes[0];
      setSelectedId(pick ? pick.id : null);
    } catch (e) {
      setSearch((s) => ({ ...s, status: 'error', error: e.message }));
    }
  };

  const visibleRoutes = useMemo(() => search.routes.filter((r) => isVisible(r, prefs)), [search.routes, prefs]);
  const selected = search.routes.find((r) => r.id === selectedId) || null;

  // Header bell: a transfer reminder for the chosen route.
  const transferAlert = () => {
    if (!selected) return showToast('Pick a route to get transfer reminders.');
    const rides = selected.steps.filter((s) => s.departure);
    if (!selected.transfers.length || rides.length < 2) return showToast('No transfers on this route.');
    const t = selected.transfers[0];
    const next = rides[1];
    const kind = next.mode === 'BUS' ? 'bus' : next.mode === 'TRAIN' ? 'train' : 'connection';
    return showToast(`Change at ${t.at}: your ${kind} leaves at ${fmtTime(next.departure)}, ${t.gapMin} min after you arrive.`);
  };

  const panel = (id) => `view-section ${view === id ? 'active' : ''}`;

  return (
    <div className="h-full flex flex-col overflow-hidden web-grid">
      <header className="bg-spidey-cardbg/80 backdrop-blur-md border-b border-spidey-border z-20 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="h-1 bg-gradient-to-r from-spidey-red via-purple-600 to-spidey-blue" />
        <div className="px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
          <button type="button" className="flex items-center gap-2.5" onClick={() => setView('search')}>
            <span className="w-9 h-9 rounded-xl bg-spidey-red/10 border border-spidey-red/30 flex items-center justify-center text-spidey-red shadow-lg shadow-spidey-red/10">
              <i className="fa-solid fa-spider text-lg" aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-base font-bold tracking-tight text-white leading-none">Spidey-Sense</span>
              <span className="block text-[10px] font-semibold text-spidey-blue tracking-widest">TRANSIT SYNC</span>
            </span>
          </button>
          <button
            type="button"
            onClick={transferAlert}
            aria-label="Transfer alerts"
            className="w-9 h-9 rounded-xl bg-spidey-border/50 border border-spidey-border flex items-center justify-center text-slate-300 hover:text-white transition-colors relative"
          >
            <i className="fa-regular fa-bell text-sm" aria-hidden="true" />
            {selected?.transfers.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-spidey-red" />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28 px-4 pt-4 max-w-lg mx-auto w-full">
        <section className={`${panel('search')} min-h-full`}>
          <SearchView
            origin={origin} setOrigin={setOrigin}
            dest={dest} setDest={setDest}
            prefs={prefs} setPrefs={setPrefs}
            onSearch={runSearch}
            loading={search.status === 'loading'}
          />
        </section>

        <section className={panel('routes')}>
          <ResultsView
            search={search}
            visibleRoutes={visibleRoutes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            goTo={setView}
          />
        </section>

        {/* Kept mounted so an active trip and location sharing survive tab switches. */}
        <section className={panel('squad')}>
          <TripPage userId={userId} route={selected} origin={search.origin} dest={search.dest} onToast={showToast} active={view === 'squad'} />
        </section>

        <section className={panel('reviews')}>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-1">Reviews &amp; bill split</h2>
            <p className="text-xs text-slate-400">
              {selected ? `For ${selected.summary}` : 'Crowdsourced route ratings and cost splitting.'}
            </p>
          </div>

          <SplitPayment key={`${search.origin}|${search.dest}`} routes={search.routes} selectedId={selectedId} />

          {selected ? (
            <ReviewForm key={selected.key} routeId={selected.key} userId={userId} onToast={showToast} />
          ) : (
            <div className="bg-spidey-cardbg border border-dashed border-spidey-border rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-300 mb-2">Choose a route to read and post reviews for it.</p>
              <button type="button" onClick={() => setView(search.routes.length ? 'routes' : 'search')} className="text-xs font-bold text-spidey-blue">
                {search.routes.length ? 'Pick a route' : 'Search routes'}
              </button>
            </div>
          )}
        </section>
      </main>

      <nav className="bg-spidey-cardbg/90 backdrop-blur-md border-t border-spidey-border px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] fixed bottom-0 w-full z-20">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              aria-current={view === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 transition-colors w-16 ${view === t.id ? 'text-spidey-red' : 'text-slate-400 hover:text-white'}`}
            >
              <i className={`fa-solid ${t.icon} text-base`} aria-hidden="true" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 w-[min(92vw,26rem)] bg-slate-900 border border-spidey-red text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50"
        >
          <i className="fa-solid fa-spider text-spidey-red mr-1.5" aria-hidden="true" /> {toast.msg}
        </div>
      )}
    </div>
  );
}
