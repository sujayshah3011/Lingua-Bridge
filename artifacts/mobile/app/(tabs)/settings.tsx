import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
    totalDebited,
    stats,
    themeMode,
    setThemeMode,
    ttsProvider,
    setTTSProvider,
  } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const creditColor =
    credits > 20 ? "#16A34A" : credits > 5 ? "#EA580C" : "#DC2626";

  const totalUsed = totalDebited;
  const totalEver = totalUsed + credits;
  const progressPct = totalEver > 0 ? Math.min(totalUsed / totalEver, 1) : 0;

  const themeOptions: { label: string; value: ThemeOption; icon: string }[] = [
    { label: "System", value: "system", icon: "monitor" },
    { label: "Light", value: "light", icon: "sun" },
    { label: "Dark", value: "dark", icon: "moon" },
  ];

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
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials}>
                      {(user.displayName ?? user.email ?? "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.profileName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {user.displayName || user.email?.split("@")[0] || "BhaashAI user"}
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
                    { backgroundColor: "#84A98C18" },
                  ]}
                >
                  <Feather name="check-circle" size={12} color={"#84A98C"} />
                  <Text style={[styles.signedInText, { color: "#84A98C" }]}>
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
                    <Text style={[styles.signOutText, { color: theme.textMuted }]}>
                      Sign out
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.signInPromptRow}>
                <View style={[styles.signInIconWrap, { backgroundColor: theme.primary + "14" }]}>
                  <Feather name="user" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: theme.text }]}>
                    Sign in required
                  </Text>
                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                    Sign in to use BhaashAI.
                  </Text>
                </View>
              </View>
              {/* Google sign-in only works on web; phones use email sign-in on the welcome screen. */}
              {Platform.OS === "web" && (
                <Pressable
                  onPress={handleSignIn}
                  disabled={signingIn}
                  style={({ pressed }) => [
                    styles.googleBtn,
                    { backgroundColor: pressed ? "#f5f5f5" : "#fff", borderColor: theme.border, opacity: signingIn ? 0.7 : 1 },
                  ]}
                >
                  {signingIn ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Feather name="log-in" size={16} color="#4285F4" />
                      <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Wallet */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          WALLET
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.walletHeader}>
            <View>
              <Text style={[styles.walletLabel, { color: theme.textMuted }]}>
                Wallet Balance
              </Text>
              <Text style={[styles.walletAmount, { color: creditColor }]}>
                ₹{credits.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.walletIcon, { backgroundColor: creditColor + "18" }]}>
              <Feather name="credit-card" size={22} color={creditColor} />
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct * 100}%` as any, backgroundColor: creditColor },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
              Remaining: ₹{credits.toFixed(2)}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
              Total loaded: ₹{totalEver.toFixed(2)}
            </Text>
          </View>

          {credits < 5 && credits > 0 && (
            <View style={[styles.lowBanner, { backgroundColor: "#FFF0E0", borderColor: "#D4764A40" }]}>
              <Feather name="alert-triangle" size={13} color="#B8653F" />
              <Text style={[styles.lowBannerText, { color: "#B8653F" }]}>
                Low balance — consider adding credits
              </Text>
            </View>
          )}
          {credits < 0.01 && (
            <View style={[styles.lowBanner, { backgroundColor: theme.error + "12", borderColor: theme.error + "30" }]}>
              <Feather name="alert-triangle" size={13} color={theme.error} />
              <Text style={[styles.lowBannerText, { color: theme.error }]}>
                No credits remaining
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => router.push("/topup")}
            style={[styles.addCreditsBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus-circle" size={15} color="#fff" />
            <Text style={styles.addCreditsBtnText}>Add Credits</Text>
          </Pressable>
        </View>

        {/* Usage Stats */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          USAGE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.statGrid}>
            <View style={[styles.statCell, { borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {(stats?.charsTranslated ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                Chars Translated
              </Text>
            </View>
            <View style={[styles.statCell, { borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {(stats?.charsTTS ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                Chars Spoken
              </Text>
            </View>
            <View style={[styles.statCell, { borderColor: theme.border, borderRightWidth: 0 }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {((stats?.secondsSTT ?? 0) / 60).toFixed(1)} min
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                Voice Input
              </Text>
            </View>
          </View>
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
                      backgroundColor: active ? theme.primary : theme.surfaceSecondary,
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

        {/* TTS Provider */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          TTS PROVIDER
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: theme.text }]}>Text-to-Speech Engine</Text>
          <View style={styles.themeRow}>
            {(["sarvam", "elevenlabs"] as const).map((provider) => {
              const active = ttsProvider === provider;
              return (
                <Pressable
                  key={provider}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setTTSProvider(provider);
                  }}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: active ? theme.primary : theme.surfaceSecondary,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={provider === "elevenlabs" ? "zap" : "volume-2"}
                    size={15}
                    color={active ? "#fff" : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: active ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {provider === "elevenlabs" ? "ElevenLabs (Premium)" : "Sarvam (Standard)"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.providerNote, { color: theme.textMuted }]}>
            ElevenLabs offers higher quality voices.{'\n'}
            Unsupported languages fall back to Sarvam.
          </Text>
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
    borderRadius: 20,
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
  avatarFallback: {
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
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
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  walletAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  lowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  lowBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9A3412",
  },
  addCreditsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 4,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  addCreditsBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  statGrid: {
    flexDirection: "row",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  rateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  rateLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  rateValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rateNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  rateNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
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
    borderRadius: 14,
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
  providerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 4,
  },
});
