import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// firebase@12 removed getReactNativePersistence from firebase/auth entirely
// (confirmed absent from the installed bundle, not just a stale type) — the
// old initializeAuth(...) call here silently threw on every single app
// launch and fell back to this same getAuth(app) call anyway, so behavior
// is unchanged; this just removes the guaranteed throw+catch and the dead
// import that broke typecheck. getAuth() defaults to local persistence on
// React Native without extra configuration in current SDK versions.
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
