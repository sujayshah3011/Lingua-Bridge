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

import { Colors, tintedShadow } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { LANGUAGES } from "@/constants/languages";
import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import MicButton from "@/components/MicButton";
import {
  startVoiceRecording,
  stopAndTranscribe,
  cancelVoiceRecording,
} from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { VoiceSelector } from "@/components/VoiceSelector";
import { translateText, type NumberCheck } from "@/services/sarvam";
import { NumberStatus } from "@/components/NumberWarning";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

const USAGE_KEY = "bhaashai_usage";


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
    user,
    credits,
    setCredits,
    targetLang,
    setTargetLang,
    addToHistory,
    addRecentLang,
    isDark,
    voiceGender,
    setVoiceGender,
    ttsProvider,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const badgeColor =
    credits > 20 ? "#16A34A" : credits > 5 ? "#EA580C" : "#DC2626";

  const [voiceSourceLang, setVoiceSourceLang] = useState("unknown");
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  // Only shown inside the translation card, so it never needs clearing on its own.
  const [numberCheck, setNumberCheck] = useState<NumberCheck>();
  // The server's digit reading of the transcript, when it rewrote number words.
  const [normalizedInput, setNormalizedInput] = useState<string>();
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  // Caches the last synthesized clip so repeat taps on the same translation
  // (same text + target + voice + provider) replay for free instead of
  // paying for a fresh synthesis every time.
  const lastAudioRef = useRef<{ key: string; uri: string } | null>(null);

  useEffect(() => {
    return () => {
      cancelVoiceRecording().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (credits < 0.05) {
      Alert.alert(
        "Not Enough Credits",
        "Your balance is too low to record voice. Please add credits in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Credits", onPress: () => router.push("/topup") },
        ]
      );
      return;
    }

    try {
      await startVoiceRecording();
      setState("recording");
      setTranscript("");
      setTranslation("");
      setDetectedLang(null);
      setStatusText("Listening…");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      if (err?.message === "MICROPHONE_PERMISSION_DENIED") {
        Alert.alert(
          "Microphone Required",
          "BhaashAI needs microphone access for voice translation.\n\nPlease enable it in your device Settings.",
          [{ text: "OK" }]
        );
      }
      setState("error");
      setStatusText("Could not start microphone. Please try again.");
    }
  }, [credits]);

  const stopRecording = useCallback(async () => {
    setState("processing");
    setStatusText("Processing speech…");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      setStatusText("Transcribing…");
      const result = await stopAndTranscribe(voiceSourceLang);

      if (!result.transcript.trim()) {
        setStatusText("No speech detected. Tap the mic and try again.");
        setState("idle");
        return;
      }

      if (typeof result.credits === "number") setCredits(result.credits);
      incrementUsage("audioSeconds", Math.round(result.durationSeconds));

      setTranscript(result.transcript);
      setNormalizedInput(undefined);
      if (result.languageCode) setDetectedLang(result.languageCode);
      setStatusText("Translating…");

      const { translatedText, detectedSourceLang, credits: newCredits, numberCheck: check, normalizedInput: normalized } = await translateText({
        input: result.transcript,
        sourceLanguageCode: result.languageCode ?? voiceSourceLang,
        targetLanguageCode: targetLang,
        formalMode: true,
      });

      if (typeof newCredits === "number") setCredits(newCredits);
      if (detectedSourceLang) setDetectedLang(detectedSourceLang);
      setTranslation(translatedText || "Translation unavailable.");
      setNumberCheck(check);
      setNormalizedInput(normalized);
      setStatusText("");

      incrementUsage(
        "charsTranslated",
        result.transcript.length + (translatedText?.length ?? 0)
      );
      addToHistory({
        sourceText: result.transcript,
        translatedText: translatedText ?? "",
        sourceLang: detectedSourceLang ?? result.languageCode ?? "auto",
        targetLang,
        mode: "formal",
      });

      setState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INSUFFICIENT_CREDITS") {
        setStatusText("No credits remaining.");
      } else if (msg === "RATE_LIMIT") {
        setStatusText("Rate limit reached. Try again in a moment.");
      } else if (msg === "NOT_SIGNED_IN") {
        setStatusText("Please sign in to use voice translation.");
      } else if (msg === "NO_RECORDING_URI" || msg === "NO_ACTIVE_RECORDING") {
        setStatusText("No audio recorded. Please try again.");
      } else if (msg.includes("STT_ERROR")) {
        setStatusText(`Speech recognition failed: ${msg}`);
      } else if (msg.includes("HTTP_")) {
        setStatusText(`Translation failed: ${msg}`);
      } else {
        console.error("[Voice] Unhandled error:", msg);
        setStatusText(msg ? `Something went wrong: ${msg}` : "Something went wrong. Please try again.");
      }
      setState("error");
    }
  }, [user, setCredits, voiceSourceLang, targetLang, addToHistory]);

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "done" || state === "error") {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const stopSpeakingSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playUri = useCallback(async (uri: string) => {
    await stopSpeakingSound();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setIsPlaying(true);

    sound.setOnPlaybackStatusUpdate((s) => {
      if (!s.isLoaded || ("didJustFinish" in s && s.didJustFinish)) {
        sound.unloadAsync().catch(() => {});
        if (soundRef.current === sound) soundRef.current = null;
        setIsPlaying(false);
      }
    });
  }, [stopSpeakingSound]);

  const speakTranslation = useCallback(async () => {
    if (!translation || ttsLoading) return;

    // Tapping while it's already playing just stops it — no re-synthesis.
    if (isPlaying) {
      await stopSpeakingSound();
      return;
    }

    const cacheKey = `${translation}|${targetLang}|${voiceGender}|${ttsProvider}`;
    if (lastAudioRef.current?.key === cacheKey) {
      await playUri(lastAudioRef.current.uri);
      return;
    }

    if (credits < 0.01) {
      Alert.alert(
        "No Credits",
        "Your ₹ balance is empty.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Credits", onPress: () => router.push("/topup") },
        ]
      );
      return;
    }

    setTtsLoading(true);
    try {
      const fileUri = await synthesizeSpeech(translation, targetLang, voiceGender, ttsProvider);
      lastAudioRef.current = { key: cacheKey, uri: fileUri };
      await playUri(fileUri);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      // Server includes its real balance when it rejects for insufficient
      // credits (INSUFFICIENT_CREDITS:<amount>) — sync that back so a stale
      // local display can't keep showing a balance the server disagrees with.
      const insufficientMatch = msg.match(/^INSUFFICIENT_CREDITS(?::(-?[\d.]+))?$/);
      const realBalance = insufficientMatch?.[1] !== undefined ? Number(insufficientMatch[1]) : undefined;
      if (realBalance !== undefined) setCredits(realBalance);
      if (!insufficientMatch && !["RATE_LIMIT", "NOT_SIGNED_IN", "TTS_EMPTY_RESPONSE"].includes(msg) && !msg.startsWith("TTS_ERROR_")) {
        console.error("[Voice TTS] Unhandled error:", msg);
      }
      Alert.alert(
        "Playback Failed",
        insufficientMatch
          ? realBalance !== undefined
            ? `No credits remaining (server balance: ₹${realBalance.toFixed(2)}).`
            : "No credits remaining."
          : msg === "RATE_LIMIT"
          ? "Rate limit reached, please wait."
          : msg === "NOT_SIGNED_IN"
          ? "Please sign in to use voice."
          : msg.startsWith("TTS_ERROR_")
          ? `Speech synthesis failed: ${msg}`
          : msg === "TTS_EMPTY_RESPONSE"
          ? "No audio received from the server."
          : msg
          ? `Could not play audio: ${msg}`
          : "Could not play audio. Please try again."
      );
    } finally {
      setTtsLoading(false);
    }
  }, [translation, targetLang, voiceGender, ttsProvider, ttsLoading, credits, isPlaying, playUri, stopSpeakingSound, setCredits]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const sourceLabel =
    voiceSourceLang === "unknown"
      ? "Auto Detect"
      : (LANGUAGES.find((l) => l.code === voiceSourceLang)?.name ?? voiceSourceLang);
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
      <View style={[styles.header, { borderBottomColor: C.terracotta + "30" }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Voice</Text>
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
            onPress={() => router.navigate("/")}
            accessibilityRole="button"
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
      </View>

      {credits > 0 && credits < 5 && (
        <Pressable
          onPress={() => router.push("/topup")}
          style={styles.lowBanner}
        >
          <Feather name="alert-triangle" size={13} color="#9A3412" />
          <Text style={styles.lowBannerText}>
            Low balance ₹{credits.toFixed(2)} — Tap to add credits
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setShowSourcePicker(true)}
          >
            <Text style={[styles.langBtnText, { color: C.text }]} numberOfLines={1}>
              {sourceLabel}
            </Text>
            {voiceSourceLang === "unknown" && (
              <Text style={[styles.autoTag, { color: C.primary }]}>AUTO</Text>
            )}
            <Feather name="chevron-down" size={14} color={C.textSecondary} />
          </Pressable>

          <Feather name="arrow-right" size={18} color={C.textMuted} />

          <Pressable
            style={[styles.langBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setShowTargetPicker(true)}
          >
            <Text style={[styles.langBtnText, { color: C.text }]} numberOfLines={1}>
              {targetLabel}
            </Text>
            <Feather name="chevron-down" size={14} color={C.textSecondary} />
          </Pressable>
        </View>

        {Platform.OS === "web" ? (
          <View style={[styles.webNotice, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
            <Feather name="info" size={20} color={C.textSecondary} />
            <Text style={[styles.webNoticeText, { color: C.textSecondary }]}>
              Voice translation is available on iOS and Android.
            </Text>
          </View>
        ) : (
          <>
            <VoiceSelector
              targetLang={targetLang}
              gender={voiceGender}
              onGenderChange={setVoiceGender}
            />

            <View style={styles.micArea}>
              {isProcessing ? (
                <View style={styles.processingWrap}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <Text style={[styles.stateLabel, { color: C.textSecondary }]}>
                    {statusText}
                  </Text>
                </View>
              ) : (
                <>
                  <MicButton
                    isRecording={isRecording}
                    onPress={toggleRecording}
                    disabled={credits < 0.05}
                    size={88}
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

            {transcript ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.sage + "30",
                  },
                  tintedShadow(C.sage, 0.06, 12),
                ]}
              >
                <Text style={[styles.cardLabel, { color: C.sage }]}>
                  {detectedLabel ? `Detected: ${detectedLabel}` : "Transcript"}
                </Text>
                <Text style={[styles.transcriptText, { color: C.textSecondary }]}>
                  {transcript}
                </Text>
                {normalizedInput ? (
                  <Text style={[styles.readBack, { color: C.textMuted }]}>You said: {normalizedInput}</Text>
                ) : null}
              </View>
            ) : null}

            {translation ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.primary + "25",
                  },
                  tintedShadow(C.primary, 0.07, 14),
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.langDot, { backgroundColor: C.terracotta }]} />
                  <Text style={[styles.cardLabel, { color: C.terracotta, flex: 1 }]}>
                    {targetLabel}
                  </Text>
                  <Pressable
                    onPress={speakTranslation}
                    disabled={ttsLoading}
                    accessibilityLabel={isPlaying ? "Stop playback" : "Play translation"}
                    style={({ pressed }) => ({ opacity: pressed || ttsLoading ? 0.6 : 1, padding: 4 })}
                  >
                    {ttsLoading ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : isPlaying ? (
                      <Feather name="square" size={18} color={C.primary} />
                    ) : (
                      <Feather name="volume-2" size={20} color={C.primary} />
                    )}
                  </Pressable>
                </View>
                <Text style={[styles.translationText, { color: C.text }]}>
                  {translation}
                </Text>
                <NumberStatus check={numberCheck} okColor={C.success} warnColor={C.amber} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {credits <= 0 && (
        <View style={styles.zeroOverlay}>
          <View style={styles.zeroCard}>
            <Feather name="alert-circle" size={48} color="#DC2626" />
            <Text style={styles.zeroTitle}>No credits left</Text>
            <Text style={styles.zeroSub}>
              Add credits to continue using voice translation.
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
        onSelect={(lang) => {
          setVoiceSourceLang(lang.code);
          addRecentLang(lang.code);
          setShowSourcePicker(false);
        }}
        mode="source"
        selectedCode={voiceSourceLang}
      />
      <LanguagePickerModal
        visible={showTargetPicker}
        onClose={() => setShowTargetPicker(false)}
        onSelect={(lang) => {
          setTargetLang(lang.code);
          addRecentLang(lang.code);
          setShowTargetPicker(false);
        }}
        mode="target"
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creditsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  creditsText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_600SemiBold",
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
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  readBack: {
    fontSize: 13,
    marginTop: 6,
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
  zeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    backgroundColor: "rgba(10,15,24,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  zeroCard: {
    backgroundColor: "#151D28",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#1E2A3A",
  },
  zeroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0F4F8",
    marginTop: 4,
  },
  zeroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#A0AEC0",
    textAlign: "center",
    lineHeight: 20,
  },
  zeroBtn: {
    marginTop: 8,
    backgroundColor: "#FF6B00",
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  zeroBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
