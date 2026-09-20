import { db } from '../../../config/firebase';
import {
  collection, doc, setDoc, getDocs, query, where, arrayUnion, updateDoc, onSnapshot, deleteDoc
} from "firebase/firestore";

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ---- Demo fallback: with no Firebase keys, trips and locations live in memory on this device ----
const demo = { trips: new Map(), locations: new Map(), listeners: new Set() };
const emitDemo = () => demo.listeners.forEach((fn) => fn());

export const createTrip = async (userId, stops = []) => {
  const joinCode = generateCode();

  if (!db) {
    const tripId = `demo-${joinCode}`;
    demo.trips.set(tripId, { tripId, joinCode, createdBy: userId, stops, members: [userId] });
    return { tripId, joinCode };
  }

  const tripRef = doc(collection(db, "trips"));

  const tripData = {
    tripId: tripRef.id,
    joinCode: joinCode,
    createdBy: userId,
    stops: stops,
    members: [userId],
    createdAt: new Date().toISOString()
  };

  await setDoc(tripRef, tripData);
  return { tripId: tripRef.id, joinCode };
};

export const joinTripWithCode = async (userId, joinCode) => {
  const code = joinCode.trim().toUpperCase();
  if (!code) throw new Error("Enter a trip code first.");

  if (!db) {
    const tripId = `demo-${code}`;
    const trip = demo.trips.get(tripId) || { tripId, joinCode: code, stops: [], members: [] };
    trip.members = [...new Set([...trip.members, userId])];
    demo.trips.set(tripId, trip);
    return tripId;
  }

  const q = query(collection(db, "trips"), where("joinCode", "==", code));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid Trip Code!");
  }

  const tripDoc = querySnapshot.docs[0];
  const tripRef = doc(db, "trips", tripDoc.id);

  await updateDoc(tripRef, {
    members: arrayUnion(userId)
  });

  return tripDoc.id;
};

export const updateLiveLocation = async (tripId, userId, userName, lat, lng) => {
  const docId = `${tripId}_${userId}`;
  const data = {
    tripId,
    userId,
    userName: userName || `Member ${userId.slice(0, 4)}`,
    lat,
    lng,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    demo.locations.set(docId, data);
    emitDemo();
    return;
  }

  const locationRef = doc(db, "locations", docId);
  await setDoc(locationRef, data, { merge: true });
};

// Removes your pin when you stop sharing, so the squad doesn't see a stale position.
export const removeLiveLocation = async (tripId, userId) => {
  const docId = `${tripId}_${userId}`;
  if (!db) {
    demo.locations.delete(docId);
    emitDemo();
    return;
  }
  await deleteDoc(doc(db, "locations", docId));
};

export const subscribeToMemberLocations = (tripId, callback, onError) => {
  if (!db) {
    const push = () => callback([...demo.locations.values()].filter((l) => l.tripId === tripId));
    demo.listeners.add(push);
    push();
    return () => demo.listeners.delete(push);
  }

  const q = query(collection(db, "locations"), where("tripId", "==", tripId));
  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map(doc => doc.data());
    callback(locations);
  }, (err) => {
    console.warn("Location listener failed:", err);
    onError?.(err);
  });
};
