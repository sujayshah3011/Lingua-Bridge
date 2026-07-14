import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLogo } from "@/components/AppLogo";
import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Toast } from "@/components/ui/Toast";
import { TranslationOutput } from "@/components/TranslationOutput";
import { TranslatorInput } from "@/components/TranslatorInput";
import { Language } from "@/constants/languages";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { translateText } from "@/services/sarvam";
import { synthesizeSpeech } from "@/services/tts";
import { VoiceSelector } from "@/components/VoiceSelector";

export default function TranslateScreen() {
  const {
    user,
    credits,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    autoDetect,
    setAutoDetect,
    addToHistory,
    addRecentLang,
    voiceGender,
    setVoiceGender,
    ttsProvider,
  } = useApp();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | undefined>();
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "info" | "error" | "success";
    visible: boolean;
  }>({ msg: "", type: "info", visible: false });
  const [hasShownCopyToast, setHasShownCopyToast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranslatedRef = useRef<string>("");
  const soundRef = useRef<Audio.Sound | null>(null);

  const showToast = useCallback(
    (msg: string, type: "info" | "error" | "success" = "info") => {
      setToast({ msg, type, visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2800);
    },
    []
  );

  const badgeColor =
    credits > 20 ? "#16A34A" : credits > 5 ? "#EA580C" : "#DC2626";

  const runTranslation = useCallback(
    async (text: string) => {
      if (credits < 0.01) {
        showToast("No credits remaining", "error");
        return;
      }
      if (!text.trim() || text.length > 1000) return;
      if (text === lastTranslatedRef.current) return;

      const uid = user?.uid;
      if (!uid) {
        showToast("Please sign in to translate", "error");
        return;
      }

      setIsLoading(true);
      try {
        const result = await translateText({
          input: text,
          sourceLanguageCode: autoDetect ? "auto" : sourceLang,
          targetLanguageCode: targetLang,
          formalMode: true,
        });

        setTranslatedText(result.translatedText);
        if (result.detectedSourceLang) {
          setDetectedLang(result.detectedSourceLang);
        }
        lastTranslatedRef.current = text;

        addToHistory({
          sourceText: text,
          translatedText: result.translatedText,
          sourceLang: result.detectedSourceLang ?? sourceLang,
          targetLang,
          mode: "formal",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "INSUFFICIENT_CREDITS") {
          showToast("No credits remaining", "error");
        } else if (msg === "RATE_LIMIT") {
          showToast("Translation limit reached, please wait", "error");
        } else if (msg === "NOT_SIGNED_IN") {
          showToast("Please sign in to translate", "error");
        } else if (msg.includes("Network") || msg.includes("fetch")) {
          showToast("Network error — please retry", "error");
        } else {
          console.error("[Translate] Unhandled error:", msg);
          showToast(`Translation failed: ${msg}`, "error");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      user,
      credits,
      autoDetect,
      sourceLang,
      targetLang,
      addToHistory,
      showToast,
    ]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputText.trim() || inputText.trim().length < 2) {
      setTranslatedText("");
      setDetectedLang(undefined);
      lastTranslatedRef.current = "";
      return;
    }
    if (inputText.length > 1000) {
      showToast("Text exceeds 1000 characters", "error");
      return;
    }
    debounceRef.current = setTimeout(() => {
      runTranslation(inputText);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, runTranslation]);

  useEffect(() => {
    lastTranslatedRef.current = "";
    if (inputText.trim().length > 2) {
      runTranslation(inputText);
    }
  }, [sourceLang, targetLang]);

  const handleSourceSelect = (lang: Language) => {
    if (lang.code === "auto") {
      setAutoDetect(true);
    } else {
      setAutoDetect(false);
      setSourceLang(lang.code);
      addRecentLang(lang.code);
    }
  };

  const handleTargetSelect = (lang: Language) => {
    setTargetLang(lang.code);
    addRecentLang(lang.code);
  };

  const handleClear = () => {
    setInputText("");
    setTranslatedText("");
    setDetectedLang(undefined);
    lastTranslatedRef.current = "";
  };

  const handleCopy = () => {
    if (!hasShownCopyToast) {
      showToast("Copied to clipboard", "success");
      setHasShownCopyToast(true);
      setTimeout(() => setHasShownCopyToast(false), 4000);
    }
  };

  const handleSpeak = useCallback(async () => {
    if (!translatedText || isSpeaking) return;
    if (credits < 0.01) {
      showToast("No credits remaining", "error");
      return;
    }
    const uid = user?.uid;
    if (!uid) return;

    try {
      setIsSpeaking(true);
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const uri = await synthesizeSpeech(translatedText, targetLang, voiceGender, ttsProvider);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          setIsSpeaking(false);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (err: unknown) {
      setIsSpeaking(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "INSUFFICIENT_CREDITS") {
        showToast("No credits remaining", "error");
      } else if (msg === "RATE_LIMIT") {
        showToast("Rate limit reached, please wait", "error");
      } else if (msg === "NOT_SIGNED_IN") {
        showToast("Please sign in to use voice", "error");
      } else if (msg.startsWith("TTS_ERROR_")) {
        showToast("Speech synthesis failed. Please try again.", "error");
      } else if (msg === "TTS_EMPTY_RESPONSE") {
        showToast("No audio received from the server.", "error");
      } else {
        console.error("[TTS] Unhandled error:", msg);
        showToast(`Could not play audio: ${msg}`, "error");
      }
    }
  }, [translatedText, targetLang, voiceGender, ttsProvider, isSpeaking, credits, user, showToast]);

  useEffect(() => {
    return () => {
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsSpeaking(false);
    };
  }, [translatedText]);

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoAccent, { backgroundColor: theme.primary }]}>
            <AppLogo size={16} color="#fff" strokeWidth={18} />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>BhaashAI</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push("/topup")}
            style={[
              styles.creditsPill,
              { backgroundColor: badgeColor + "15", borderColor: badgeColor },
            ]}
          >
            <Text style={[styles.creditsText, { color: badgeColor }]}>
              ₹{credits.toFixed(2)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            hitSlop={12}
            style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="settings" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      {credits > 0 && credits < 5 && (
        <View style={styles.lowBanner}>
          <Feather name="alert-triangle" size={13} color="#9A3412" />
          <Text style={styles.lowBannerText}>
            Low balance ₹{credits.toFixed(2)}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Platform.OS === "web" ? insets.bottom + 34 + 84 : insets.bottom + 84,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gap} />
          <LanguageSelector
            onSelectSource={() => setShowSourcePicker(true)}
            onSelectTarget={() => setShowTargetPicker(true)}
          />
          <View style={styles.gap} />
          <TranslatorInput
            value={inputText}
            onChange={setInputText}
            onClear={handleClear}
          />
          <View style={styles.gap} />
          <TranslationOutput
            translatedText={translatedText}
            isLoading={isLoading}
            detectedLang={detectedLang}
            targetLang={targetLang}
            onCopy={handleCopy}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
          {Platform.OS !== "web" && !!translatedText && (
            <VoiceSelector
              targetLang={targetLang}
              gender={voiceGender}
              onGenderChange={setVoiceGender}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {credits <= 0 && (
        <View style={styles.zeroOverlay}>
          <View style={styles.zeroCard}>
            <Feather name="alert-circle" size={48} color="#DC2626" />
            <Text style={styles.zeroTitle}>No credits left</Text>
            <Text style={styles.zeroSub}>
              Add credits to continue translating.
            </Text>
            <Pressable
              onPress={() => router.push("/topup")}
              style={styles.zeroBtn}
            >
              <Text style={styles.zeroBtnText}>Add Credits</Text>
            </Pressable>
          </View>
        </View>
      )}

      <LanguagePickerModal
        visible={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onSelect={handleSourceSelect}
        mode="source"
        selectedCode={autoDetect ? "auto" : sourceLang}
      />
      <LanguagePickerModal
        visible={showTargetPicker}
        onClose={() => setShowTargetPicker(false)}
        onSelect={handleTargetSelect}
        mode="target"
        selectedCode={targetLang}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoAccent: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creditsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  zeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  zeroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  zeroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0A1628",
    marginTop: 4,
  },
  zeroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  zeroBtn: {
    marginTop: 8,
    backgroundColor: "#FF6B00",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  zeroBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  creditsText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  settingsBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  lowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lowBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9A3412",
  },
  scrollContent: { gap: 0 },
  gap: { height: 14 },
  noCreditsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noCreditText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
