/**
 * Clinic phrases — ready-made Hindi sentences a clinic says every day. Each one
 * is translated live through the same path as the Clinic tab (translate → number
 * check), so it shows ✓ chips or a warning, and can be played aloud.
 */

import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import { NumberStatus } from "@/components/NumberWarning";
import { LANGUAGES } from "@/constants/languages";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { translateText, type NumberCheck } from "@/services/sarvam";
import { speakText } from "@/services/tts";

// Every phrase carries the kind of number the eval showed models get wrong.
const CATEGORIES: { name: string; phrases: string[] }[] = [
  {
    name: "Fasting & tests",
    phrases: [
      "पौने नौ बजे तक खाली पेट रहना है।",
      "खून की जांच सुबह 8 बजे होगी।",
      "टेस्ट से 12 घंटे पहले कुछ मत खाइए।",
      "रिपोर्ट साढ़े पाँच बजे तक मिल जाएगी।",
    ],
  },
  {
    name: "Medicines",
    phrases: [
      "दवा दिन में दो बार खाने के बाद लेनी है।",
      "पैरासिटामोल 500 mg की एक गोली हर 6 घंटे में लें।",
      "बच्चे को ढाई चम्मच सिरप रात को दें।",
      "यह दवा पूरे 7 दिन तक लेनी है।",
    ],
  },
  {
    name: "Appointments",
    phrases: [
      "अगली जांच 15 नवंबर को होगी।",
      "सवा दस बजे डॉक्टर से मिलना है।",
      "टांके 10 दिन बाद खुलेंगे।",
    ],
  },
  {
    name: "Costs",
    phrases: [
      "ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।",
      "आज 2,500 रुपये जमा करने होंगे।",
      "बाकी डेढ़ हज़ार रुपये छुट्टी के समय देने हैं।",
    ],
  },
  {
    name: "Emergency",
    phrases: [
      "दर्द बढ़े तो तुरंत 108 पर फ़ोन करें।",
      "बुखार 102 डिग्री से ऊपर जाए तो अस्पताल आइए।",
      "साँस लेने में तकलीफ़ हो तो तुरंत आइए।",
    ],
  },
];

interface Result {
  text: string;
  check?: NumberCheck;
}

export default function ClinicPhrasesScreen() {
  const { setCredits, voiceGender, ttsProvider } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState(CATEGORIES[0]!.name);
  const [targetLang, setTargetLang] = useState("ta-IN");
  const [showPicker, setShowPicker] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  // Translations already fetched, per phrase and target language.
  const [results, setResults] = useState<Record<string, Result>>({});

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;
  const targetLabel = LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang;
  const phrases = CATEGORIES.find((c) => c.name === category)!.phrases;
  const keyOf = (p: string) => `${targetLang}|${p}`;

  const toggle = async (phrase: string) => {
    if (open === phrase) return setOpen(null);
    setOpen(phrase);
    if (results[keyOf(phrase)]) return;
    setLoading(phrase);
    try {
      const r = await translateText({ input: phrase, sourceLanguageCode: "hi-IN", targetLanguageCode: targetLang, formalMode: true });
      if (typeof r.credits === "number") setCredits(r.credits);
      setResults((prev) => ({ ...prev, [keyOf(phrase)]: { text: r.translatedText, check: r.numberCheck } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      Alert.alert("Translation failed", msg === "INSUFFICIENT_CREDITS" ? "No credits remaining." : msg || "Please try again.");
      setOpen(null);
    } finally {
      setLoading(null);
    }
  };

  const play = async (phrase: string, r: Result) => {
    setSpeaking(phrase);
    try {
      await speakText(r.text, targetLang, voiceGender, ttsProvider);
    } catch (err) {
      Alert.alert("Playback failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSpeaking(null);
    }
  };

  const renderPhrase = ({ item }: { item: string }) => {
    const r = results[keyOf(item)];
    const isOpen = open === item;
    const unverified = r?.check?.ok === false;
    return (
      <Pressable
        onPress={() => toggle(item)}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: isOpen ? theme.primary + "60" : theme.border }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={[styles.phrase, { color: theme.text }]}>{item}</Text>
        {isOpen && loading === item && <ActivityIndicator style={styles.spinner} color={theme.primary} />}
        {isOpen && r && (
          <View style={styles.result}>
            <Text style={[styles.translation, { color: theme.primary }]}>{r.text}</Text>
            <NumberStatus check={r.check} okColor={theme.success} warnColor={theme.amber} />
            <Pressable
              onPress={() => play(item, r)}
              disabled={speaking !== null}
              style={({ pressed }) => [styles.playBtn, { borderColor: theme.border, opacity: pressed || speaking ? 0.6 : 1 }]}
            >
              {speaking === item ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="volume-2" size={16} color={theme.primary} />
              )}
              <Text style={[styles.playText, { color: theme.primary }]}>
                {unverified ? "Play anyway" : "Play"}
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Clinic phrases</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.langPill, { borderColor: theme.primary + "50", backgroundColor: theme.primary + "10" }]}
        >
          <Text style={[styles.langText, { color: theme.primary }]}>→ {targetLabel}</Text>
          <Feather name="chevron-down" size={14} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsWrap}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => setCategory(c.name)}
            style={[
              styles.tab,
              { backgroundColor: category === c.name ? theme.primary : theme.surface, borderColor: category === c.name ? theme.primary : theme.border },
            ]}
          >
            <Text style={[styles.tabText, { color: category === c.name ? "#FFFFFF" : theme.textSecondary }]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={phrases}
        keyExtractor={(p) => p}
        renderItem={renderPhrase}
        extraData={[open, results, loading, speaking, targetLang]}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 84 }]}
        ListFooterComponent={
          <Text style={[styles.footnote, { color: theme.textMuted }]}>
            Tap a phrase to translate it live. Numbers marked ✓ were checked in both languages.
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />

      <LanguagePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(lang) => {
          setTargetLang(lang.code);
          setShowPicker(false);
          setOpen(null);
        }}
        mode="target"
        selectedCode={targetLang}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  langPill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  langText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabsWrap: { flexGrow: 0 },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  phrase: { fontSize: 16, lineHeight: 23, fontFamily: "Inter_600SemiBold" },
  spinner: { marginTop: 10, alignSelf: "flex-start" },
  result: { marginTop: 10 },
  translation: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_500Medium" },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  playText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  footnote: { fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 8 },
});
