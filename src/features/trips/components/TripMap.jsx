import React, { useEffect, useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { subscribeToMemberLocations } from '../services/tripService';

export const TripMap = ({ tripId, currentUserId }) => {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!tripId) return;
    const unsubscribe = subscribeToMemberLocations(tripId, (data) => {
      setLocations(data);
    });
    return () => unsubscribe();
  }, [tripId]);

  const initialViewState = locations.length > 0 
    ? { latitude: locations[0].lat, longitude: locations[0].lng, zoom: 13 }
    : { latitude: 8.5241, longitude: 76.9366, zoom: 13 }; // Trivandrum default

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden' }}>
      <Map
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.userId}
            longitude={loc.lng}
            latitude={loc.lat}
            anchor="bottom"
          >
            <div 
              style={{
                backgroundColor: loc.userId === currentUserId ? "#2563eb" : "#dc2626",
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }} 
              title={loc.userName} 
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
};