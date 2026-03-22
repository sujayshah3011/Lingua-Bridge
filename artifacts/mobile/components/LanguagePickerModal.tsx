import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Language, LANGUAGES } from "@/constants/languages";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (lang: Language) => void;
  mode: "source" | "target";
  selectedCode: string;
}

export function LanguagePickerModal({
  visible,
  onClose,
  onSelect,
  mode,
  selectedCode,
}: LanguagePickerModalProps) {
  const { theme, isDark } = useTheme();
  const { recentLangs, addRecentLang, autoDetect } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filteredLangs = useMemo(() => {
    if (!search.trim()) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [search]);

  const recentItems = useMemo(() => {
    if (search.trim()) return [];
    return recentLangs
      .map((code) => LANGUAGES.find((l) => l.code === code))
      .filter(Boolean) as Language[];
  }, [recentLangs, search]);

  const handleSelect = async (lang: Language) => {
    await Haptics.selectionAsync();
    addRecentLang(lang.code);
    onSelect(lang);
    onClose();
    setSearch("");
  };

  const handleAutoDetect = async () => {
    if (mode !== "source") return;
    await Haptics.selectionAsync();
    onSelect({ code: "auto", name: "Auto Detect", nativeName: "" });
    onClose();
    setSearch("");
  };

  const renderItem = ({ item }: { item: Language }) => {
    const isSelected = item.code === selectedCode;
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.langRow,
          {
            backgroundColor: isSelected
              ? theme.primary + "18"
              : pressed
                ? theme.surfaceSecondary
                : "transparent",
          },
        ]}
      >
        <View style={styles.langInfo}>
          <Text
            style={[
              styles.langName,
              {
                color: isSelected ? theme.primary : theme.text,
                fontFamily: isSelected
                  ? "Inter_600SemiBold"
                  : "Inter_500Medium",
              },
            ]}
          >
            {item.name}
          </Text>
          <Text style={[styles.langNative, { color: theme.textSecondary }]}>
            {item.nativeName}
          </Text>
        </View>
        {isSelected && (
          <Feather name="check" size={16} color={theme.primary} />
        )}
      </Pressable>
    );
  };

  const sections = useMemo(() => {
    const items: Array<
      | { type: "header"; title: string }
      | { type: "autoDetect" }
      | { type: "lang"; data: Language }
    > = [];

    if (mode === "source" && !search.trim()) {
      items.push({ type: "autoDetect" });
    }

    if (recentItems.length > 0 && !search.trim()) {
      items.push({ type: "header", title: "Recent" });
      recentItems.forEach((l) => items.push({ type: "lang", data: l }));
    }

    items.push({
      type: "header",
      title: search.trim() ? "Results" : "All Languages",
    });
    filteredLangs.forEach((l) => items.push({ type: "lang", data: l }));

    return items;
  }, [recentItems, filteredLangs, mode, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        onClose();
        setSearch("");
      }}
    >
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === "ios" ? 16 : insets.top + 16,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === "source" ? "Source Language" : "Target Language"}
          </Text>
          <Pressable
            onPress={() => {
              onClose();
              setSearch("");
            }}
            hitSlop={12}
          >
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search language..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x-circle" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={sections}
          keyExtractor={(item, idx) =>
            item.type === "lang"
              ? item.data.code
              : item.type === "header"
                ? `h-${item.title}-${idx}`
                : "auto"
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + 16,
          }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text
                  style={[
                    styles.sectionHeader,
                    {
                      color: theme.textMuted,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  {item.title}
                </Text>
              );
            }
            if (item.type === "autoDetect") {
              const isSelected = autoDetect;
              return (
                <Pressable
                  onPress={handleAutoDetect}
                  style={({ pressed }) => [
                    styles.langRow,
                    {
                      backgroundColor: isSelected
                        ? theme.primary + "18"
                        : pressed
                          ? theme.surfaceSecondary
                          : "transparent",
                    },
                  ]}
                >
                  <View style={styles.langInfo}>
                    <Text
                      style={[
                        styles.langName,
                        {
                          color: isSelected ? theme.primary : theme.text,
                          fontFamily: isSelected
                            ? "Inter_600SemiBold"
                            : "Inter_500Medium",
                        },
                      ]}
                    >
                      Auto Detect
                    </Text>
                    <Text
                      style={[
                        styles.langNative,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Detect language automatically
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={16} color={theme.primary} />
                  )}
                </Pressable>
              );
            }
            return renderItem({ item: item.data });
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 16,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  langInfo: { flex: 1, gap: 2 },
  langName: { fontSize: 15 },
  langNative: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
