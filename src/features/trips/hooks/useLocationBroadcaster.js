import { useEffect, useRef } from 'react';
import { updateLiveLocation } from '../services/tripService';

export const useLocationBroadcaster = (tripId, userId, userName, isSharing) => {
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!isSharing || !tripId || !userId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 10000) {
          const { latitude, longitude } = position.coords;
          updateLiveLocation(tripId, userId, userName, latitude, longitude);
          lastUpdateRef.current = now;
        }
      },
      (err) => console.error("Error obtaining location:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [tripId, userId, userName, isSharing]);
};