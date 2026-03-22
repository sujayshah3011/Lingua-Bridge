/**
 * Phrasebook Tab — Offline-first phrase reference.
 *
 * Displays pre-loaded phrases across 6 categories.
 * User can switch display language via a picker.
 * Phrases saved from History (starred) also appear here.
 * All data is local — no API call needed.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { Colors } from "@/constants/colors";
import { LANGUAGES } from "@/constants/languages";
import {
  Phrase,
  PhraseCategory,
  PHRASE_CATEGORIES,
  PHRASES,
  getPhrasesByCategory,
} from "@/data/phrases";
import LanguagePickerModal from "@/components/LanguagePickerModal";

const STARRED_KEY = "bhaashai_starred_phrases";

export default function PhrasebookScreen() {
  const { targetLang, isDark } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const [activeCategory, setActiveCategory] = useState<PhraseCategory>("Greetings");
  const [displayLang, setDisplayLang] = useState(targetLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load starred phrases from storage
  useEffect(() => {
    AsyncStorage.getItem(STARRED_KEY).then((raw) => {
      if (raw) setStarredIds(new Set(JSON.parse(raw)));
    });
  }, []);

  const persistStarred = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STARRED_KEY, JSON.stringify([...ids]));
  }, []);

  const toggleStar = useCallback(
    (phraseId: string) => {
      setStarredIds((prev) => {
        const next = new Set(prev);
        if (next.has(phraseId)) next.delete(phraseId);
        else next.add(phraseId);
        persistStarred(next);
        if (Platform.OS !== "web") Haptics.selectionAsync();
        return next;
      });
    },
    [persistStarred]
  );

  const copyPhrase = useCallback(async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const displayLangLabel =
    LANGUAGES.find((l) => l.code === displayLang)?.name ?? displayLang;

  const phrases = useMemo(
    () => getPhrasesByCategory(activeCategory),
    [activeCategory]
  );

  const renderPhrase = useCallback(
    ({ item }: { item: Phrase }) => {
      const translation = item.translations[displayLang] ?? null;
      const isStarred = starredIds.has(item.id);
      const isCopied = copiedId === item.id;

      return (
        <View
          style={[
            styles.phraseCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
          accessible
          accessibilityLabel={`${item.english}. ${translation ?? "Translation not available in selected language."}`}
        >
          {/* English */}
          <Text style={[styles.phraseEnglish, { color: C.text }]}>
            {item.english}
          </Text>
          {/* Translation */}
          {translation ? (
            <Text style={[styles.phraseTranslation, { color: C.primary }]}>
              {translation}
            </Text>
          ) : (
            <Text style={[styles.noTranslation, { color: C.textMuted }]}>
              Not available in {displayLangLabel}
            </Text>
          )}
          {/* Actions */}
          <View style={styles.phraseActions}>
            {translation && (
              <Pressable
                onPress={() => copyPhrase(translation, item.id)}
                accessibilityRole="button"
                accessibilityLabel={isCopied ? "Copied" : "Copy translation"}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <Feather
                  name={isCopied ? "check" : "copy"}
                  size={15}
                  color={isCopied ? C.success : C.textMuted}
                />
              </Pressable>
            )}
            <Pressable
              onPress={() => toggleStar(item.id)}
              accessibilityRole="button"
              accessibilityLabel={isStarred ? "Remove from favourites" : "Add to favourites"}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Feather
                name={isStarred ? "star" : "star"}
                size={15}
                color={isStarred ? "#F59E0B" : C.textMuted}
              />
            </Pressable>
          </View>
        </View>
      );
    },
    [
      displayLang,
      displayLangLabel,
      starredIds,
      copiedId,
      C,
      copyPhrase,
      toggleStar,
    ]
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: C.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Phrasebook</Text>
        <Pressable
          onPress={() => setShowLangPicker(true)}
          style={[styles.langPill, { backgroundColor: C.surface, borderColor: C.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Display language: ${displayLangLabel}`}
        >
          <Feather name="globe" size={14} color={C.primary} />
          <Text style={[styles.langPillText, { color: C.text }]}>
            {displayLangLabel}
          </Text>
          <Feather name="chevron-down" size={12} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catScroll, { borderBottomColor: C.border }]}
        contentContainerStyle={styles.catContent}
      >
        {PHRASE_CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.catBtn,
                active
                  ? { backgroundColor: C.primary }
                  : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.catText,
                  { color: active ? "#FFFFFF" : C.textSecondary },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Phrases list */}
      <FlatList
        data={phrases}
        keyExtractor={(p) => p.id}
        renderItem={renderPhrase}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* Language picker */}
      <LanguagePickerModal
        visible={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        onSelect={(code) => {
          setDisplayLang(code);
          setShowLangPicker(false);
        }}
        selectedCode={displayLang}
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
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catScroll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 56,
  },
  catContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  phraseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  phraseEnglish: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  phraseTranslation: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    lineHeight: 25,
  },
  noTranslation: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  phraseActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    padding: 4,
  },
});
