import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const USAGE_KEY = "bhaashai_usage";

interface UsageData {
  charsTranslated: number;
  audioSeconds: number;
}

type ThemeOption = "system" | "light" | "dark";

export default function SettingsScreen() {
  const {
    apiKey,
    setApiKey,
    themeMode,
    setThemeMode,
    formalMode,
    setFormalMode,
    sourceLang,
    targetLang,
  } = useApp();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<UsageData>({ charsTranslated: 0, audioSeconds: 0 });

  useEffect(() => {
    AsyncStorage.getItem(USAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        // Merge with defaults so any missing fields stay 0 rather than undefined
        setUsage((prev) => ({ ...prev, ...parsed }));
      } catch {}
    });
  }, []);

  const resetUsage = () => {
    Alert.alert("Reset Usage", "Clear all usage counters?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          const empty: UsageData = { charsTranslated: 0, audioSeconds: 0 };
          await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(empty));
          setUsage(empty);
        },
      },
    ]);
  };

  const handleSaveKey = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClearKey = () => {
    Alert.alert("Remove API Key", "Are you sure you want to remove your API key?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setKeyInput("");
          await setApiKey("");
        },
      },
    ]);
  };

  const themeOptions: { label: string; value: ThemeOption; icon: string }[] = [
    { label: "System", value: "system", icon: "monitor" },
    { label: "Light", value: "light", icon: "sun" },
    { label: "Dark", value: "dark", icon: "moon" },
  ];

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
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "web"
                ? insets.bottom + 34 + 84
                : insets.bottom + 84,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* API Key Section */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          SARVAM AI
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: theme.text }]}>API Key</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Stored securely using device encryption. Required to use translation features.
          </Text>
          <View
            style={[
              styles.keyInput,
              {
                backgroundColor: theme.surfaceSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder="Enter your Sarvam API key..."
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showKey}
              style={[styles.keyTextField, { color: theme.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowKey((v) => !v)} hitSlop={8}>
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={17}
                color={theme.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.keyActions}>
            {apiKey ? (
              <Pressable
                onPress={handleClearKey}
                style={[
                  styles.btn,
                  { backgroundColor: theme.error + "18", flex: 0.4 },
                ]}
              >
                <Text style={[styles.btnText, { color: theme.error }]}>
                  Remove
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSaveKey}
              disabled={!keyInput.trim() || keyInput === apiKey}
              style={[
                styles.btn,
                {
                  backgroundColor:
                    keyInput.trim() && keyInput !== apiKey
                      ? saved
                        ? theme.success
                        : theme.primary
                      : theme.surfaceSecondary,
                  flex: 1,
                  opacity: !keyInput.trim() || keyInput === apiKey ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color:
                      keyInput.trim() && keyInput !== apiKey
                        ? "#fff"
                        : theme.textMuted,
                  },
                ]}
              >
                {saved ? "Saved" : apiKey ? "Update Key" : "Save Key"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => Linking.openURL("https://sarvam.ai")}
            style={styles.linkRow}
          >
            <Feather name="external-link" size={12} color={theme.primary} />
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Get API key from Sarvam AI
            </Text>
          </Pressable>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: theme.text }]}>Theme</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const active = themeMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setThemeMode(opt.value);
                  }}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: active
                        ? theme.primary
                        : theme.surfaceSecondary,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon as keyof typeof Feather.glyphMap}
                    size={15}
                    color={active ? "#fff" : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: active ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Translation Preferences */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          TRANSLATION
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => setFormalMode(!formalMode)}
            style={styles.prefRow}
          >
            <View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                Default Mode
              </Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                {formalMode ? "Formal — professional register" : "Colloquial — conversational register"}
              </Text>
            </View>
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor: formalMode
                    ? theme.primary + "18"
                    : theme.surfaceSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBadgeText,
                  { color: formalMode ? theme.primary : theme.textMuted },
                ]}
              >
                {formalMode ? "Formal" : "Casual"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Usage */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          USAGE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.usageRow}>
            <View style={styles.usageStat}>
              <Feather name="type" size={16} color={theme.primary} />
              <Text style={[styles.usageValue, { color: theme.text }]}>
                {(usage?.charsTranslated ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.usageLabel, { color: theme.textMuted }]}>
                Characters translated
              </Text>
            </View>
            <View style={[styles.usageDivider, { backgroundColor: theme.border }]} />
            <View style={styles.usageStat}>
              <Feather name="mic" size={16} color={theme.primary} />
              <Text style={[styles.usageValue, { color: theme.text }]}>
                {Math.round(usage?.audioSeconds ?? 0)}s
              </Text>
              <Text style={[styles.usageLabel, { color: theme.textMuted }]}>
                Audio transcribed
              </Text>
            </View>
            <View style={[styles.usageDivider, { backgroundColor: theme.border }]} />
            <View style={styles.usageStat}>
              <Feather name="credit-card" size={16} color={theme.primary} />
              <Text style={[styles.usageValue, { color: theme.text }]}>
                ~₹{(((usage?.charsTranslated ?? 0) / 10000) * 30).toFixed(2)}
              </Text>
              <Text style={[styles.usageLabel, { color: theme.textMuted }]}>
                Est. API cost
              </Text>
            </View>
          </View>
          <Pressable
            onPress={resetUsage}
            style={({ pressed }) => [
              styles.resetBtn,
              { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={13} color={theme.textMuted} />
            <Text style={[styles.resetBtnText, { color: theme.textMuted }]}>
              Reset counters
            </Text>
          </Pressable>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          ABOUT
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.aboutRow}>
            <View
              style={[
                styles.aboutIcon,
                { backgroundColor: theme.primary },
              ]}
            >
              <Feather name="globe" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                BhaashAI
              </Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                Real-Time Indian Language Translator
              </Text>
              <Text style={[styles.version, { color: theme.textMuted }]}>
                Version 1.0.0 · Powered by Sarvam AI
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => Linking.openURL("https://sarvam.ai")}
            style={[styles.aboutLink, { borderColor: theme.border }]}
          >
            <Text style={[styles.aboutLinkText, { color: theme.textSecondary }]}>
              Sarvam AI
            </Text>
            <Feather name="external-link" size={14} color={theme.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
  keyInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  keyTextField: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  keyActions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  linkText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  aboutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  aboutLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  aboutLinkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  usageStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  usageDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  usageValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  usageLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
