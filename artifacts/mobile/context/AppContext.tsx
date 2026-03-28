import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from "firebase/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { auth } from "@/services/firebase";
import { VoiceGender } from "@/services/tts";
import { fetchCredits } from "@/services/api";

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [credits, setCreditsState] = useState(50);
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        fetchCredits().then(setCreditsState);
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
    await promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    fetchCredits().then(setCreditsState);
  }, []);

  const refreshCredits = useCallback(async () => {
    const n = await fetchCredits();
    setCreditsState(n);
  }, []);

  const setCredits = useCallback((n: number) => {
    setCreditsState(n);
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

      refreshCredits();
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
