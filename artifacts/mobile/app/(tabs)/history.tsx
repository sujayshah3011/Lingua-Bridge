import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { HistoryCard } from "@/components/HistoryCard";
import { TranslationRecord, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

export default function HistoryScreen() {
  const { history, deleteHistoryItem, clearHistory } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<TranslationRecord | null>(null);

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const handleClearAll = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all translation history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            clearHistory();
          },
        },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteHistoryItem(id);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
        {history.length > 0 && (
          <Pressable
            onPress={handleClearAll}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.clearBtn, { color: theme.error }]}>
              Clear All
            </Text>
          </Pressable>
        )}
      </View>

      {selected && (
        <View
          style={[
            styles.detailModal,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setSelected(null)}
            style={styles.detailClose}
          >
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
          <Text style={[styles.detailSource, { color: theme.textSecondary }]}>
            {selected.sourceText}
          </Text>
          <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.detailTranslated, { color: theme.text }]} selectable>
            {selected.translatedText}
          </Text>
        </View>
      )}

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              Platform.OS === "web"
                ? insets.bottom + 34 + 84
                : insets.bottom + 84,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              <Feather name="clock" size={28} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No translations yet
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Your translation history will appear here
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 30).duration(250)}>
            <HistoryCard
              record={item}
              onDelete={handleDelete}
              onPress={setSelected}
            />
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  clearBtn: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  list: {
    paddingTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  detailModal: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  detailClose: {
    alignSelf: "flex-end",
    padding: 4,
  },
  detailSource: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 20,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
  },
  detailTranslated: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 24,
  },
});
