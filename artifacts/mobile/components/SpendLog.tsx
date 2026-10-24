/**
 * SpendLog — the user's recent credit activity (Firestore `transactions`, written
 * by the API server on every charge and refund). Shown on the Usage screen.
 */

import { Feather } from "@expo/vector-icons";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebase";

export interface Transaction {
  id: string;
  type: string;
  userCharged: number;
  chars?: number | null;
  seconds?: number | null;
  note?: string;
  timestamp: { seconds: number } | null;
}

function relativeTime(ts: { seconds: number } | null): string {
  if (!ts) return "";
  const diffSec = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? "Yesterday" : `${diffDay} days ago`;
}

const displayAmount = (amt: number) => {
  const abs = Math.abs(amt);
  return abs < 0.01 ? abs.toFixed(4) : abs.toFixed(2);
};

const TYPE_META: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  translate: { icon: "globe", label: "Translation" },
  tts: { icon: "volume-2", label: "Voice output" },
  tts_elevenlabs: { icon: "volume-2", label: "Voice output" },
  stt: { icon: "mic", label: "Speech recognition" },
  transliterate: { icon: "type", label: "Transliteration" },
  reminder_call: { icon: "phone-call", label: "Reminder call" },
  topup: { icon: "plus-circle", label: "Credits added" },
};

// Refunds are recorded as "refund_<type>" with a negative charge.
const metaFor = (type: string) =>
  type.startsWith("refund_")
    ? { icon: "rotate-ccw" as const, label: `Refund · ${TYPE_META[type.slice(7)]?.label ?? "charge"}` }
    : TYPE_META[type] ?? TYPE_META["translate"]!;

export function useSpendLog(uid: string | undefined) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "transactions"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) })));
        setLoading(false);
      },
      (err) => {
        // Needs the composite index in firestore.indexes.json; without it the
        // query fails and the list looked empty with no clue why.
        console.warn("[SpendLog] query failed:", err.message);
        setLoading(false);
      }
    );
  }, [uid]);

  return { items, loading };
}

export function SpendRow({ item }: { item: Transaction }) {
  const { theme } = useTheme();
  const credit = item.userCharged < 0;
  const meta = metaFor(item.type);
  const color = credit ? "#16A34A" : "#DC2626";
  const detail =
    item.chars != null ? `${item.chars.toLocaleString()} chars · ` : item.seconds != null ? `${item.seconds.toFixed(1)}s · ` : "";

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "14" }]}>
        <Feather name={meta.icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        {/* Refunds carry a server-side note ("Upstream call failed after charge"); show "Refund · …" instead. */}
        <Text style={[styles.label, { color: theme.text }]}>
          {item.type.startsWith("refund_") ? meta.label : item.note ?? meta.label}
        </Text>
        <Text style={[styles.sub, { color: theme.textMuted }]}>
          {detail}
          {relativeTime(item.timestamp)}
        </Text>
      </View>
      <Text style={[styles.amt, { color }]}>
        {credit ? "+" : "-"}₹{displayAmount(item.userCharged)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amt: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
