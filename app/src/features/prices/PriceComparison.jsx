import React from 'react';
import { ROUTE_LABEL, fmtDuration, stepMeta } from '../../lib/format';

// Person 3's price comparison, now fed by the real route options instead of a mock price table.
// Icon for the main vehicle of the trip, e.g. the train rather than the auto that takes you to the station.
const PRIORITY = ['TRAIN', 'FERRY', 'BUS', 'DRIVE', 'AUTO', 'OTHER', 'WALK'];
const primaryIcon = (route) => {
  const modes = new Set(route.steps.map((s) => s.mode));
  return stepMeta(PRIORITY.find((m) => modes.has(m)) || 'WALK');
};

export default function PriceComparison({ routes = [], selectedId, onSelect }) {
  if (!routes.length) return null;
  const cheapest = Math.min(...routes.map((r) => r.fare));
  const fastest = Math.min(...routes.map((r) => r.duration));

  return (
    <div className="bg-spidey-cardbg border border-spidey-border rounded-2xl p-4 mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-bold text-slate-200 text-sm">Price comparison</h3>
        <span className="text-[10px] text-slate-500">Estimated, for one rider</span>
      </div>
      <ul className="divide-y divide-spidey-border">
        {routes.map((item) => {
          const icon = primaryIcon(item);
          const active = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`w-full flex items-center justify-between gap-3 py-2.5 text-left rounded-lg px-1 ${active ? 'bg-spidey-blue/10' : ''}`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <i className={`fa-solid ${icon.icon} ${icon.color} w-4 text-center text-sm`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-white truncate">
                      {item.synced ? 'Synced train + bus' : ROUTE_LABEL[item.mode] || item.mode}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate">
                      {fmtDuration(item.duration)}
                      {item.duration === fastest && <span className="text-spidey-blue font-semibold"> · fastest</span>}
                      {item.fare === cheapest && <span className="text-emerald-400 font-semibold"> · cheapest</span>}
                    </span>
                  </span>
                </span>
                <strong className="text-sm text-emerald-400 shrink-0">₹{item.fare}</strong>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
