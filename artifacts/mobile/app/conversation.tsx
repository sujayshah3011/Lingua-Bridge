/**
 * Conversation Screen — Dual-speaker live voice translation.
 *
 * The screen is split into two halves:
 *  - TOP (Speaker A): right-side mic, records and translates to Speaker B's language
 *  - BOTTOM (Speaker B): left-side mic, flipped 180°, records and translates back
 *
 * Each speaker taps their mic button to record, releases to get the transcript
 * and translation. TTS plays the result automatically for the opposite speaker.
 */

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
import ConversationBubble, { Message } from "@/components/ConversationBubble";
import MicButton from "@/components/MicButton";
import LanguagePickerModal from "@/components/LanguagePickerModal";
import { transcribeAudio } from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { callSarvamTranslate } from "@/services/sarvam";

type Speaker = "A" | "B";
type SpeakerState = "idle" | "recording" | "processing";

export default function ConversationScreen() {
  const { apiKey, isDark } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const [langA, setLangA] = useState("hi-IN");
  const [langB, setLangB] = useState("en-IN");
  const [showPickerA, setShowPickerA] = useState(false);
  const [showPickerB, setShowPickerB] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [stateA, setStateA] = useState<SpeakerState>("idle");
  const [stateB, setStateB] = useState<SpeakerState>("idle");
  const [activeRecorder, setActiveRecorder] = useState<Speaker | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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
        "Enable microphone access in Settings to use Conversation mode.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const recordAndTranslate = useCallback(
    async (speaker: Speaker) => {
      if (!apiKey) {
        Alert.alert(
          "API Key Required",
          "Add your Sarvam API key in Settings."
        );
        return;
      }
      if (activeRecorder !== null) return; // another speaker is active
      if (!(await ensurePermission())) return;

      const setSpeakerState =
        speaker === "A" ? setStateA : setStateB;
      const sourceLang = speaker === "A" ? langA : langB;
      const targetLangCode = speaker === "A" ? langB : langA;

      setActiveRecorder(speaker);
      setSpeakerState("recording");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        await recording.startAsync();
        recordingRef.current = recording;

        // Record for up to 10 seconds, then auto-stop
        const timer = setTimeout(async () => {
          if (recordingRef.current === recording) {
            await finalize(recording, speaker, sourceLang, targetLangCode, setSpeakerState);
          }
        }, 10000);

        // Store timer so we can clear on manual stop
        (recording as unknown as { _autoStopTimer?: ReturnType<typeof setTimeout> })._autoStopTimer = timer;
      } catch (err) {
        console.error("Recording start error:", err);
        setSpeakerState("idle");
        setActiveRecorder(null);
      }
    },
    [apiKey, activeRecorder, langA, langB, ensurePermission]
  );

  const stopRecording = useCallback(
    async (speaker: Speaker) => {
      const recording = recordingRef.current;
      if (!recording || activeRecorder !== speaker) return;

      const setSpeakerState =
        speaker === "A" ? setStateA : setStateB;
      const sourceLang = speaker === "A" ? langA : langB;
      const targetLangCode = speaker === "A" ? langB : langA;

      // Clear auto-stop timer
      const autoTimer = (recording as unknown as { _autoStopTimer?: ReturnType<typeof setTimeout> })._autoStopTimer;
      if (autoTimer) clearTimeout(autoTimer);

      await finalize(recording, speaker, sourceLang, targetLangCode, setSpeakerState);
    },
    [activeRecorder, langA, langB]
  );

  const finalize = useCallback(
    async (
      recording: Audio.Recording,
      speaker: Speaker,
      sourceLang: string,
      targetLangCode: string,
      setSpeakerState: (s: SpeakerState) => void
    ) => {
      setSpeakerState("processing");
      recordingRef.current = null;

      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        if (!uri) throw new Error("No audio");

        const result = await transcribeAudio(uri, apiKey, sourceLang);
        if (!result.transcript) {
          setSpeakerState("idle");
          setActiveRecorder(null);
          return;
        }

        const translated = await callSarvamTranslate({
          sourceText: result.transcript,
          sourceLang: result.languageCode ?? sourceLang,
          targetLang: targetLangCode,
          mode: "formal",
          apiKey,
        });

        const msg: Message = {
          id: `${Date.now()}_${speaker}`,
          speaker,
          original: result.transcript,
          translated: translated ?? "Translation unavailable.",
          sourceLangLabel:
            LANGUAGES.find((l) => l.code === sourceLang)?.name ?? sourceLang,
          targetLangLabel:
            LANGUAGES.find((l) => l.code === targetLangCode)?.name ??
            targetLangCode,
          timestamp: Date.now(),
        };
        addMessage(msg);

        // Auto-play TTS for the other speaker
        if (translated) {
          try {
            await soundRef.current?.unloadAsync();
            const fileUri = await synthesizeSpeech(
              translated,
              targetLangCode,
              apiKey
            );
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
          } catch {
            // TTS failure is non-fatal — user sees the translation text
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        Alert.alert(
          "Error",
          msg === "INVALID_KEY"
            ? "Invalid API key. Update it in Settings."
            : "Translation failed. Please try again."
        );
      } finally {
        setSpeakerState("idle");
        setActiveRecorder(null);
      }
    },
    [apiKey, addMessage]
  );

  const langALabel = LANGUAGES.find((l) => l.code === langA)?.name ?? langA;
  const langBLabel = LANGUAGES.find((l) => l.code === langB)?.name ?? langB;

  const messagesA = messages.filter((m) => m.speaker === "A");
  const messagesB = messages.filter((m) => m.speaker === "B");

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: C.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: C.text }]}>Conversation</Text>
        <Pressable
          onPress={() => setMessages([])}
          accessibilityRole="button"
          accessibilityLabel="Clear conversation"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="trash-2" size={20} color={C.textMuted} />
        </Pressable>
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.webWrap}>
          <Feather name="smartphone" size={48} color={C.textMuted} />
          <Text style={[styles.webMsg, { color: C.textSecondary }]}>
            Conversation mode is available on iOS and Android.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* === SPEAKER B (bottom, physically flipped) === */}
          <View
            style={[
              styles.half,
              { backgroundColor: C.surface, borderColor: C.border, transform: [{ rotate: "180deg" }] },
            ]}
          >
            {/* Language selector */}
            <Pressable
              onPress={() => setShowPickerB(true)}
              style={[styles.langRow, { borderColor: C.border }]}
              accessibilityRole="button"
              accessibilityLabel={`Speaker B language: ${langBLabel}`}
            >
              <Feather name="globe" size={14} color={C.primary} />
              <Text style={[styles.langLabel, { color: C.text }]}>
                {langBLabel}
              </Text>
              <Feather name="chevron-down" size={12} color={C.textMuted} />
            </Pressable>

            {/* Bubble feed (last 3 messages from B) */}
            <ScrollView style={styles.bubbleFeed} ref={scrollRef}>
              {messagesB.slice(-3).map((msg) => (
                <ConversationBubble key={msg.id} message={msg} />
              ))}
            </ScrollView>

            {/* Mic + state */}
            <View style={styles.micRow}>
              {stateB === "processing" ? (
                <ActivityIndicator color="#FF6B00" size="small" />
              ) : (
                <MicButton
                  isRecording={stateB === "recording"}
                  onPress={() =>
                    stateB === "recording"
                      ? stopRecording("B")
                      : recordAndTranslate("B")
                  }
                  disabled={activeRecorder === "A"}
                  size={56}
                />
              )}
              <Text style={[styles.micLabel, { color: C.textMuted }]}>
                {stateB === "recording" ? "Tap to stop" : "Tap to speak"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: C.border }]} />

          {/* === SPEAKER A (top) === */}
          <View
            style={[
              styles.half,
              { backgroundColor: C.background, borderColor: C.border },
            ]}
          >
            {/* Language selector */}
            <Pressable
              onPress={() => setShowPickerA(true)}
              style={[styles.langRow, { borderColor: C.border }]}
              accessibilityRole="button"
              accessibilityLabel={`Speaker A language: ${langALabel}`}
            >
              <Feather name="globe" size={14} color={C.primary} />
              <Text style={[styles.langLabel, { color: C.text }]}>
                {langALabel}
              </Text>
              <Feather name="chevron-down" size={12} color={C.textMuted} />
            </Pressable>

            {/* Bubble feed */}
            <ScrollView style={styles.bubbleFeed}>
              {messagesA.slice(-3).map((msg) => (
                <ConversationBubble key={msg.id} message={msg} />
              ))}
            </ScrollView>

            {/* Mic + state */}
            <View style={styles.micRow}>
              {stateA === "processing" ? (
                <ActivityIndicator color="#FF6B00" size="small" />
              ) : (
                <MicButton
                  isRecording={stateA === "recording"}
                  onPress={() =>
                    stateA === "recording"
                      ? stopRecording("A")
                      : recordAndTranslate("A")
                  }
                  disabled={activeRecorder === "B"}
                  size={56}
                />
              )}
              <Text style={[styles.micLabel, { color: C.textMuted }]}>
                {stateA === "recording" ? "Tap to stop" : "Tap to speak"}
              </Text>
            </View>
          </View>
        </View>
      )}

      <LanguagePickerModal
        visible={showPickerA}
        onClose={() => setShowPickerA(false)}
        onSelect={(code) => {
          setLangA(code);
          setShowPickerA(false);
        }}
        selectedCode={langA}
      />
      <LanguagePickerModal
        visible={showPickerB}
        onClose={() => setShowPickerB(false)}
        onSelect={(code) => {
          setLangB(code);
          setShowPickerB(false);
        }}
        selectedCode={langB}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  webWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  webMsg: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  body: {
    flex: 1,
  },
  half: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  langLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bubbleFeed: {
    flex: 1,
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  micLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 3,
    width: "100%",
  },
});
