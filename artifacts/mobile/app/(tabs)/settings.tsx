import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
    user,
    authLoading,
    signIn,
    signOut,
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
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleRefreshCredits = async () => {
    await Haptics.selectionAsync();
    await refreshCredits();
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch {
      Alert.alert("Sign-in failed", "Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
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
        {/* Account */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          ACCOUNT
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {authLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : user ? (
            <>
              <View style={styles.profileRow}>
                {user.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: theme.primary + "22" },
                    ]}
                  >
                    <Feather name="user" size={22} color={theme.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.profileName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {user.displayName ?? "Google User"}
                  </Text>
                  <Text
                    style={[styles.profileEmail, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {user.email ?? ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.signedInBadge,
                    { backgroundColor: theme.success + "18" },
                  ]}
                >
                  <Feather name="check-circle" size={12} color={theme.success} />
                  <Text style={[styles.signedInText, { color: theme.success }]}>
                    Signed in
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  {
                    borderColor: theme.border,
                    opacity: pressed || signingOut ? 0.6 : 1,
                  },
                ]}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={theme.textMuted} />
                ) : (
                  <>
                    <Feather name="log-out" size={14} color={theme.textMuted} />
                    <Text
                      style={[styles.signOutText, { color: theme.textMuted }]}
                    >
                      Sign out
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.signInPromptRow}>
                <View
                  style={[
                    styles.signInIconWrap,
                    { backgroundColor: theme.primary + "14" },
                  ]}
                >
                  <Feather name="user" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: theme.text }]}>
                    Sign in to sync credits
                  </Text>
                  <Text
                    style={[styles.cardDesc, { color: theme.textSecondary }]}
                  >
                    Your credits will be linked to your account and available
                    across devices.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleSignIn}
                disabled={signingIn}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    backgroundColor: pressed ? "#f5f5f5" : "#fff",
                    borderColor: theme.border,
                    opacity: signingIn ? 0.7 : 1,
                  },
                ]}
              >
                {signingIn ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Feather name="log-in" size={16} color="#4285F4" />
                    <Text style={styles.googleBtnText}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>

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
                {user
                  ? " Credits are linked to your account."
                  : " New devices start with 50 free credits."}
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
                {
                  backgroundColor: theme.error + "12",
                  borderColor: theme.error + "30",
                },
              ]}
            >
              <Feather name="alert-triangle" size={13} color={theme.error} />
              <Text style={[styles.lowCreditsText, { color: theme.error }]}>
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
            <Text
              style={[styles.aboutLinkText, { color: theme.textSecondary }]}
            >
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  signedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  signedInText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  signInPromptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  signInIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#202124",
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
