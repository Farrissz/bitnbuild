import React, { useEffect, useState } from 'react';
import { splitCost } from '../prices/fares';
import { ROUTE_LABEL } from '../../lib/format';

// Person 3's split calculator, now for any route option (or a custom amount).
// Tickets are paid per person; a cab or auto is shared by the people riding in it.
export default function SplitPayment({ routes = [], selectedId }) {
  const [choice, setChoice] = useState(selectedId || (routes[0] ? routes[0].id : 'custom'));
  const [peopleCount, setPeopleCount] = useState(2);
  const [customTotal, setCustomTotal] = useState(0);

  // Follow the route picked on the Routes tab.
  useEffect(() => {
    if (selectedId) setChoice(selectedId);
  }, [selectedId]);

  const route = routes.find((r) => r.id === choice);
  const result = route
    ? splitCost(route, peopleCount)
    : { total: customTotal, perPerson: Math.ceil(customTotal / peopleCount), lines: [] };

  const optionLabel = (r) => `${r.synced ? 'Synced ' : ''}${ROUTE_LABEL[r.mode] || r.mode}: ${r.summary}`;

  return (
    <div className="bg-gradient-to-br from-spidey-cardbg to-spidey-dark border border-spidey-border rounded-2xl p-4 mb-5 shadow-xl">
      <h3 className="text-xs font-bold text-spidey-blue mb-3">
        <i className="fa-solid fa-receipt mr-1.5" aria-hidden="true" />
        Group split calculator
      </h3>

      <label htmlFor="split-route" className="block text-[11px] text-slate-400 mb-1">Split the cost of</label>
      <select
        id="split-route"
        value={route ? choice : 'custom'}
        onChange={(e) => setChoice(e.target.value)}
        className="w-full bg-spidey-dark border border-spidey-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-spidey-blue mb-3"
      >
        {routes.map((r) => (
          <option key={r.id} value={r.id}>{optionLabel(r)}</option>
        ))}
        <option value="custom">Custom amount</option>
      </select>

      {!route && (
        <>
          <label className="block text-[11px] text-slate-400 mb-1" htmlFor="split-total">Total to split (₹)</label>
          <input
            id="split-total"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={customTotal}
            onChange={(e) => setCustomTotal(Math.max(0, Number(e.target.value)))}
            className="w-full bg-spidey-dark border border-spidey-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-spidey-blue mb-3"
          />
        </>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-300">Number of commuters</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer people"
            onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
            className="w-8 h-8 rounded-lg bg-spidey-border/60 border border-spidey-border text-white"
          >
            <i className="fa-solid fa-minus text-xs" aria-hidden="true" />
          </button>
          <span className="font-extrabold text-base text-spidey-red w-6 text-center" aria-live="polite">{peopleCount}</span>
          <button
            type="button"
            aria-label="More people"
            onClick={() => setPeopleCount(peopleCount + 1)}
            className="w-8 h-8 rounded-lg bg-spidey-border/60 border border-spidey-border text-white"
          >
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
          </button>
        </div>
      </div>

      {result.lines.length > 0 && (
        <ul className="text-[11px] text-slate-400 space-y-1 mb-3">
          {result.lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-3">
              <span>{l.label}</span>
              <span className="text-slate-300">₹{l.amount}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-3 border-t border-spidey-border space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Group total</span>
          <span className="text-sm font-bold text-white">₹{result.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Each person pays</span>
          <span className="text-lg font-black text-emerald-400">₹{result.perPerson}</span>
        </div>
      </div>
      {route && <p className="text-[10px] text-slate-500 mt-2">Estimated fares. Cabs seat 4 and autos seat 3.</p>}
    </div>
  );
}
