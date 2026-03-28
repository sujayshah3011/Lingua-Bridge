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

import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ToggleStrip } from "@/components/ToggleStrip";
import { Toast } from "@/components/ui/Toast";
import { TranslationOutput } from "@/components/TranslationOutput";
import { TranslatorInput } from "@/components/TranslatorInput";
import { Language } from "@/constants/languages";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import {
  translateText,
  transliterateText,
} from "@/services/sarvam";
import { synthesizeSpeech } from "@/services/tts";
import { VoiceSelector } from "@/components/VoiceSelector";

export default function TranslateScreen() {
  const {
    credits,
    setCredits,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    autoDetect,
    setAutoDetect,
    formalMode,
    transliteration,
    addToHistory,
    addRecentLang,
    voiceGender,
    setVoiceGender,
  } = useApp();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [transliteratedText, setTransliteratedText] = useState("");
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

  const runTranslation = useCallback(
    async (text: string) => {
      if (credits <= 0) {
        showToast("No credits remaining", "error");
        return;
      }
      if (!text.trim() || text.length > 1000) return;
      if (text === lastTranslatedRef.current) return;

      setIsLoading(true);
      try {
        const result = await translateText({
          input: text,
          sourceLanguageCode: autoDetect ? "auto" : sourceLang,
          targetLanguageCode: targetLang,
          formalMode,
        });

        setTranslatedText(result.translatedText);
        if (result.detectedSourceLang) {
          setDetectedLang(result.detectedSourceLang);
        }
        if (typeof result.credits === "number") {
          setCredits(result.credits);
        }
        lastTranslatedRef.current = text;

        addToHistory({
          sourceText: text,
          translatedText: result.translatedText,
          sourceLang: result.detectedSourceLang ?? sourceLang,
          targetLang,
          mode: formalMode ? "formal" : "modern-colloquial",
        });

        if (transliteration && result.translatedText) {
          try {
            const tl = await transliterateText({
              input: result.translatedText,
              sourceLanguageCode: targetLang,
              targetLanguageCode: "en-IN",
            });
            setTransliteratedText(tl);
          } catch {}
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "INSUFFICIENT_CREDITS") {
          showToast("No credits remaining", "error");
          setCredits(0);
        } else if (msg === "RATE_LIMIT") {
          showToast("Translation limit reached, please wait", "error");
        } else if (msg.includes("Network") || msg.includes("fetch")) {
          showToast("Network error — please retry", "error");
        } else {
          showToast("Translation failed — please retry", "error");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      credits,
      autoDetect,
      sourceLang,
      targetLang,
      formalMode,
      transliteration,
      addToHistory,
      showToast,
      setCredits,
    ]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputText.trim() || inputText.trim().length < 2) {
      setTranslatedText("");
      setTransliteratedText("");
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
  }, [sourceLang, targetLang, formalMode]);

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
    setTransliteratedText("");
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
    if (credits <= 0) {
      showToast("No credits remaining", "error");
      return;
    }
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
      const uri = await synthesizeSpeech(translatedText, targetLang, voiceGender);
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
        setCredits(0);
      } else if (msg === "RATE_LIMIT") {
        showToast("Rate limit reached, please wait", "error");
      } else if (msg.startsWith("TTS_ERROR_")) {
        showToast("Speech synthesis failed. Please try again.", "error");
      } else if (msg === "TTS_EMPTY_RESPONSE") {
        showToast("No audio received from the server.", "error");
      } else {
        showToast("Could not play audio", "error");
      }
    }
  }, [translatedText, targetLang, voiceGender, isSpeaking, credits, showToast, setCredits]);

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
            <Feather name="globe" size={16} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>BhaashAI</Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.creditsPill,
              {
                backgroundColor:
                  credits > 20
                    ? theme.primary + "15"
                    : credits > 5
                    ? "#F59E0B15"
                    : theme.error + "15",
              },
            ]}
          >
            <Feather
              name="zap"
              size={12}
              color={credits > 20 ? theme.primary : credits > 5 ? "#F59E0B" : theme.error}
            />
            <Text
              style={[
                styles.creditsText,
                {
                  color:
                    credits > 20
                      ? theme.primary
                      : credits > 5
                      ? "#F59E0B"
                      : theme.error,
                },
              ]}
            >
              {credits}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            hitSlop={12}
            style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="settings" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

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
            transliteratedText={transliteratedText}
            isLoading={isLoading}
            detectedLang={detectedLang}
            showTransliteration={transliteration}
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
          <View style={styles.gap} />
          <ToggleStrip />

          {credits === 0 && (
            <View
              style={[
                styles.noCreditsBanner,
                { backgroundColor: theme.error + "12", borderColor: theme.error + "30" },
              ]}
            >
              <Feather name="alert-triangle" size={15} color={theme.error} />
              <Text style={[styles.noCreditText, { color: theme.error }]}>
                No credits remaining. Check Settings for more info.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
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
