import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
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
import { Platform, useColorScheme } from "react-native";
import { auth, db } from "@/services/firebase";
import { VoiceGender } from "@/services/tts";
import { useCredits } from "@/hooks/useCredits";
import { WELCOME_CREDIT_INR } from "@/constants/pricing";

WebBrowser.maybeCompleteAuthSession();

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
  signOut: () => Promise<void>;
  credits: number;
  totalDebited: number;
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

async function createUserDocIfNew(user: User) {
  try {
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
        userCharged: -WELCOME_CREDIT_INR,
        balanceBefore: 0,
        balanceAfter: WELCOME_CREDIT_INR,
        note: `Welcome credit — ₹${WELCOME_CREDIT_INR} on signup`,
        success: true,
        timestamp: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, { "stats.sessionCount": increment(1) });
    }
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { credits, totalDebited, ready: creditsReady } = useCredits(user?.uid);

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

  const [_request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        await createUserDocIfNew(firebaseUser);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication) {
        const credential = GoogleAuthProvider.credential(
          authentication.idToken,
          authentication.accessToken
        );
        signInWithCredential(auth, credential).catch(() => {});
      }
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (Platform.OS === "web") {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      await promptAsync();
    }
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
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
      signOut,
      credits,
      totalDebited,
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
      signOut,
      credits,
      totalDebited,
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
