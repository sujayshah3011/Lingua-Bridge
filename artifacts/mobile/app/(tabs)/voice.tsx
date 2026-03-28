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
import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import MicButton from "@/components/MicButton";
import { transcribeAudio } from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { VoiceSelector } from "@/components/VoiceSelector";
import { translateText } from "@/services/sarvam";
import { chargeSTT, chargeTranslate, chargeTTS } from "@/services/credits";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

const USAGE_KEY = "bhaashai_usage";

const WAV_RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

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
    targetLang,
    setTargetLang,
    addToHistory,
    addRecentLang,
    isDark,
    voiceGender,
    setVoiceGender,
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
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingStartRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Microphone Required",
        "BhaashAI needs microphone access for voice translation.\n\nPlease enable it in your device Settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
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
    if (!(await ensurePermission())) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(WAV_RECORDING_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();

      setState("recording");
      setTranscript("");
      setTranslation("");
      setDetectedLang(null);
      setStatusText("Listening…");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      setState("error");
      setStatusText("Could not start microphone. Please try again.");
    }
  }, [credits, ensurePermission]);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setState("processing");
    setStatusText("Processing speech…");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const durationMs = Date.now() - recordingStartRef.current;
    const audioSeconds = durationMs / 1000;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("NO_AUDIO");

      incrementUsage("audioSeconds", Math.round(audioSeconds));

      setStatusText("Transcribing…");
      const result = await transcribeAudio(uri, voiceSourceLang);

      if (!result.transcript.trim()) {
        setStatusText("No speech detected. Tap the mic and try again.");
        setState("idle");
        return;
      }

      const uid = user?.uid;
      if (uid) {
        await chargeSTT(uid, audioSeconds, voiceSourceLang);
      }

      setTranscript(result.transcript);
      if (result.languageCode) setDetectedLang(result.languageCode);
      setStatusText("Translating…");

      const { translatedText, detectedSourceLang } = await translateText({
        input: result.transcript,
        sourceLanguageCode: result.languageCode ?? voiceSourceLang,
        targetLanguageCode: targetLang,
        formalMode: true,
      });

      if (uid) {
        await chargeTranslate(
          uid,
          result.transcript,
          detectedSourceLang ?? result.languageCode ?? voiceSourceLang,
          targetLang
        );
      }

      if (detectedSourceLang) setDetectedLang(detectedSourceLang);
      setTranslation(translatedText || "Translation unavailable.");
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
      recordingRef.current = null;
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INSUFFICIENT_CREDITS") {
        setStatusText("No credits remaining.");
      } else if (msg === "RATE_LIMIT") {
        setStatusText("Rate limit reached. Try again in a moment.");
      } else if (msg === "NO_AUDIO") {
        setStatusText("No audio recorded. Please try again.");
      } else if (msg.includes("STT_ERROR")) {
        setStatusText("Speech recognition failed. Please try again.");
      } else if (msg.includes("HTTP_")) {
        setStatusText("Translation service error. Please try again.");
      } else {
        setStatusText("Something went wrong. Please try again.");
      }
      setState("error");
    }
  }, [user, voiceSourceLang, targetLang, addToHistory]);

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "done" || state === "error") {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const speakTranslation = useCallback(async () => {
    if (!translation || ttsLoading) return;
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
    const uid = user?.uid;

    setTtsLoading(true);
    try {
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
      const fileUri = await synthesizeSpeech(translation, targetLang, voiceGender);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      if (uid) {
        await chargeTTS(uid, translation, targetLang);
      }

      sound.setOnPlaybackStatusUpdate((s) => {
        if (!s.isLoaded || ("didJustFinish" in s && s.didJustFinish)) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      Alert.alert(
        "Playback Failed",
        msg === "INSUFFICIENT_CREDITS"
          ? "No credits remaining."
          : msg === "RATE_LIMIT"
          ? "Rate limit reached, please wait."
          : msg.startsWith("TTS_ERROR_")
          ? "Speech synthesis failed. Please try again."
          : msg === "TTS_EMPTY_RESPONSE"
          ? "No audio received from the server."
          : "Could not play audio. Please try again."
      );
    } finally {
      setTtsLoading(false);
    }
  }, [user, translation, targetLang, voiceGender, ttsLoading, credits]);

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
      <View style={[styles.header, { borderBottomColor: C.border }]}>
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
            onPress={() => router.push("/conversation")}
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
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.cardLabel, { color: C.textMuted }]}>
                  {detectedLabel ? `Detected: ${detectedLabel}` : "Transcript"}
                </Text>
                <Text style={[styles.transcriptText, { color: C.textSecondary }]}>
                  {transcript}
                </Text>
              </View>
            ) : null}

            {translation ? (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.langDot, { backgroundColor: C.primary }]} />
                  <Text style={[styles.cardLabel, { color: C.textMuted, flex: 1 }]}>
                    {targetLabel}
                  </Text>
                  <Pressable
                    onPress={speakTranslation}
                    disabled={ttsLoading}
                    style={({ pressed }) => ({ opacity: pressed || ttsLoading ? 0.6 : 1, padding: 4 })}
                  >
                    {ttsLoading ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <Feather name="volume-2" size={20} color={C.primary} />
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
});
