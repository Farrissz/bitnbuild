import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase is optional so the app still runs (in demo mode) before anyone has added keys.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

// Stable per-device id used when Firebase isn't configured or anonymous sign-in fails.
const localUserId = () => {
  try {
    let id = localStorage.getItem("sst-local-uid");
    if (!id) {
      id = `local-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("sst-local-uid", id);
    }
    return id;
  } catch {
    return `local-${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const initAnonymousAuth = async () => {
  if (!auth) return localUserId();
  try {
    await auth.authStateReady();
    if (!auth.currentUser) {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user.uid;
    }
    return auth.currentUser.uid;
  } catch (err) {
    console.warn("Anonymous sign-in failed (is it enabled in the Firebase console?):", err.message);
    return localUserId();
  }
};
