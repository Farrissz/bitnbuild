import React, { useEffect, useRef, useState } from 'react';
// react-map-gl v8 has no root export — the Mapbox build lives at 'react-map-gl/mapbox'.
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Squad map: Person 2's live pins + Person 4's map design (dark style, zoom buttons, fly to you when you share).
const TRIVANDRUM = { latitude: 8.5241, longitude: 76.9544, zoom: 12 };

export const TripMap = ({ locations = [], currentUserId, active }) => {
  const mapRef = useRef(null);
  const flewToMe = useRef(false);
  const flewToSquad = useRef(false);
  const me = locations.find((l) => l.userId === currentUserId);
  const [failure, setFailure] = useState(null);

  // The map lives in a tab that can be hidden, so resize it whenever the tab is shown again.
  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => mapRef.current?.resize(), 60);
    return () => clearTimeout(t);
  }, [active]);

  // Fly to your pin each time you start sharing; otherwise to the first squad member once.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (me && !flewToMe.current) {
      map.flyTo({ center: [me.lng, me.lat], zoom: 14 });
      flewToMe.current = true;
    } else if (!me) {
      flewToMe.current = false;
      if (locations.length && !flewToSquad.current) {
        map.flyTo({ center: [locations[0].lng, locations[0].lat], zoom: 13 });
        flewToSquad.current = true;
      }
    }
  }, [me, locations]);

  // Mapbox reports start-up problems (no WebGL, bad token, style unreachable) as error events;
  // re-throwing here lets TripPage's error boundary show a clear message instead of a blank box.
  if (failure) throw new Error(failure);
  const handleError = (e) => {
    const msg = String(e?.error?.message || e?.error || '');
    if (!e?.target || /WebGL|401|403|Unauthorized|Forbidden|access token|styles\/v1/i.test(msg)) setFailure(msg || 'Map error');
  };

  return (
    <Map
      onError={handleError}
      ref={mapRef}
      initialViewState={TRIVANDRUM}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" />
      {locations.map((loc) => {
        const isMe = loc.userId === currentUserId;
        return (
          <Marker key={loc.userId} longitude={loc.lng} latitude={loc.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <span className="mb-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-spidey-border text-[10px] font-semibold text-white whitespace-nowrap">
                {isMe ? 'You' : loc.userName}
              </span>
              <span
                className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: isMe ? '#0066ff' : '#ff3333' }}
              />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
};

export default TripMap;
