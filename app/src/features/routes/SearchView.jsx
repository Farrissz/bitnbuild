import React, { useEffect, useRef, useState } from 'react';
import { fetchDemoPairs, fetchPlaces } from '../../lib/api';

// Person 4's search screen, wired to Person 1's /api/places and /api/demo-pairs.
const MODE_OPTIONS = [
  { id: 'sync', label: 'Train + bus sync', icon: 'fa-train', color: 'text-spidey-blue' },
  { id: 'bus', label: 'KSRTC / bus', icon: 'fa-bus', color: 'text-spidey-red' },
  { id: 'ferry', label: 'Water Metro / ferry', icon: 'fa-ship', color: 'text-cyan-400' },
  { id: 'cab', label: 'Cab / auto', icon: 'fa-car', color: 'text-amber-500' },
];

function PlaceInput({ id, label, value, onChange, dot }) {
  const [options, setOptions] = useState([]);
  const timer = useRef(null);

  const handleChange = (v) => {
    onChange(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetchPlaces(v).then((list) => setOptions(list.map((p) => p.description).filter(Boolean))).catch(() => {});
    }, 250);
  };

  return (
    <div className="flex items-center gap-3.5 relative z-10">
      {dot}
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="text-[11px] font-semibold text-slate-400">{label}</label>
        <input
          id={id}
          type="text"
          list={`${id}-list`}
          value={value}
          autoComplete="off"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => !options.length && handleChange(value)}
          className="w-full text-sm py-0.5 outline-none font-medium bg-transparent text-white border-b border-transparent focus:border-spidey-blue transition-colors"
        />
        <datalist id={`${id}-list`}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </div>
    </div>
  );
}

export default function SearchView({ origin, setOrigin, dest, setDest, prefs, setPrefs, onSearch, loading }) {
  const [pairs, setPairs] = useState([]);

  useEffect(() => {
    fetchDemoPairs().then(setPairs).catch(() => setPairs([]));
  }, []);

  const swap = () => { setOrigin(dest); setDest(origin); };

  return (
    <div className="flex flex-col min-h-full justify-between gap-6">
      <div>
        <div className="mb-5">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-spidey-red/10 text-spidey-red border border-spidey-red/20 inline-block mb-2">
            <i className="fa-solid fa-bolt mr-1" aria-hidden="true" /> Multimodal sync
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Where are you web-slinging?</h2>
          <p className="text-slate-400 text-xs mt-1">Train, bus and ferry connections timed so you don’t wait at the transfer.</p>
        </div>

        <div className="bg-spidey-cardbg border border-spidey-border rounded-2xl p-4 pr-14 shadow-xl mb-4 relative">
          <div className="absolute left-7 top-11 bottom-11 w-0.5 bg-gradient-to-b from-spidey-blue to-spidey-red opacity-30" />
          <div className="mb-4">
            <PlaceInput
              id="origin-input"
              label="From"
              value={origin}
              onChange={setOrigin}
              dot={<div className="w-6 h-6 rounded-full bg-spidey-blue/20 border border-spidey-blue/40 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-spidey-blue" /></div>}
            />
          </div>
          <PlaceInput
            id="destination-input"
            label="To"
            value={dest}
            onChange={setDest}
            dot={<div className="w-6 h-6 rounded-full bg-spidey-red/20 border border-spidey-red/40 flex items-center justify-center shrink-0"><i className="fa-solid fa-location-dot text-[10px] text-spidey-red" aria-hidden="true" /></div>}
          />
          <p className="text-[10px] text-slate-500 mt-3 pl-9">Any town, station or landmark in Kerala.</p>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap start and destination"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-spidey-border/60 border border-spidey-border text-slate-300 hover:text-white"
          >
            <i className="fa-solid fa-arrow-right-arrow-left rotate-90 text-xs" aria-hidden="true" />
          </button>
        </div>

        {pairs.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-slate-400 mb-2">Demo trips</p>
            <div className="flex flex-wrap gap-2">
              {pairs.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => { setOrigin(p.origin); setDest(p.dest); onSearch(p.origin, p.dest); }}
                  className="text-[11px] text-slate-200 bg-spidey-cardbg border border-spidey-border hover:border-spidey-blue/60 rounded-full px-3 py-1.5 transition-colors"
                >
                  {p.origin.split(',')[0]} <span className="text-slate-500">to</span> {p.dest.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <fieldset>
          <legend className="text-[11px] font-semibold text-slate-400 mb-2.5">Show these options</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {MODE_OPTIONS.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 bg-spidey-cardbg border border-spidey-border p-3 rounded-xl cursor-pointer hover:border-spidey-red/50 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={prefs[m.id]}
                  onChange={(e) => setPrefs({ ...prefs, [m.id]: e.target.checked })}
                  className="accent-spidey-red w-4 h-4 rounded shrink-0"
                />
                <span className="text-xs font-medium text-slate-200">
                  <i className={`fa-solid ${m.icon} ${m.color} mr-1.5`} aria-hidden="true" />{m.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        type="button"
        onClick={() => onSearch()}
        disabled={loading}
        className="w-full bg-gradient-to-r from-spidey-red to-spidey-blue text-white font-bold py-3.5 rounded-xl shadow-lg shadow-spidey-red/20 hover:shadow-spidey-red/40 transition-shadow active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-80"
      >
        <span>{loading ? 'Sensing transit grid…' : 'Search routes'}</span>
        {loading && <span className="loader" />}
      </button>
    </div>
  );
}
