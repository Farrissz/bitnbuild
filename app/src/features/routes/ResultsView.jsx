import React, { useEffect, useState } from 'react';
import RouteCard from './RouteCard';
import PriceComparison from '../prices/PriceComparison';

export default function ResultsView({ search, visibleRoutes, selectedId, onSelect, goTo }) {
  const [now, setNow] = useState(Date.now());
  const [expandedId, setExpandedId] = useState(selectedId);
  // A new search picks a default route; open its details.
  useEffect(() => setExpandedId(selectedId), [search.routes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const { status, routes, warnings, origin, dest, error } = search;
  const live = routes.some((r) => r.source === 'google');
  const estimated = routes.some((r) => r.source === 'estimate');
  const shownWarnings = warnings.filter((w) => !/GOOGLE_MAPS_API_KEY|No routes found/.test(w));
  const back = (
    <button
      type="button"
      onClick={() => goTo('search')}
      aria-label="Back to search"
      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-spidey-cardbg border border-spidey-border text-slate-300 hover:text-white"
    >
      <i className="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
    </button>
  );

  if (status === 'idle' || status === 'loading' || (status === 'error' && !routes.length)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        {status === 'loading' ? (
          <><span className="loader mb-3" /><p className="text-xs text-slate-400">Sensing transit grid…</p></>
        ) : (
          <>
            <i className="fa-solid fa-route text-3xl text-spidey-blue mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-white mb-1">{status === 'error' ? 'Routes didn’t load' : 'No trip searched yet'}</p>
            <p className="text-xs text-slate-400 mb-4">{status === 'error' ? error : 'Enter where you’re starting and where you’re headed.'}</p>
            <button type="button" onClick={() => goTo('search')} className="text-xs font-bold text-spidey-blue">Go to search</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {back}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Route options</h2>
            <p className="text-[11px] text-slate-400 truncate">{origin.split(',')[0]} to {dest.split(',')[0]}</p>
          </div>
        </div>
        {live ? (
          <span className="shrink-0 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />Live timings
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full">
            {estimated ? 'Estimated times' : 'Demo schedule'}
          </span>
        )}
      </div>

      {estimated && routes.length > 0 && (
        <p className="text-[11px] text-slate-400 bg-spidey-cardbg/70 border border-spidey-border rounded-xl px-3 py-2 mb-4">
          No timetable for this trip yet, so times, waits and fares are estimated from distance. Check at the station or bus stand before you travel.
          {shownWarnings.map((w) => <span key={w} className="block text-amber-400 mt-1">{w}</span>)}
        </p>
      )}

      {!routes.length && (
        <div className="bg-spidey-cardbg border border-dashed border-spidey-border rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-white mb-1">No routes for this trip</p>
          <p className="text-xs text-slate-400">
            Check the spelling, or try a nearby town, station or landmark.
          </p>
          {shownWarnings.map((w) => <p key={w} className="text-[11px] text-amber-400 mt-2">{w}</p>)}
        </div>
      )}

      {routes.length > 0 && visibleRoutes.length === 0 && (
        <p className="text-xs text-slate-400 mb-4">All options are hidden by your mode filters. Turn one back on in Search.</p>
      )}

      {visibleRoutes.map((r) => (
        <RouteCard
          key={r.id}
          route={r}
          now={now}
          selected={r.id === selectedId}
          expanded={r.id === expandedId}
          onSelect={() => {
            onSelect(r.id);
            setExpandedId(r.id === expandedId ? null : r.id);
          }}
          onTrip={() => goTo('squad')}
          onReview={() => goTo('reviews')}
        />
      ))}

      <PriceComparison routes={routes} selectedId={selectedId} onSelect={(id) => { onSelect(id); setExpandedId(id); }} />

      {live && <p className="text-[10px] text-slate-500 text-center mb-2">Powered by Google, ©{new Date().getFullYear()} Google</p>}
      {estimated && <p className="text-[10px] text-slate-500 text-center mb-2">Places and roads © OpenStreetMap contributors</p>}
      {!live && !estimated && routes.length > 0 && (
        <p className="text-[10px] text-slate-500 text-center mb-2">
          Built-in demo schedules. Add GOOGLE_MAPS_API_KEY to routing/.env for live routes.
        </p>
      )}
    </div>
  );
}
