import React, { useState, useEffect } from 'react';
import { initAnonymousAuth } from '../../config/firebase';
import { createTrip, joinTripWithCode } from './services/tripService';
import { useLocationBroadcaster } from './hooks/useLocationBroadcaster';
import { TripMap } from './components/TripMap';

export const TripPage = () => {
  const [userId, setUserId] = useState(null);
  const [tripId, setTripId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    initAnonymousAuth().then(id => setUserId(id));
  }, []);

  useLocationBroadcaster(tripId, userId, `User-${userId?.slice(0,4)}`, isSharing);

  const handleCreateTrip = async () => {
    try {
      const stops = [{ name: "KSRTC Central", lat: 8.4872, lng: 76.9526 }];
      const res = await createTrip(userId, stops);
      setTripId(res.tripId);
      setJoinCode(res.joinCode);
      setStatusMsg(`Trip created! Join Code: ${res.joinCode}`);
    } catch (err) {
      setStatusMsg(`Error creating trip: ${err.message}`);
    }
  };

  const handleJoinTrip = async () => {
    try {
      const id = await joinTripWithCode(userId, inputCode);
      setTripId(id);
      setStatusMsg(`Joined trip successfully!`);
    } catch (err) {
      setStatusMsg(`Error joining trip: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Group Trip & Location Sharing</h2>
      <p><strong>Your User ID:</strong> {userId || 'Authenticating...'}</p>

      {!tripId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={handleCreateTrip} style={btnStyle}>Create New Trip</button>
          <hr />
          <div>
            <input 
              type="text" 
              placeholder="Enter 6-digit Join Code" 
              value={inputCode} 
              onChange={(e) => setInputCode(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleJoinTrip} style={{ ...btnStyle, marginTop: '8px' }}>Join Trip</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px' }}>
            <p><strong>Active Trip ID:</strong> {tripId}</p>
            {joinCode && <p><strong>Share Code:</strong> <span style={{ fontSize: '1.2em', color: '#15803d' }}>{joinCode}</span></p>}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isSharing} 
              onChange={(e) => setIsSharing(e.target.checked)} 
            />
            <strong>Share My Live Location</strong>
          </label>

          <TripMap tripId={tripId} currentUserId={userId} />
        </div>
      )}

      {statusMsg && <p style={{ color: '#2563eb', marginTop: '15px' }}>{statusMsg}</p>}
    </div>
  );
};

const btnStyle = { padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const inputStyle = { padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' };