import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

const FEATURES = [
  { icon: "globe" as const, label: "Translate" },
  { icon: "mic" as const, label: "Voice" },
  { icon: "message-square" as const, label: "Conversation" },
];

export function WelcomeScreen() {
  const { signIn } = useApp();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn();
      // success → onAuthStateChanged in AppContext handles navigation
    } catch (err: any) {
      if (err?.message === "EXPO_GO_LIMITATION") {
        Alert.alert(
          "Sign-in Unavailable Here",
          "Google Sign-In requires a production build.\n\n" +
            "The web preview (browser tab) works fine.\n" +
            "For mobile, install the APK from an EAS build.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Sign-in Failed",
          "Could not sign in with Google. Please try again.",
          [{ text: "OK" }]
        );
        if (__DEV__) console.error("[AUTH] Sign-in error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#FF6B00", "#7C2D8F", "#0A1628"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.top, { paddingTop: insets.top + 48 }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Feather name="globe" size={36} color="#FF6B00" />
          </View>
          <Text style={styles.logoText}>BhaashAI</Text>
          <Text style={styles.devanagari}>भाषा-AI</Text>
        </View>

        <Text style={styles.tagline}>
          Real-time translation across all 22{"\n"}official Indian languages
        </Text>

        <View style={styles.chips}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.chip}>
              <Feather name={f.icon} size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.chipText}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>22+</Text>
            <Text style={styles.statLabel}>Languages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>₹100</Text>
            <Text style={styles.statLabel}>Free Credits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>AI</Text>
            <Text style={styles.statLabel}>Powered</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.cardTitle}>Get started for free</Text>
        <Text style={styles.cardDesc}>
          Sign in with Google to receive ₹100 welcome credits — no credit card required.
        </Text>

        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [
            styles.googleBtn,
            { opacity: pressed || loading ? 0.8 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#202124" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  top: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  devanagari: {
    fontSize: 18,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  chips: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 36,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0A1628",
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#202124",
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  terms: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
