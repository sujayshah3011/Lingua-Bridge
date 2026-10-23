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
import { AgreedSummary, hasNumbers } from "@/components/AgreedSummary";
import {
  startVoiceRecording,
  stopAndTranscribe,
  cancelVoiceRecording,
} from "@/services/stt";
import { synthesizeSpeech } from "@/services/tts";
import { translateText } from "@/services/sarvam";

type Speaker = "A" | "B";

// Tap-to-say clinic phrases for speaker A (Hindi). Each carries a number the model
// is known to get wrong without the server's check (see eval/).
const CLINIC_PHRASES = [
  "पौने नौ बजे तक खाली पेट रहना है।",
  "दवा दिन में दो बार खाने के बाद लेनी है।",
  "ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।",
  "अगली जांच 15 नवंबर को होगी।",
  "सवा सात बजे ऑपरेशन थिएटर में ले जाएँगे।",
];

function showTranslateError(err: unknown) {
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
}
type SpeakerState = "idle" | "recording" | "processing";

export default function ConversationScreen() {
  const { credits, setCredits, isDark, ttsProvider, voiceGender } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const [langA, setLangA] = useState("hi-IN");
  // Clinic defaults: Hindi-speaking patient, Tamil-speaking staff.
  const [langB, setLangB] = useState("ta-IN");
  const [showPickerA, setShowPickerA] = useState(false);
  const [showPickerB, setShowPickerB] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  // Hands-free: a pause ends the turn, and after a verified translation is spoken
  // the other side's mic opens by itself. Refs, because playback ends long after
  // the callbacks that started it were created.
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  handsFreeRef.current = handsFree;

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
      if (credits < 0.05) {
        Alert.alert(
          "Not Enough Credits",
          "Your balance is too low to record. Add credits to continue.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Add Credits", onPress: () => router.push("/topup") },
          ]
        );
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
        await startVoiceRecording(handsFree ? () => stopSpeaker(speaker) : undefined);

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
    [credits, activeRecorder, langA, langB, ensurePermission, setActiveRecorderBoth, handsFree]
  );
  const recordRef = useRef(recordAndTranslate);
  recordRef.current = recordAndTranslate;

  // The half of a turn after speech recognition: translate, check numbers, show
  // the bubble, speak. Translation errors propagate to the caller.
  const translateAndSpeak = useCallback(
    async (speaker: Speaker, text: string, detectedLang?: string) => {
      const sourceLang = speaker === "A" ? langA : langB;
      const targetLangCode = speaker === "A" ? langB : langA;

      const { translatedText: translated, credits: newCredits, numberCheck, normalizedInput } = await translateText({
        input: text,
        sourceLanguageCode: detectedLang ?? sourceLang,
        targetLanguageCode: targetLangCode,
        formalMode: true,
      });
      if (typeof newCredits === "number") setCredits(newCredits);

      const msg: Message = {
        id: `${Date.now()}_${speaker}`,
        speaker,
        original: text,
        translated: translated ?? "Translation unavailable.",
        sourceLangLabel:
          LANGUAGES.find((l) => l.code === sourceLang)?.name ?? sourceLang,
        targetLangLabel:
          LANGUAGES.find((l) => l.code === targetLangCode)?.name ?? targetLangCode,
        timestamp: Date.now(),
        numberCheck,
        normalizedInput,
      };
      addMessage(msg);

      // Never auto-speak a number we couldn't verify: the bubble shows what to
      // confirm, and the replay button still plays it once the speaker agrees.
      const unverified = numberCheck?.ok === false;
      if (unverified && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      if (translated) {
        try {
          await soundRef.current?.unloadAsync();
          const fileUri = await synthesizeSpeech(translated, targetLangCode, voiceGender, ttsProvider);
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, audioUri: fileUri } : m))
          );
          if (unverified) return;
          const { sound } = await Audio.Sound.createAsync(
            { uri: fileUri },
            { shouldPlay: true }
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s) => {
            if ("didJustFinish" in s && s.didJustFinish) {
              sound.unloadAsync();
              soundRef.current = null;
              if (handsFreeRef.current) recordRef.current(speaker === "A" ? "B" : "A");
            }
          });
        } catch (err) {
          const ttsMsg = err instanceof Error ? err.message : "";
          // Server includes its real balance when it rejects for
          // insufficient credits — sync it so a stale local display can't
          // keep disagreeing with what the server actually charged against.
          const insufficientMatch = ttsMsg.match(/^INSUFFICIENT_CREDITS(?::(-?[\d.]+))?$/);
          const realBalance = insufficientMatch?.[1] !== undefined ? Number(insufficientMatch[1]) : undefined;
          if (realBalance !== undefined) setCredits(realBalance);

          // TTS failure is non-fatal — the translated text is still shown
          // regardless — but silent failure here reads as "the speaker
          // isn't working", so surface it instead of only logging.
          if (insufficientMatch) {
            Alert.alert(
              "Playback Failed",
              realBalance !== undefined
                ? `No credits remaining to speak the translation (server balance: ₹${realBalance.toFixed(2)}).`
                : "No credits remaining to speak the translation."
            );
          } else {
            console.error("[Conversation TTS] Unhandled error:", ttsMsg || err);
          }
        }
      }
    },
    [addMessage, setCredits, langA, langB, voiceGender, ttsProvider]
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

      setSpeakerState("processing");

      try {
        const sttResult = await stopAndTranscribe(sourceLang);
        if (typeof sttResult.credits === "number") setCredits(sttResult.credits);

        if (!sttResult.transcript.trim()) {
          setSpeakerState("idle");
          setActiveRecorderBoth(null);
          return;
        }

        await translateAndSpeak(speaker, sttResult.transcript, sttResult.languageCode);
      } catch (err: unknown) {
        showTranslateError(err);
      } finally {
        setSpeakerState("idle");
        setActiveRecorderBoth(null);
      }
    },
    [setCredits, langA, langB, translateAndSpeak, setActiveRecorderBoth]
  );

  // Quick phrases skip speech recognition but take the same translate → check →
  // speak path, so a demo turn behaves exactly like a spoken one.
  const sayPhrase = useCallback(
    async (text: string) => {
      if (activeRecorderRef.current !== null) return;
      setActiveRecorderBoth("A");
      setStateA("processing");
      try {
        await translateAndSpeak("A", text);
      } catch (err: unknown) {
        showTranslateError(err);
      } finally {
        setStateA("idle");
        setActiveRecorderBoth(null);
      }
    },
    [translateAndSpeak, setActiveRecorderBoth]
  );

  const langALabel = LANGUAGES.find((l) => l.code === langA)?.name ?? langA;
  const langBLabel = LANGUAGES.find((l) => l.code === langB)?.name ?? langB;

  const messagesA = messages.filter((m) => m.speaker === "A");
  const messagesB = messages.filter((m) => m.speaker === "B");

  const badgeColor =
    credits > 20 ? "#16A34A" : credits > 5 ? "#EA580C" : "#DC2626";

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
        <View style={styles.navRight}>
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
            onPress={() => setHandsFree((v) => !v)}
            accessibilityLabel={handsFree ? "Hands-free on" : "Hands-free off"}
            accessibilityState={{ selected: handsFree }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather name="headphones" size={20} color={handsFree ? C.primary : C.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setShowSummary(true)}
            disabled={!messages.some(hasNumbers)}
            accessibilityLabel="What we agreed"
            style={({ pressed }) => ({ opacity: !messages.some(hasNumbers) ? 0.3 : pressed ? 0.5 : 1 })}
          >
            <Feather name="clipboard" size={20} color={C.primary} />
          </Pressable>
          <Pressable
            onPress={() => setMessages([])}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather name="trash-2" size={20} color={C.textMuted} />
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
                  disabled={activeRecorder === "A" || credits < 0.05}
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

            {langA === "hi-IN" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.phraseRow}
              >
                {CLINIC_PHRASES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => sayPhrase(p)}
                    disabled={activeRecorder !== null || credits < 0.05}
                    style={({ pressed }) => [
                      styles.phraseChip,
                      { borderColor: C.sage + "60", backgroundColor: C.surfaceSecondary, opacity: activeRecorder !== null ? 0.4 : pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.phraseText, { color: C.text }]} numberOfLines={1}>{p}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={styles.micRow}>
              {stateA === "processing" ? (
                <ActivityIndicator color="#FF6B00" size="small" />
              ) : (
                <MicButton
                  isRecording={stateA === "recording"}
                  onPress={() =>
                    stateA === "recording" ? stopSpeaker("A") : recordAndTranslate("A")
                  }
                  disabled={activeRecorder === "B" || credits < 0.05}
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
      <AgreedSummary visible={showSummary} onClose={() => setShowSummary(false)} messages={messages} />
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
  phraseRow: { gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  phraseChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  phraseText: { fontSize: 13 },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  creditsPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  creditsText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  lowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EA580C30",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lowBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9A3412",
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
