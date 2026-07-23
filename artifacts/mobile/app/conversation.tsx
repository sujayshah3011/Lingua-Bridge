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
import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import {
  startVoiceRecording,
  stopAndTranscribe,
  cancelVoiceRecording,
} from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { translateText } from "@/services/sarvam";

type Speaker = "A" | "B";
type SpeakerState = "idle" | "recording" | "processing";

export default function ConversationScreen() {
  const { credits, setCredits, isDark, ttsProvider, voiceGender } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const [langA, setLangA] = useState("hi-IN");
  const [langB, setLangB] = useState("en-IN");
  const [showPickerA, setShowPickerA] = useState(false);
  const [showPickerB, setShowPickerB] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [stateA, setStateA] = useState<SpeakerState>("idle");
  const [stateB, setStateB] = useState<SpeakerState>("idle");
  const [activeRecorder, setActiveRecorder] = useState<Speaker | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // recordAndTranslate's setTimeout and stopSpeaker both need the CURRENT
  // active recorder at the moment they run, not whatever it was when their
  // closure was created — setActiveRecorderBoth keeps this ref in sync with
  // the state so both reads are always fresh.
  const activeRecorderRef = useRef<Speaker | null>(null);
  const setActiveRecorderBoth = useCallback((speaker: Speaker | null) => {
    activeRecorderRef.current = speaker;
    setActiveRecorder(speaker);
  }, []);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      cancelVoiceRecording().catch(() => {});
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
      if (credits <= 0) {
        Alert.alert("No Credits", "You have no credits remaining. Check Settings for more info.");
        return;
      }
      if (activeRecorder !== null) return;
      if (!(await ensurePermission())) return;

      const setSpeakerState = speaker === "A" ? setStateA : setStateB;
      const sourceLang = speaker === "A" ? langA : langB;
      const targetLangCode = speaker === "A" ? langB : langA;

      setActiveRecorderBoth(speaker);
      setSpeakerState("recording");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      try {
        await startVoiceRecording();

        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        autoTimerRef.current = setTimeout(async () => {
          if (activeRecorderRef.current === speaker) {
            await stopSpeaker(speaker);
          }
        }, 10000);
      } catch (err: any) {
        console.error("Recording start error:", err);
        if (err?.message === "MICROPHONE_PERMISSION_DENIED") {
          Alert.alert(
            "Microphone Required",
            "Enable microphone access in Settings to use Conversation mode.",
            [{ text: "OK" }]
          );
        }
        setSpeakerState("idle");
        setActiveRecorderBoth(null);
      }
    },
    [credits, activeRecorder, langA, langB, ensurePermission, setActiveRecorderBoth]
  );

  const stopSpeaker = useCallback(
    async (speaker: Speaker) => {
      if (activeRecorderRef.current !== speaker) return;

      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }

      const setSpeakerState = speaker === "A" ? setStateA : setStateB;
      const sourceLang = speaker === "A" ? langA : langB;
      const targetLangCode = speaker === "A" ? langB : langA;

      setSpeakerState("processing");

      try {
        const sttResult = await stopAndTranscribe(sourceLang);
        if (typeof sttResult.credits === "number") setCredits(sttResult.credits);

        if (!sttResult.transcript.trim()) {
          setSpeakerState("idle");
          setActiveRecorderBoth(null);
          return;
        }

        const { translatedText: translated, credits: newCredits } = await translateText({
          input: sttResult.transcript,
          sourceLanguageCode: sttResult.languageCode ?? sourceLang,
          targetLanguageCode: targetLangCode,
          formalMode: true,
        });
        if (typeof newCredits === "number") setCredits(newCredits);

        const msg: Message = {
          id: `${Date.now()}_${speaker}`,
          speaker,
          original: sttResult.transcript,
          translated: translated ?? "Translation unavailable.",
          sourceLangLabel:
            LANGUAGES.find((l) => l.code === sourceLang)?.name ?? sourceLang,
          targetLangLabel:
            LANGUAGES.find((l) => l.code === targetLangCode)?.name ?? targetLangCode,
          timestamp: Date.now(),
        };
        addMessage(msg);

        if (translated) {
          try {
            await soundRef.current?.unloadAsync();
            const fileUri = await synthesizeSpeech(translated, targetLangCode, voiceGender, ttsProvider);
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, audioUri: fileUri } : m))
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
          } catch (err) {
            // TTS failure is non-fatal — the translated text is still shown
            console.error("[Conversation TTS] Unhandled error:", err instanceof Error ? err.message : err);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg !== "INSUFFICIENT_CREDITS") {
          console.error("[Conversation] Unhandled error:", msg);
        }
        Alert.alert(
          "Error",
          msg === "INSUFFICIENT_CREDITS"
            ? "No credits remaining. Check Settings."
            : msg === "NOT_SIGNED_IN"
            ? "Please sign in to use Conversation mode."
            : msg
            ? `Translation failed: ${msg}`
            : "Translation failed. Please try again."
        );
      } finally {
        setSpeakerState("idle");
        setActiveRecorderBoth(null);
      }
    },
    [addMessage, setCredits, langA, langB, voiceGender, ttsProvider, setActiveRecorderBoth]
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
      <View style={[styles.navBar, { borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: C.text }]}>Conversation</Text>
        <Pressable
          onPress={() => setMessages([])}
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
          {/* Speaker B (bottom, flipped) */}
          <View
            style={[
              styles.half,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                transform: [{ rotate: "180deg" }],
              },
            ]}
          >
            <Pressable
              onPress={() => setShowPickerB(true)}
              style={[styles.langRow, { borderColor: C.terracotta + "40", backgroundColor: C.surfaceSecondary }]}
            >
              <Feather name="globe" size={14} color={C.terracotta} />
              <Text style={[styles.langLabel, { color: C.text }]}>{langBLabel}</Text>
              <Feather name="chevron-down" size={12} color={C.textMuted} />
            </Pressable>

            <ScrollView style={styles.bubbleFeed} ref={scrollRef}>
              {messagesB.slice(-3).map((msg) => (
                <ConversationBubble key={msg.id} message={msg} />
              ))}
            </ScrollView>

            <View style={styles.micRow}>
              {stateB === "processing" ? (
                <ActivityIndicator color="#FF6B00" size="small" />
              ) : (
                <MicButton
                  isRecording={stateB === "recording"}
                  onPress={() =>
                    stateB === "recording" ? stopSpeaker("B") : recordAndTranslate("B")
                  }
                  disabled={activeRecorder === "A" || credits <= 0}
                  size={56}
                />
              )}
              <Text style={[styles.micLabel, { color: C.textMuted }]}>
                {stateB === "recording" ? "Tap to stop" : "Tap to speak"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: C.terracotta + "30" }]} />

          {/* Speaker A (top) */}
          <View
            style={[
              styles.half,
              { backgroundColor: C.background, borderColor: C.border },
            ]}
          >
            <Pressable
              onPress={() => setShowPickerA(true)}
              style={[styles.langRow, { borderColor: C.sage + "40", backgroundColor: C.surfaceSecondary }]}
            >
              <Feather name="globe" size={14} color={C.sage} />
              <Text style={[styles.langLabel, { color: C.text }]}>{langALabel}</Text>
              <Feather name="chevron-down" size={12} color={C.textMuted} />
            </Pressable>

            <ScrollView style={styles.bubbleFeed}>
              {messagesA.slice(-3).map((msg) => (
                <ConversationBubble key={msg.id} message={msg} />
              ))}
            </ScrollView>

            <View style={styles.micRow}>
              {stateA === "processing" ? (
                <ActivityIndicator color="#FF6B00" size="small" />
              ) : (
                <MicButton
                  isRecording={stateA === "recording"}
                  onPress={() =>
                    stateA === "recording" ? stopSpeaker("A") : recordAndTranslate("A")
                  }
                  disabled={activeRecorder === "B" || credits <= 0}
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
        onSelect={(lang) => { setLangA(lang.code); setShowPickerA(false); }}
        mode="source"
        selectedCode={langA}
      />
      <LanguagePickerModal
        visible={showPickerB}
        onClose={() => setShowPickerB(false)}
        onSelect={(lang) => { setLangB(lang.code); setShowPickerB(false); }}
        mode="target"
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
