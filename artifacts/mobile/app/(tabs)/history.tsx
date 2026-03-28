import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebase";

interface Transaction {
  id: string;
  type: "translate" | "tts" | "stt" | "transliterate" | "topup";
  userCharged: number;
  chars?: number | null;
  seconds?: number | null;
  sourceLang?: string | null;
  targetLang?: string | null;
  note?: string;
  timestamp: { seconds: number } | null;
}

function relativeTime(ts: { seconds: number } | null): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts.seconds * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  return `${diffDay} days ago`;
}

function displayAmount(amt: number): string {
  const abs = Math.abs(amt);
  return abs < 0.01 ? abs.toFixed(4) : abs.toFixed(2);
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  translate:     { icon: "globe",      label: "Translation"  },
  tts:           { icon: "volume-2",   label: "Voice Output" },
  stt:           { icon: "mic",        label: "Voice Input"  },
  transliterate: { icon: "type",       label: "Transliteration" },
  topup:         { icon: "plus-circle", label: "Credits Added" },
};

export default function HistoryScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "transactions"),
      where("uid", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Transaction[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Transaction, "id">),
        }));
        setTransactions(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [user?.uid]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isTopup = item.type === "topup";
    const meta = TYPE_META[item.type] ?? TYPE_META.translate;
    const amtColor = isTopup ? "#16A34A" : "#DC2626";
    const prefix = isTopup ? "+" : "-";
    const amt = displayAmount(item.userCharged);

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: amtColor + "14" }]}>
          <Feather
            name={meta.icon as keyof typeof Feather.glyphMap}
            size={18}
            color={amtColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {item.note ?? meta.label}
          </Text>
          <Text style={[styles.rowSub, { color: theme.textMuted }]}>
            {item.chars != null
              ? `${item.chars.toLocaleString()} chars`
              : item.seconds != null
              ? `${item.seconds.toFixed(1)}s`
              : ""}
            {item.chars != null || item.seconds != null ? " · " : ""}
            {relativeTime(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.rowAmt, { color: amtColor }]}>
          {prefix}₹{amt}
        </Text>
      </View>
    );
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
        <Pressable
          onPress={() => router.push("/topup")}
          style={[styles.addBtn, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "40" }]}
        >
          <Feather name="plus" size={14} color={theme.primary} />
          <Text style={[styles.addBtnText, { color: theme.primary }]}>Add Credits</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
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
              <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceSecondary }]}>
                <Feather name="clock" size={28} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Your credit activity will appear here
              </Text>
            </View>
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rowAmt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  empty: {
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
});
