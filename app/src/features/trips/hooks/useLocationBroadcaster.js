import { useEffect, useRef } from 'react';
import { updateLiveLocation } from '../services/tripService';

// Writes this device's GPS position to the trip at most every 10 seconds while sharing is on.
export const useLocationBroadcaster = (tripId, userId, userName, isSharing, onError) => {
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isSharing || !tripId || !userId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastUpdateRef.current = 0;
      return;
    }

    if (!navigator.geolocation) {
      onErrorRef.current?.("This browser can’t share location.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 10000) {
          const { latitude, longitude } = position.coords;
          updateLiveLocation(tripId, userId, userName, latitude, longitude)
            .catch((err) => onErrorRef.current?.(`Location not sent: ${err.message}`));
          lastUpdateRef.current = now;
        }
      },
      (err) => {
        console.error("Error obtaining location:", err);
        onErrorRef.current?.(
          err.code === 1
            ? "Location permission is off. Allow it in your browser settings (HTTPS or localhost is required)."
            : `Couldn’t get your location: ${err.message}`
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tripId, userId, userName, isSharing]);
};
