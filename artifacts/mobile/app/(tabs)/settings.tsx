import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

type ThemeOption = "system" | "light" | "dark";

export default function SettingsScreen() {
  const {
    credits,
    refreshCredits,
    themeMode,
    setThemeMode,
    formalMode,
    setFormalMode,
  } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const handleRefreshCredits = async () => {
    await Haptics.selectionAsync();
    await refreshCredits();
  };

  const creditColor =
    credits > 20
      ? theme.success
      : credits > 5
      ? "#F59E0B"
      : theme.error;

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
        {/* Credits */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          CREDITS
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.creditsRow}>
            <View
              style={[
                styles.creditsBadge,
                { backgroundColor: creditColor + "18" },
              ]}
            >
              <Feather name="zap" size={22} color={creditColor} />
              <Text style={[styles.creditsNumber, { color: creditColor }]}>
                {credits}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                Translation Credits
              </Text>
              <Text
                style={[styles.cardDesc, { color: theme.textSecondary }]}
              >
                Each translation costs 1 credit. Voice recognition costs 2.
                New devices start with 50 free credits.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleRefreshCredits}
            style={({ pressed }) => [
              styles.refreshBtn,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Feather name="refresh-cw" size={13} color={theme.textMuted} />
            <Text style={[styles.refreshBtnText, { color: theme.textMuted }]}>
              Refresh balance
            </Text>
          </Pressable>

          {credits <= 5 && (
            <View
              style={[
                styles.lowCreditsBanner,
                { backgroundColor: theme.error + "12", borderColor: theme.error + "30" },
              ]}
            >
              <Feather name="alert-triangle" size={13} color={theme.error} />
              <Text
                style={[styles.lowCreditsText, { color: theme.error }]}
              >
                {credits === 0
                  ? "No credits remaining. More credits coming soon."
                  : `Only ${credits} credit${credits === 1 ? "" : "s"} left.`}
              </Text>
            </View>
          )}
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
                {formalMode
                  ? "Formal — professional register"
                  : "Colloquial — conversational register"}
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
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  creditsBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  creditsNumber: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  lowCreditsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  lowCreditsText: {
    flex: 1,
    fontSize: 13,
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
});
