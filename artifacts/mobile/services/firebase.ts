import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

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

// On React Native, plain getAuth() keeps the session in memory only, so every
// app restart signed the user out (seen on a device). The session has to be
// persisted to AsyncStorage. Metro resolves "firebase/auth" to its React Native
// build, which exports getReactNativePersistence; TypeScript reads the browser
// typings, which don't list it — hence the cast.
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
};

function createAuth(): FirebaseAuth.Auth {
  if (Platform.OS === "web") return FirebaseAuth.getAuth(app);
  try {
    return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized (e.g. a fast refresh in development).
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export default app;
