import { Feather } from "@expo/vector-icons";
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

export default function TranslateScreen() {
  const {
    apiKey,
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranslatedRef = useRef<string>("");

  const showToast = useCallback(
    (msg: string, type: "info" | "error" | "success" = "info") => {
      setToast({ msg, type, visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2800);
    },
    []
  );

  const runTranslation = useCallback(
    async (text: string) => {
      if (!apiKey) {
        showToast("Add your Sarvam API key in Settings", "error");
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
          apiKey,
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
          mode: formalMode ? "formal" : "modern-colloquial",
        });

        if (transliteration && result.translatedText) {
          try {
            const tl = await transliterateText({
              input: result.translatedText,
              sourceLanguageCode: targetLang,
              targetLanguageCode: "en-IN",
              apiKey,
            });
            setTransliteratedText(tl);
          } catch {}
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "RATE_LIMIT") {
          showToast("Translation limit reached, please wait", "error");
        } else if (msg.includes("Network") || msg.includes("fetch")) {
          showToast("Network error — please retry", "error");
        } else {
          showToast("Translation failed — check your API key", "error");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiKey,
      autoDetect,
      sourceLang,
      targetLang,
      formalMode,
      transliteration,
      addToHistory,
      showToast,
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

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* Header */}
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
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          hitSlop={12}
          style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="settings" size={20} color={theme.textSecondary} />
        </Pressable>
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
          />
          <View style={styles.gap} />
          <ToggleStrip />

          {!apiKey && (
            <Pressable
              onPress={() => router.push("/(tabs)/settings")}
              style={[
                styles.apiKeyBanner,
                { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" },
              ]}
            >
              <Feather name="alert-circle" size={15} color={theme.primary} />
              <Text style={[styles.apiKeyText, { color: theme.primary }]}>
                Add your Sarvam API key to begin translating
              </Text>
              <Feather name="chevron-right" size={15} color={theme.primary} />
            </Pressable>
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
  settingsBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { gap: 0 },
  gap: { height: 14 },
  apiKeyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  apiKeyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
