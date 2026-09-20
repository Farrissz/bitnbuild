import React, { useState, useEffect, Suspense, lazy } from 'react';
import { isFirebaseConfigured } from '../../config/firebase';
import {
  createTrip, joinTripWithCode, removeLiveLocation, subscribeToMemberLocations
} from './services/tripService';
import { useLocationBroadcaster } from './hooks/useLocationBroadcaster';
import { shortName } from '../../lib/format';

// Mapbox is heavy, so it only loads the first time the Squad tab is opened (and only with a token).
const TripMap = lazy(() => import('./components/TripMap'));
const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

// If the map can't start (no WebGL, bad token), show a message instead of breaking the whole app.
class MapErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('Map failed to load:', err.message); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <MapPlaceholder
        title="Map couldn’t load"
        text="Check the Mapbox token and your internet connection."
        onRetry={() => this.setState({ failed: false })}
      />
    );
  }
}

function MapPlaceholder({ title, text, onRetry }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 bg-spidey-cardbg">
      <i className="fa-solid fa-map-location-dot text-2xl text-spidey-blue mb-2" aria-hidden="true" />
      <p className="text-xs font-semibold text-slate-300">{title}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-bold text-spidey-blue">Try again</button>
      )}
    </div>
  );
}

const card = 'bg-spidey-cardbg border border-spidey-border rounded-2xl p-4 mb-4';

export const TripPage = ({ userId, route, origin, dest, onToast, active }) => {
  const [tripId, setTripId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState([]);
  const [mapOpened, setMapOpened] = useState(false);

  // Start the map the first time the Squad tab is shown, then keep it.
  useEffect(() => { if (active) setMapOpened(true); }, [active]);

  const userName = shortName(userId);
  useLocationBroadcaster(tripId, userId, userName, isSharing, onToast);

  useEffect(() => {
    if (!tripId) return undefined;
    return subscribeToMemberLocations(tripId, setLocations, (err) => onToast?.(`Live pins unavailable: ${err.message}`));
  }, [tripId, onToast]);

  const handleCreateTrip = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      // Stops come from the route picked on the Routes tab (names only — the routing API has no stop coordinates).
      const rides = (route?.steps || []).filter((s) => s.line);
      const stops = route
        ? [origin, ...rides.map((s) => s.to), dest].filter(Boolean).map((name) => ({ name }))
        : [];
      const res = await createTrip(userId, stops);
      setTripId(res.tripId);
      setJoinCode(res.joinCode);
      onToast?.(`Trip created. Share code ${res.joinCode} with your squad.`);
    } catch (err) {
      onToast?.(`Trip not created: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const id = await joinTripWithCode(userId, inputCode);
      setTripId(id);
      setJoinCode(inputCode.trim().toUpperCase());
      onToast?.('Joined the trip.');
    } catch (err) {
      onToast?.(err.message === 'Invalid Trip Code!' ? 'No trip uses that code. Check it and try again.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSharing = async () => {
    const next = !isSharing;
    setIsSharing(next);
    if (!next && tripId && userId) removeLiveLocation(tripId, userId).catch(() => {});
  };

  const leaveTrip = () => {
    if (isSharing && tripId && userId) removeLiveLocation(tripId, userId).catch(() => {});
    setIsSharing(false);
    setTripId('');
    setJoinCode('');
    setInputCode('');
    setLocations([]);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      onToast?.('Trip code copied.');
    } catch {
      onToast?.(`Trip code: ${joinCode}`);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">Squad web-share</h2>
        <p className="text-xs text-slate-400">Share a trip code so friends can see where everyone is on the route.</p>
      </div>

      {!isFirebaseConfigured && (
        <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
          Demo mode: trips stay on this device. Add Firebase keys to app/.env to share across phones.
        </p>
      )}

      {!tripId ? (
        <>
          <div className={card}>
            <h3 className="text-xs font-bold text-slate-300 mb-1">Start a trip</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              {route ? `For ${route.summary}` : 'Pick a route first to attach its stops, or start a blank trip.'}
            </p>
            <button
              type="button"
              onClick={handleCreateTrip}
              disabled={!userId || busy}
              className="w-full bg-spidey-blue hover:bg-blue-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              Create trip code
            </button>
          </div>

          <div className={card}>
            <label htmlFor="trip-code-input" className="block text-xs font-bold text-slate-300 mb-2.5">Join a trip</label>
            <div className="flex gap-2">
              <input
                id="trip-code-input"
                type="text"
                placeholder="6-character code"
                autoCapitalize="characters"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinTrip()}
                className="flex-1 min-w-0 bg-spidey-dark border border-spidey-border rounded-xl px-3.5 py-2.5 text-xs outline-none text-white uppercase placeholder:normal-case focus:border-spidey-blue"
              />
              <button
                type="button"
                onClick={handleJoinTrip}
                disabled={!userId || busy || !inputCode.trim()}
                className="bg-spidey-blue hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={`${card} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-[11px] text-slate-400">Trip code</p>
              <p className="text-2xl font-black tracking-[0.2em] text-white">{joinCode}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button type="button" onClick={copyCode} className="text-xs font-bold text-spidey-blue">
                <i className="fa-regular fa-copy mr-1" aria-hidden="true" />Copy
              </button>
              <button type="button" onClick={leaveTrip} className="text-[11px] text-slate-400 hover:text-spidey-red">
                Leave trip
              </button>
            </div>
          </div>

          <div className={`${card} flex justify-between items-center`}>
            <div>
              <h3 className="text-xs font-bold text-white">Share my live location</h3>
              <p className="text-[11px] text-slate-400">Sends your position every 10 s while this screen is open</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSharing}
              aria-label="Share my live location"
              onClick={toggleSharing}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isSharing ? 'bg-spidey-blue' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${isSharing ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className={card}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-300">Squad on the map</h3>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                {locations.length} sharing
              </span>
            </div>
            {locations.length === 0 ? (
              <p className="text-[11px] text-slate-400">Nobody is sharing yet. Turn on location sharing to drop your pin.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <li key={loc.userId} className="flex items-center gap-1.5 bg-spidey-dark border border-spidey-border rounded-full pl-1 pr-2.5 py-1">
                    <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${loc.userId === userId ? 'bg-spidey-blue' : 'bg-spidey-red'}`}>
                      {(loc.userName || '?').replace('Rider ', '').slice(0, 2)}
                    </span>
                    <span className="text-[11px] text-slate-200">{loc.userId === userId ? 'You' : loc.userName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-spidey-border shadow-xl">
        {!hasMapboxToken ? (
          <MapPlaceholder title="Map needs a Mapbox token" text="Add VITE_MAPBOX_TOKEN to app/.env and restart to see live pins." />
        ) : mapOpened ? (
          <MapErrorBoundary>
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-spidey-cardbg"><span className="loader" /></div>}>
              <TripMap locations={locations} currentUserId={userId} active={active} />
            </Suspense>
          </MapErrorBoundary>
        ) : null}
        {isSharing && (
          <div className="absolute top-3 left-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full z-10 pointer-events-none">
            <i className="fa-solid fa-satellite-dish mr-1" aria-hidden="true" /> Live pins active
          </div>
        )}
      </div>
      {!tripId && hasMapboxToken && (
        <p className="text-[11px] text-slate-500 mt-2">Tap the target button on the map to see where you are. Join a trip to see your squad.</p>
      )}
    </div>
  );
};

export default TripPage;
