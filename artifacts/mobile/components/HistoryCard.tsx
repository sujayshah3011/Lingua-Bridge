import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

import { getLanguageByCode } from "@/constants/languages";
import { TranslationRecord } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

interface HistoryCardProps {
  record: TranslationRecord;
  onDelete: (id: string) => void;
  onPress: (record: TranslationRecord) => void;
}

export function HistoryCard({ record, onDelete, onPress }: HistoryCardProps) {
  const { theme } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  const sourceLangData = getLanguageByCode(record.sourceLang);
  const targetLangData = getLanguageByCode(record.targetLang);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 7) return `${day}d ago`;
    return date.toLocaleDateString();
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });
    return (
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onDelete(record.id);
        }}
        style={[styles.deleteAction, { backgroundColor: theme.error }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Feather name="trash-2" size={20} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <Pressable
        onPress={() => onPress(record)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed
              ? theme.surfaceSecondary
              : theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.langRow}>
          <View style={styles.langPair}>
            <Text style={[styles.langCode, { color: theme.primary }]}>
              {sourceLangData?.name ?? record.sourceLang}
            </Text>
            <Feather name="arrow-right" size={11} color={theme.textMuted} />
            <Text style={[styles.langCode, { color: theme.primary }]}>
              {targetLangData?.name ?? record.targetLang}
            </Text>
          </View>
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>
            {formatTime(record.timestamp)}
          </Text>
        </View>

        <Text
          style={[styles.sourceText, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {record.sourceText}
        </Text>
        <Text
          style={[styles.translatedText, { color: theme.text }]}
          numberOfLines={2}
        >
          {record.translatedText}
        </Text>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  langPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langCode: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  timestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sourceText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  translatedText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 21,
  },
  deleteAction: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginBottom: 10,
    marginRight: 16,
  },
});
