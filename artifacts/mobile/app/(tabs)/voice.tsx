/**
 * Voice Tab — Real-time voice translation screen.
 *
 * Flow:
 *  1. User taps the mic → expo-av starts recording (HIGH_QUALITY preset)
 *  2. User taps again → recording stops → audio sent to Sarvam STT REST API
 *  3. Transcript displayed → auto-translated via /translate
 *  4. "Speak" button synthesizes TTS and plays it back via expo-av
 *
 * Web note: expo-av recording is not reliably supported on web.
 * The mic section is replaced with an informational message on web.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/context/AppContext";
import { LANGUAGES } from "@/constants/languages";
import { Colors } from "@/constants/colors";
import LanguagePickerModal from "@/components/LanguagePickerModal";
import MicButton from "@/components/MicButton";
import { transcribeAudio } from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { callSarvamTranslate } from "@/services/sarvam";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

const USAGE_KEY = "bhaashai_usage";

/** Increment a usage counter stored in AsyncStorage */
async function incrementUsage(
  key: "charsTranslated" | "audioSeconds",
  by: number
) {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[key] = (data[key] ?? 0) + by;
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function VoiceScreen() {
  const {
    apiKey,
    targetLang,
    setTargetLang,
    addToHistory,
    addRecentLang,
    isDark,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const [voiceSourceLang, setVoiceSourceLang] = useState("unknown");
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  /** Request mic permission; return true if granted */
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Microphone Required",
        "BhaashAI needs microphone access for voice translation.\n\nPlease enable it in your device Settings → Privacy → Microphone.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  }, []);

  const startRecording = useCallback(async () => {
    if (!apiKey) {
      Alert.alert(
        "API Key Required",
        "Add your Sarvam API key in Settings to use voice translation."
      );
      return;
    }
    if (!(await ensurePermission())) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      // HIGH_QUALITY produces m4a on Android, caf on iOS — both accepted by Sarvam
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;

      setState("recording");
      setTranscript("");
      setTranslation("");
      setDetectedLang(null);
      setStatusText("Listening…");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("Recording start error:", err);
      setState("error");
      setStatusText("Could not start microphone. Please try again.");
    }
  }, [apiKey, ensurePermission]);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setState("processing");
    setStatusText("Processing speech…");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("NO_AUDIO");

      // Track audio seconds for usage dashboard
      const recStatus = await recording.getStatusAsync();
      const seconds = Math.round((recStatus.durationMillis ?? 0) / 1000);
      incrementUsage("audioSeconds", seconds);

      setStatusText("Transcribing…");
      const result = await transcribeAudio(uri, apiKey, voiceSourceLang);

      if (!result.transcript) {
        setStatusText("No speech detected. Tap the mic and try again.");
        setState("idle");
        return;
      }

      setTranscript(result.transcript);
      if (result.languageCode) setDetectedLang(result.languageCode);
      setStatusText("Translating…");

      const translated = await callSarvamTranslate({
        sourceText: result.transcript,
        sourceLang: result.languageCode ?? "auto",
        targetLang,
        mode: "formal",
        apiKey,
      });

      setTranslation(translated || "Translation unavailable.");
      setStatusText("");

      // Track characters and save to history
      incrementUsage(
        "charsTranslated",
        result.transcript.length + (translated?.length ?? 0)
      );
      addToHistory({
        sourceText: result.transcript,
        translatedText: translated ?? "",
        sourceLang: result.languageCode ?? "auto",
        targetLang,
        mode: "formal",
      });

      setState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_KEY") {
        setStatusText("Invalid API key — update it in Settings.");
      } else if (msg === "RATE_LIMIT") {
        setStatusText("Rate limit reached. Try again in a moment.");
      } else if (msg === "NO_AUDIO") {
        setStatusText("No audio recorded. Please try again.");
      } else {
        setStatusText("Something went wrong. Please try again.");
      }
      setState("error");
    }
  }, [apiKey, voiceSourceLang, targetLang, addToHistory]);

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (
      state === "idle" ||
      state === "done" ||
      state === "error"
    ) {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const speakTranslation = useCallback(async () => {
    if (!translation || ttsLoading) return;
    setTtsLoading(true);
    try {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;

      const fileUri = await synthesizeSpeech(translation, targetLang, apiKey);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if ("didJustFinish" in s && s.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      Alert.alert(
        "Playback Failed",
        msg === "TTS_EMPTY_RESPONSE"
          ? "No audio returned. Check your API key."
          : "Could not play audio. Please try again."
      );
    } finally {
      setTtsLoading(false);
    }
  }, [translation, targetLang, apiKey, ttsLoading]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const sourceLabel =
    voiceSourceLang === "unknown"
      ? "Auto Detect"
      : (LANGUAGES.find((l) => l.code === voiceSourceLang)?.name ??
          voiceSourceLang);
  const targetLabel =
    LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang;
  const detectedLabel = detectedLang
    ? LANGUAGES.find((l) => l.code === detectedLang)?.name
    : null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: C.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Voice</Text>
        <Pressable
          onPress={() => router.push("/conversation")}
          accessibilityRole="button"
          accessibilityLabel="Open conversation mode"
          style={({ pressed }) => [
            styles.convBtn,
            { opacity: pressed ? 0.6 : 1, borderColor: C.primary },
          ]}
        >
          <Feather name="message-square" size={16} color={C.primary} />
          <Text style={[styles.convBtnText, { color: C.primary }]}>
            Conversation
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language row */}
        <View style={styles.langRow}>
          <Pressable
            style={[
              styles.langBtn,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setShowSourcePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Source language: ${sourceLabel}`}
          >
            <Text
              style={[styles.langBtnText, { color: C.text }]}
              numberOfLines={1}
            >
              {sourceLabel}
            </Text>
            {voiceSourceLang === "unknown" && (
              <Text style={[styles.autoTag, { color: C.primary }]}>AUTO</Text>
            )}
            <Feather name="chevron-down" size={14} color={C.textSecondary} />
          </Pressable>

          <Feather name="arrow-right" size={18} color={C.textMuted} />

          <Pressable
            style={[
              styles.langBtn,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={() => setShowTargetPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Target language: ${targetLabel}`}
          >
            <Text
              style={[styles.langBtnText, { color: C.text }]}
              numberOfLines={1}
            >
              {targetLabel}
            </Text>
            <Feather name="chevron-down" size={14} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Web: not supported */}
        {Platform.OS === "web" ? (
          <View
            style={[
              styles.webNotice,
              { backgroundColor: C.surfaceSecondary, borderColor: C.border },
            ]}
          >
            <Feather name="info" size={20} color={C.textSecondary} />
            <Text style={[styles.webNoticeText, { color: C.textSecondary }]}>
              Voice translation is available on iOS and Android. On web, please
              use the Text Translate tab.
            </Text>
          </View>
        ) : (
          <>
            {/* Mic area */}
            <View style={styles.micArea}>
              {isProcessing ? (
                <View style={styles.processingWrap}>
                  <ActivityIndicator size="large" color="#FF6B00" />
                  <Text style={[styles.stateLabel, { color: C.textSecondary }]}>
                    {statusText}
                  </Text>
                </View>
              ) : (
                <>
                  <MicButton
                    isRecording={isRecording}
                    onPress={toggleRecording}
                    disabled={!apiKey}
                    size={88}
                    accessibilityLabel={
                      isRecording
                        ? "Stop recording"
                        : "Start voice translation"
                    }
                  />
                  <Text style={[styles.micHint, { color: C.textMuted }]}>
                    {state === "error"
                      ? statusText
                      : isRecording
                      ? "Tap to stop"
                      : "Tap to speak"}
                  </Text>
                </>
              )}
            </View>

            {/* Transcript */}
            {transcript ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <Text style={[styles.cardLabel, { color: C.textMuted }]}>
                  {detectedLabel ? `Detected: ${detectedLabel}` : "Transcript"}
                </Text>
                <Text
                  style={[
                    styles.transcriptText,
                    { color: C.textSecondary },
                  ]}
                >
                  {transcript}
                </Text>
              </View>
            ) : null}

            {/* Translation */}
            {translation ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.langDot} />
                  <Text
                    style={[styles.cardLabel, { color: C.textMuted, flex: 1 }]}
                  >
                    {targetLabel}
                  </Text>
                  <Pressable
                    onPress={speakTranslation}
                    disabled={ttsLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Play translation aloud"
                    style={({ pressed }) => ({
                      opacity: pressed || ttsLoading ? 0.6 : 1,
                      padding: 4,
                    })}
                  >
                    {ttsLoading ? (
                      <ActivityIndicator size="small" color="#FF6B00" />
                    ) : (
                      <Feather name="volume-2" size={20} color="#FF6B00" />
                    )}
                  </Pressable>
                </View>
                <Text style={[styles.translationText, { color: C.text }]}>
                  {translation}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* No API key banner */}
        {!apiKey && (
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={styles.banner}
            accessibilityRole="button"
            accessibilityLabel="Go to Settings to add your API key"
          >
            <Feather name="alert-circle" size={16} color="#FF6B00" />
            <Text style={styles.bannerText}>
              Add your Sarvam API key in Settings
            </Text>
            <Feather name="chevron-right" size={16} color="#FF6B00" />
          </Pressable>
        )}
      </ScrollView>

      <LanguagePickerModal
        visible={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onSelect={(code) => {
          setVoiceSourceLang(code);
          addRecentLang(code);
          setShowSourcePicker(false);
        }}
        selectedCode={voiceSourceLang}
        showAutoDetect
      />
      <LanguagePickerModal
        visible={showTargetPicker}
        onClose={() => setShowTargetPicker(false)}
        onSelect={(code) => {
          setTargetLang(code);
          addRecentLang(code);
          setShowTargetPicker(false);
        }}
        selectedCode={targetLang}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  convBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  convBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 120,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  langBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  langBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  autoTag: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  webNoticeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  micArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    gap: 20,
  },
  processingWrap: {
    alignItems: "center",
    gap: 16,
  },
  stateLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  micHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 24,
  },
  translationText: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    lineHeight: 28,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF3E8",
    borderWidth: 1,
    borderColor: "#FFDAB9",
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#FF6B00",
  },
});
