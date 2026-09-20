import React from 'react';
import { ROUTE_LABEL, fmtTime, stepMeta } from '../../lib/format';

const SYNC_MAX_WAIT = 10; // minutes — same default as SYNC_MAX_WAIT_MIN on the routing server

function StepChips({ route }) {
  const legs = route.steps.filter((s) => s.mode !== 'WALK');
  const shown = legs.length ? legs : route.steps;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-300 bg-spidey-border/30 p-2.5 rounded-xl border border-spidey-border/50">
      {shown.map((s, i) => {
        const m = stepMeta(s.mode);
        return (
          <React.Fragment key={i}>
            {i > 0 && <i className="fa-solid fa-chevron-right text-[10px] text-slate-500" aria-hidden="true" />}
            <span className="flex items-center gap-1 min-w-0">
              <i className={`fa-solid ${m.icon} ${m.color}`} aria-hidden="true" />
              <span className="truncate max-w-[11rem]">{s.line || m.label}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepTimeline({ route }) {
  const rides = route.steps.filter((s) => s.departure);
  const estimated = route.source === 'estimate';
  return (
    <ol className="mt-3 border-l border-spidey-border ml-2 space-y-2.5">
      {route.steps.map((s, i) => {
        const m = stepMeta(s.mode);
        const rideIdx = rides.indexOf(s);
        const transfer = rideIdx > 0 ? route.transfers[rideIdx - 1] : null;
        return (
          <li key={i} className="pl-4 relative">
            <span className="absolute -left-[7px] top-0.5 w-3.5 h-3.5 rounded-full bg-spidey-cardbg border border-spidey-border flex items-center justify-center">
              <span className={`w-1.5 h-1.5 rounded-full ${s.mode === 'BUS' ? 'bg-spidey-red' : s.mode === 'TRAIN' ? 'bg-spidey-blue' : 'bg-slate-500'}`} />
            </span>
            {transfer && (
              <p className={`text-[11px] mb-0.5 ${estimated ? 'text-slate-400' : transfer.gapMin > SYNC_MAX_WAIT ? 'text-amber-400' : 'text-emerald-400'}`}>
                {estimated ? `About ${transfer.gapMin} min to change at ${transfer.at}` : `Wait ${transfer.gapMin} min at ${transfer.at}`}
              </p>
            )}
            <p className="text-xs text-slate-200">
              <i className={`fa-solid ${m.icon} ${m.color} mr-1.5`} aria-hidden="true" />
              {s.instruction}
            </p>
            <p className="text-[11px] text-slate-500">
              {s.departure ? `${route.source === 'estimate' ? 'About ' : ''}${fmtTime(s.departure)} – ${fmtTime(s.arrival)}` : s.durationText}
              {s.stops ? `, ${s.stops} stops` : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function RouteCard({ route, selected, expanded, now, onSelect, onTrip, onReview }) {
  const leaveIn = Math.max(0, Math.round((Date.parse(route.departure) - now) / 60000));
  const longWait = route.transfers.find((t) => t.gapMin > SYNC_MAX_WAIT);
  const featured = route.synced;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`bg-spidey-cardbg rounded-2xl p-4 mb-3.5 relative overflow-hidden cursor-pointer transition-shadow ${
        featured ? 'border-2 border-spidey-blue/60 shadow-xl' : 'border border-spidey-border shadow-md'
      } ${selected ? 'ring-2 ring-spidey-red/50' : ''}`}
    >
      {featured && <div className="absolute -right-6 -top-6 w-20 h-20 bg-spidey-blue/10 rounded-full blur-xl" />}

      <div className="flex justify-between items-start gap-3 mb-2.5">
        <div className="min-w-0">
          {featured ? (
            <span className="bg-spidey-blue/20 text-spidey-blue border border-spidey-blue/30 text-[10px] font-extrabold px-2 py-0.5 rounded">
              ✨ Spidey synchronized
            </span>
          ) : (
            <span className="bg-slate-700/50 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
              {ROUTE_LABEL[route.mode] || route.mode}
            </span>
          )}
          <h3 className={`font-bold text-white mt-1 ${featured ? 'text-base' : 'text-sm'}`}>{route.summary}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-extrabold text-emerald-400 ${featured ? 'text-lg' : 'text-base'}`}>₹{route.fare}</p>
          <p className="text-[10px] text-slate-400">{route.mode === 'driving' ? 'Per cab' : route.mode === 'auto' ? 'Per auto' : 'Est. fare'}</p>
        </div>
      </div>

      <StepChips route={route} />

      {route.syncInfo && <p className="text-[11px] text-spidey-blue mt-2.5">{route.syncInfo}</p>}
      {!route.synced && longWait && route.source !== 'estimate' && (
        <p className="text-[11px] text-amber-400 mt-2.5">Not synced: {longWait.gapMin} min wait at {longWait.at}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs pt-2.5 mt-3 border-t border-spidey-border">
        <span className="text-slate-300">
          <i className="fa-regular fa-clock mr-1 text-spidey-blue" aria-hidden="true" />
          {route.durationText}
        </span>
        <span className="text-slate-400 text-[11px]">
          {route.source === 'estimate' && 'About '}
          {fmtTime(route.departure)} – {fmtTime(route.arrival)}
          {route.source === 'estimate' ? (
            ' if you leave now'
          ) : (
            <span className={leaveIn <= 5 ? 'text-spidey-red font-semibold' : ''}>
              {leaveIn === 0 ? ', leave now' : `, leave in ${leaveIn} min`}
            </span>
          )}
        </span>
      </div>

      {expanded && (
        <div onClick={(e) => e.stopPropagation()} role="presentation" className="cursor-default">
          <StepTimeline route={route} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button type="button" onClick={onTrip} className="bg-spidey-blue hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
              <i className="fa-solid fa-users mr-1.5" aria-hidden="true" />Start group trip
            </button>
            <button type="button" onClick={onReview} className="bg-slate-800 hover:bg-slate-700 border border-spidey-border text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
              <i className="fa-solid fa-star mr-1.5" aria-hidden="true" />Rate / split cost
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
