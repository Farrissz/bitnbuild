import { db } from '../../../config/firebase';
import { 
  collection, doc, setDoc, getDocs, query, where, arrayUnion, updateDoc, onSnapshot 
} from "firebase/firestore";

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const createTrip = async (userId, stops = []) => {
  const joinCode = generateCode();
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
  const q = query(collection(db, "trips"), where("joinCode", "==", joinCode.trim().toUpperCase()));
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
  const locationRef = doc(db, "locations", docId);

  await setDoc(locationRef, {
    tripId,
    userId,
    userName: userName || `Member ${userId.slice(0, 4)}`,
    lat,
    lng,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const subscribeToMemberLocations = (tripId, callback) => {
  const q = query(collection(db, "locations"), where("tripId", "==", tripId));
  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map(doc => doc.data());
    callback(locations);
  });
};