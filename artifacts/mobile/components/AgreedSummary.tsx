/**
 * AgreedSummary — "What we agreed": every turn of a conversation that carried a
 * number, in both languages, with what the server's number check confirmed.
 * Shared as plain text (WhatsApp etc.) so the other person keeps a record.
 */

import React from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import type { Message } from "@/components/ConversationBubble";
import { NumberStatus } from "@/components/NumberWarning";
import { useTheme } from "@/hooks/useTheme";

// A turn belongs in the summary if the check found numbers in it (or flagged it).
export const hasNumbers = (m: Message) =>
  !!m.numberCheck && (!!m.numberCheck.verified?.length || !m.numberCheck.ok);

const stamp = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function summaryText(items: Message[]): string {
  const lines = items.map((m, i) => {
    const c = m.numberCheck!;
    const status = c.ok
      ? `✓ ${c.verified?.join(", ")}`
      : `⚠ not confirmed: ${[...c.missing, ...(c.wrongCurrency ? ["currency"] : [])].join(", ")}`;
    return `${i + 1}. ${m.original}\n   ${m.translated}\n   ${status}`;
  });
  return [
    `BhaashAI — what we agreed (${stamp(items[0]?.timestamp ?? Date.now())})`,
    ...lines,
    "Numbers marked ✓ were checked by BhaashAI in both languages. Please confirm any ⚠ item in person.",
  ].join("\n\n");
}

interface Props {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
}

export function AgreedSummary({ visible, onClose, messages }: Props) {
  const { theme } = useTheme();
  const items = messages.filter(hasNumbers);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>What we agreed</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {items.length ? stamp(items[0]!.timestamp) : "No numbers yet"}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Close summary" style={styles.iconBtn}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {items.map((m, i) => (
            <View key={m.id} style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.index, { color: theme.textMuted }]}>
                {i + 1} · {m.sourceLangLabel} → {m.targetLangLabel}
              </Text>
              <Text style={[styles.original, { color: theme.text }]}>{m.original}</Text>
              <Text style={[styles.translated, { color: theme.textSecondary }]}>{m.translated}</Text>
              <NumberStatus check={m.numberCheck} okColor={theme.success} warnColor={theme.amber} />
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={() => Share.share({ message: summaryText(items) })}
          disabled={!items.length}
          style={({ pressed }) => [
            styles.shareBtn,
            { backgroundColor: theme.primary, opacity: !items.length ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="share-2" size={18} color="#FFFFFF" />
          <Text style={styles.shareText}>Share summary</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 4 },
  list: { padding: 16, gap: 12 },
  item: { borderWidth: 1, borderRadius: 14, padding: 14 },
  index: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  original: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  translated: { fontSize: 15, lineHeight: 21, marginTop: 4 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
