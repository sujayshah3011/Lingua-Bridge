/**
 * Usage — balance, what each action costs, and recent credit activity.
 * (Route stays /topup: the credit pill on every screen opens it.)
 * In-app payments aren't built; pilot accounts run on the welcome credit.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { USER_PRICE, WELCOME_CREDIT_INR } from "@/constants/pricing";
import { SpendRow, useSpendLog } from "@/components/SpendLog";
import { WarmStateCard } from "@/components/ui/WarmStateCard";

// Same figures the server charges (artifacts/api-server/src/lib/pricing.ts and
// routes/reminder.ts), shown per typical unit.
const COSTS: { icon: keyof typeof Feather.glyphMap; label: string; price: string }[] = [
  { icon: "mic", label: "Speech recognition", price: `₹${(USER_PRICE.stt.perSecond * 10).toFixed(2)} per 10 s` },
  { icon: "globe", label: "Translation + number check", price: `₹${(USER_PRICE.translate.perChar * 100).toFixed(2)} per 100 chars` },
  { icon: "volume-2", label: "Voice output", price: `₹${(USER_PRICE.tts.perChar * 100).toFixed(2)} per 100 chars` },
  { icon: "phone-call", label: "Reminder call", price: "₹10 per call" },
];

export default function UsageScreen() {
  const { credits, user } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading } = useSpendLog(user?.uid);

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.caption, { color: theme.textMuted }]}>BALANCE</Text>
        <Text style={[styles.balance, { color: theme.text }]}>₹{credits.toFixed(2)}</Text>
        <Text style={[styles.pilot, { color: theme.sage }]}>₹{WELCOME_CREDIT_INR} free pilot credit on sign-up</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>What things cost</Text>
        {COSTS.map((c) => (
          <View key={c.label} style={styles.costRow}>
            <Feather name={c.icon} size={16} color={theme.primary} />
            <Text style={[styles.costLabel, { color: theme.textSecondary }]}>{c.label}</Text>
            <Text style={[styles.costPrice, { color: theme.text }]}>{c.price}</Text>
          </View>
        ))}
        <Text style={[styles.note, { color: theme.textMuted }]}>
          A typical clinic conversation turn costs under ₹1. Failed requests are refunded automatically.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cream, borderColor: theme.primary + "30" }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>For clinics</Text>
        <Text style={[styles.note, { color: theme.textSecondary, marginTop: 0 }]}>
          Per-consultation pricing for clinics and hospitals. In-app payments aren't available yet.
          Contact us to add credit or set up your clinic.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>RECENT ACTIVITY</Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      data={items}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => <SpendRow item={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <WarmStateCard icon="clock" title="Loading activity..." loading />
        ) : (
          <WarmStateCard icon="clock" title="No activity yet" subtitle="Every charge and refund will appear here." />
        )
      }
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  headerBlock: { gap: 12, marginBottom: 4 },
  balanceCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  caption: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  balance: { fontSize: 34, fontFamily: "Inter_700Bold", marginTop: 4 },
  pilot: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  costRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  costLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  costPrice: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 4 },
});
