import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
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

  const defaultCenter = locations.length > 0 
    ? { lat: locations[0].lat, lng: locations[0].lng }
    : { lat: 8.5241, lng: 76.9366 };

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden' }}>
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="SPIDEY_MAP_ID"
          gestureHandling="greedy"
        >
          {locations.map((loc) => (
            <AdvancedMarker
              key={loc.userId}
              position={{ lat: loc.lat, lng: loc.lng }}
              title={loc.userName}
            >
              <Pin
                background={loc.userId === currentUserId ? "#2563eb" : "#dc2626"}
                borderColor="#ffffff"
                glyphColor="#ffffff"
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};