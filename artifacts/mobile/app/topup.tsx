import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { USER_PRICE } from "@/constants/pricing";

interface Package {
  id: string;
  price: number;
  bonus: number;
  popular: boolean;
}

const PACKAGES: Package[] = [
  { id: "p99",  price: 99,  bonus: 0,   popular: false },
  { id: "p299", price: 299, bonus: 30,  popular: false },
  { id: "p599", price: 599, bonus: 90,  popular: true  },
  { id: "p999", price: 999, bonus: 200, popular: false },
];

function formatAmount(n: number): string {
  return Math.abs(n) < 0.01
    ? Math.abs(n).toFixed(4)
    : Math.abs(n).toFixed(2);
}

export default function TopUpScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [selected, setSelected] = useState<string>("p599");

  const selectedPkg = PACKAGES.find((p) => p.id === selected) ?? PACKAGES[2];
  const credits = selectedPkg.price + selectedPkg.bonus;

  const translateChars = Math.floor(credits / USER_PRICE.translate.perChar);
  const voiceMinutes = Math.floor(credits / USER_PRICE.stt.perSecond / 60);
  const ttsChars = Math.floor(credits / USER_PRICE.tts.perChar);

  const handleBuy = () => {
    Alert.alert(
      "Coming Soon",
      "In-app purchases will be available in the next update. Contact us to manually top up your balance.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          SELECT PACKAGE
        </Text>

        {PACKAGES.map((pkg) => {
          const total = pkg.price + pkg.bonus;
          const isActive = selected === pkg.id;
          return (
            <Pressable
              key={pkg.id}
              onPress={() => setSelected(pkg.id)}
              style={[
                styles.pkgCard,
                {
                  backgroundColor: isActive
                    ? theme.primary + "10"
                    : theme.surface,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
            >
              {pkg.popular && (
                <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              <View style={styles.pkgRow}>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isActive ? theme.primary : theme.border },
                  ]}
                >
                  {isActive && (
                    <View
                      style={[styles.radioInner, { backgroundColor: theme.primary }]}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pkgTitle, { color: theme.text }]}>
                    ₹{pkg.price}
                  </Text>
                  {pkg.bonus > 0 && (
                    <Text style={[styles.pkgBonus, { color: theme.primary }]}>
                      +₹{pkg.bonus} bonus ({Math.round((pkg.bonus / pkg.price) * 100)}%)
                    </Text>
                  )}
                </View>
                <View style={styles.pkgCredits}>
                  <Text style={[styles.pkgCreditsAmt, { color: isActive ? theme.primary : theme.text }]}>
                    ₹{total}
                  </Text>
                  <Text style={[styles.pkgCreditsLabel, { color: theme.textMuted }]}>
                    credits
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={[styles.whatCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.whatTitle, { color: theme.text }]}>
            What can you do with ₹{credits}?
          </Text>
          <View style={styles.whatRow}>
            <Feather name="globe" size={15} color={theme.primary} />
            <Text style={[styles.whatText, { color: theme.textSecondary }]}>
              Translate{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>
                {translateChars.toLocaleString()} chars
              </Text>
            </Text>
          </View>
          <View style={styles.whatRow}>
            <Feather name="mic" size={15} color={theme.primary} />
            <Text style={[styles.whatText, { color: theme.textSecondary }]}>
              Voice input for{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>
                {voiceMinutes} minutes
              </Text>
            </Text>
          </View>
          <View style={styles.whatRow}>
            <Feather name="volume-2" size={15} color={theme.primary} />
            <Text style={[styles.whatText, { color: theme.textSecondary }]}>
              Speak{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>
                {ttsChars.toLocaleString()} chars
              </Text>
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleBuy}
          style={({ pressed }) => [
            styles.buyBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="credit-card" size={18} color="#fff" />
          <Text style={styles.buyBtnText}>
            Get ₹{selectedPkg.price + selectedPkg.bonus} credits for ₹{selectedPkg.price}
          </Text>
        </Pressable>

        <Text style={[styles.note, { color: theme.textMuted }]}>
          Credits never expire. Secure payment powered by Razorpay.
        </Text>
      </ScrollView>
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
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 4,
    marginLeft: 4,
  },
  pkgCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: 0.4,
  },
  pkgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pkgTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  pkgBonus: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  pkgCredits: {
    alignItems: "flex-end",
  },
  pkgCreditsAmt: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  pkgCreditsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  whatCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  whatTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  whatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  whatText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 8,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  buyBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
  },
});
