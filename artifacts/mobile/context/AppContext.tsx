import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Platform, useColorScheme } from "react-native";

import Constants from "expo-constants";
import { auth, db } from "@/services/firebase";
import { VoiceGender } from "@/services/tts";
import { UserStats, useCredits } from "@/hooks/useCredits";
import { WELCOME_CREDIT_INR } from "@/constants/pricing";

// ─── Lazy-load native Google Sign-In only in real native builds ─────────────
// In Expo Go, appOwnership === "expo" and RNGoogleSignin is not in the binary.
// TurboModuleRegistry.getEnforcing throws at require() time (not call time),
// so we must guard with the Expo Go check BEFORE calling require().
let _GoogleSignin: any = null;
let _statusCodes: any = null;
function loadNativeGoogleSignin(): boolean {
  if (_GoogleSignin) return true;
  // Skip entirely in Expo Go — the native binary does not include RNGoogleSignin
  if (Constants.appOwnership === "expo") return false;
  try {
    const m = require("@react-native-google-signin/google-signin");
    _GoogleSignin = m.GoogleSignin;
    _statusCodes = m.statusCodes;
    return true;
  } catch {
    return false;
  }
}

export interface TranslationRecord {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  mode: "formal" | "modern-colloquial";
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  credits: number;
  totalDebited: number;
  stats: UserStats;
  setCredits: (n: number) => void;
  refreshCredits: () => Promise<void>;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  autoDetect: boolean;
  setAutoDetect: (val: boolean) => void;
  formalMode: boolean;
  setFormalMode: (val: boolean) => void;
  transliteration: boolean;
  setTransliteration: (val: boolean) => void;
  history: TranslationRecord[];
  addToHistory: (record: Omit<TranslationRecord, "id" | "timestamp">) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
  themeMode: "system" | "light" | "dark";
  setThemeMode: (mode: "system" | "light" | "dark") => void;
  isDark: boolean;
  recentLangs: string[];
  addRecentLang: (code: string) => void;
  voiceGender: VoiceGender;
  setVoiceGender: (gender: VoiceGender) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const HISTORY_KEY = "bhaashai_history";
const PREFS_KEY = "bhaashai_prefs";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

async function createUserDocIfNew(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      credits: WELCOME_CREDIT_INR,
      totalCredited: WELCOME_CREDIT_INR,
      totalDebited: 0,
      stats: {
        charsTranslated: 0,
        charsTTS: 0,
        secondsSTT: 0,
        sessionCount: 1,
      },
      plan: "pay-as-you-go",
      isActive: true,
    });
    await addDoc(collection(db, "transactions"), {
      uid: user.uid,
      type: "topup",
      chars: null,
      seconds: null,
      userCharged: -WELCOME_CREDIT_INR,
      balanceBefore: 0,
      balanceAfter: WELCOME_CREDIT_INR,
      note: "Welcome credit",
      success: true,
      timestamp: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, { "stats.sessionCount": increment(1) });
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { credits, totalDebited, stats, ready: creditsReady } = useCredits(user?.uid);

  const [sourceLang, setSourceLang] = useState("en-IN");
  const [targetLang, setTargetLang] = useState("hi-IN");
  const [autoDetect, setAutoDetect] = useState(true);
  const [formalMode, setFormalMode] = useState(true);
  const [transliteration, setTransliteration] = useState(false);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [themeMode, setThemeModeState] = useState<"system" | "light" | "dark">(
    "system"
  );
  const [recentLangs, setRecentLangs] = useState<string[]>([
    "hi-IN",
    "en-IN",
    "ta-IN",
  ]);
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>("female");

  const isDark =
    themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await createUserDocIfNew(firebaseUser);
          setUser(firebaseUser);
        } catch {
          await firebaseSignOut(auth).catch(() => {});
          setUser(null);
          Alert.alert(
            "Setup Failed",
            "We couldn't set up your account. Please try signing in again.",
            [{ text: "OK" }]
          );
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    if (Platform.OS === "web") {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await signInWithPopup(auth, provider);
      return;
    }

    // Native: lazy-load @react-native-google-signin (only works in EAS builds)
    const loaded = loadNativeGoogleSignin();
    if (!loaded || !_GoogleSignin) {
      // Running in Expo Go — native module not compiled in
      throw new Error("EXPO_GO_LIMITATION");
    }

    try {
      _GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: true });
      await _GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await _GoogleSignin.signOut(); } catch (_) {}
      await _GoogleSignin.signIn();
      const { idToken } = await _GoogleSignin.getTokens();
      if (!idToken) throw new Error("NO_ID_TOKEN");
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      // onAuthStateChanged → createUserDocIfNew handles the rest
    } catch (err: any) {
      if (
        err.code === _statusCodes?.SIGN_IN_CANCELLED ||
        err.code === _statusCodes?.IN_PROGRESS
      ) return;
      // TurboModuleRegistry crash in Expo Go
      if (
        err.message?.includes("TurboModuleRegistry") ||
        err.message?.includes("RNGoogleSignin")
      ) {
        throw new Error("EXPO_GO_LIMITATION");
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        const loaded = loadNativeGoogleSignin();
        if (loaded && _GoogleSignin) await _GoogleSignin.signOut();
      } catch (_) {}
    }
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  // ─── Email auth error translator ─────────────────────────────────
  const translateAuthError = (err: any): Error => {
    const map: Record<string, string> = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password. Try again.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/user-disabled": "This account has been disabled.",
    };
    return new Error(map[err.code] ?? err.message ?? "Authentication failed.");
  };

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "users", result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName ?? email.split("@")[0],
          photoURL: result.user.photoURL ?? null,
          createdAt: serverTimestamp(),
          credits: WELCOME_CREDIT_INR,
          totalCredited: WELCOME_CREDIT_INR,
          totalDebited: 0,
          stats: { charsTranslated: 0, charsTTS: 0, secondsSTT: 0, sessionCount: 1 },
          plan: "pay-as-you-go",
          isActive: true,
        });
        await addDoc(collection(db, "transactions"), {
          uid: result.user.uid,
          type: "topup",
          chars: null,
          seconds: null,
          userCharged: -WELCOME_CREDIT_INR,
          balanceBefore: 0,
          balanceAfter: WELCOME_CREDIT_INR,
          note: "Welcome credit",
          success: true,
          timestamp: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, { "stats.sessionCount": increment(1) });
      }
      // onAuthStateChanged handles setUser
    } catch (err: any) {
      throw translateAuthError(err);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName,
        photoURL: null,
        createdAt: serverTimestamp(),
        credits: WELCOME_CREDIT_INR,
        totalCredited: WELCOME_CREDIT_INR,
        totalDebited: 0,
        stats: { charsTranslated: 0, charsTTS: 0, secondsSTT: 0, sessionCount: 1 },
        plan: "pay-as-you-go",
        isActive: true,
      });
      await addDoc(collection(db, "transactions"), {
        uid: result.user.uid,
        type: "topup",
        chars: null,
        seconds: null,
        userCharged: -WELCOME_CREDIT_INR,
        balanceBefore: 0,
        balanceAfter: WELCOME_CREDIT_INR,
        note: "Welcome credit",
        success: true,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      throw translateAuthError(err);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw translateAuthError(err);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
  }, []);

  const setCredits = useCallback((_n: number) => {
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
        if (historyJson) setHistory(JSON.parse(historyJson));

        const prefsJson = await AsyncStorage.getItem(PREFS_KEY);
        if (prefsJson) {
          const prefs = JSON.parse(prefsJson);
          if (prefs.sourceLang) setSourceLang(prefs.sourceLang);
          if (prefs.targetLang) setTargetLang(prefs.targetLang);
          if (prefs.formalMode !== undefined) setFormalMode(prefs.formalMode);
          if (prefs.themeMode) setThemeModeState(prefs.themeMode);
          if (prefs.recentLangs) setRecentLangs(prefs.recentLangs);
          if (prefs.autoDetect !== undefined) setAutoDetect(prefs.autoDetect);
          if (prefs.transliteration !== undefined)
            setTransliteration(prefs.transliteration);
          if (prefs.voiceGender) setVoiceGenderState(prefs.voiceGender);
        }
      } catch {}
    };
    loadData();
  }, []);

  const savePrefs = useCallback(
    async (overrides: Record<string, unknown>) => {
      try {
        const current = {
          sourceLang,
          targetLang,
          formalMode,
          themeMode,
          recentLangs,
          autoDetect,
          transliteration,
          voiceGender,
          ...overrides,
        };
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(current));
      } catch {}
    },
    [
      sourceLang,
      targetLang,
      formalMode,
      themeMode,
      recentLangs,
      autoDetect,
      transliteration,
      voiceGender,
    ]
  );

  const setVoiceGender = useCallback(
    (gender: VoiceGender) => {
      setVoiceGenderState(gender);
      savePrefs({ voiceGender: gender });
    },
    [savePrefs]
  );

  const setThemeMode = useCallback(
    (mode: "system" | "light" | "dark") => {
      setThemeModeState(mode);
      savePrefs({ themeMode: mode });
    },
    [savePrefs]
  );

  const addToHistory = useCallback(
    (record: Omit<TranslationRecord, "id" | "timestamp">) => {
      const newRecord: TranslationRecord = {
        ...record,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const updated = [newRecord, ...prev].slice(0, 200);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const addRecentLang = useCallback(
    (code: string) => {
      setRecentLangs((prev) => {
        const filtered = prev.filter((c) => c !== code);
        const updated = [code, ...filtered].slice(0, 5);
        savePrefs({ recentLangs: updated });
        return updated;
      });
    },
    [savePrefs]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      authLoading,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signOut,
      credits,
      totalDebited,
      stats,
      setCredits,
      refreshCredits,
      sourceLang,
      setSourceLang,
      targetLang,
      setTargetLang,
      autoDetect,
      setAutoDetect,
      formalMode,
      setFormalMode,
      transliteration,
      setTransliteration,
      history,
      addToHistory,
      deleteHistoryItem,
      clearHistory,
      themeMode,
      setThemeMode,
      isDark,
      recentLangs,
      addRecentLang,
      voiceGender,
      setVoiceGender,
    }),
    [
      user,
      authLoading,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signOut,
      credits,
      totalDebited,
      stats,
      setCredits,
      refreshCredits,
      sourceLang,
      targetLang,
      autoDetect,
      formalMode,
      transliteration,
      history,
      addToHistory,
      deleteHistoryItem,
      clearHistory,
      themeMode,
      setThemeMode,
      isDark,
      recentLangs,
      addRecentLang,
      voiceGender,
      setVoiceGender,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
