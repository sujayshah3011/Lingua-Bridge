/**
 * AgreedSummary — "What we agreed": every turn of a conversation that carried a
 * number, in both languages, with what the server's number check confirmed.
 * Shared as plain text (WhatsApp etc.) so the other person keeps a record.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import type { Message } from "@/components/ConversationBubble";
import { NumberStatus } from "@/components/NumberWarning";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { scheduleReminderCall } from "@/services/reminder";

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

// The patient is speaker A. A reminder call reads only verified turns, each in the
// patient's language: their own words (with numbers as digits) or the translation
// of what staff said.
export const reminderLines = (items: Message[]) =>
  items
    .filter((m) => m.numberCheck?.ok)
    .map((m) => (m.speaker === "A" ? m.normalizedInput ?? m.original : m.translated));

function tomorrowAt10(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function ReminderCall({ lines }: { lines: string[] }) {
  const { theme } = useTheme();
  const { setCredits } = useApp();
  const [digits, setDigits] = useState("");
  const [when, setWhen] = useState<"tomorrow" | "now">("tomorrow");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const validPhone = /^[6-9]\d{9}$/.test(digits);

  const send = async () => {
    setSending(true);
    try {
      const at = when === "tomorrow" ? tomorrowAt10() : undefined;
      const { credits } = await scheduleReminderCall({
        phone: `+91${digits}`,
        lines,
        consent,
        scheduledAt: at?.toISOString(),
      });
      if (typeof credits === "number") setCredits(credits);
      Alert.alert(
        "Reminder call booked",
        at
          ? `The patient will get a call in Hindi on ${at.toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`
          : "The patient will get a call in Hindi in a moment."
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      Alert.alert("Call not booked", msg === "INSUFFICIENT_CREDITS" ? "Not enough credits for a reminder call." : msg || "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.callBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.callTitle, { color: theme.text }]}>Remind the patient by phone</Text>
      <Text style={[styles.callHint, { color: theme.textMuted }]}>
        A voice agent calls in Hindi and reads the {lines.length} checked {lines.length === 1 ? "item" : "items"} above, word for word.
      </Text>
      <View style={[styles.phoneRow, { borderColor: theme.border }]}>
        <Text style={[styles.prefix, { color: theme.textSecondary }]}>+91</Text>
        <TextInput
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/\D/g, "").slice(0, 10))}
          placeholder="Patient's mobile number"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          style={[styles.phoneInput, { color: theme.text }]}
          accessibilityLabel="Patient's mobile number"
        />
      </View>
      <View style={styles.whenRow}>
        {(["tomorrow", "now"] as const).map((w) => (
          <Pressable
            key={w}
            onPress={() => setWhen(w)}
            style={[styles.whenChip, { borderColor: when === w ? theme.primary : theme.border }]}
            accessibilityState={{ selected: when === w }}
          >
            <Text style={{ color: when === w ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
              {w === "tomorrow" ? "Tomorrow 10:00 AM" : "Call now"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => setConsent((c) => !c)}
        style={styles.consentRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
      >
        <Feather name={consent ? "check-square" : "square"} size={18} color={consent ? theme.primary : theme.textMuted} />
        <Text style={[styles.consentText, { color: theme.textSecondary }]}>The patient agreed to receive this call</Text>
      </Pressable>
      <Pressable
        onPress={send}
        disabled={!validPhone || !consent || sending}
        style={({ pressed }) => [
          styles.callBtn,
          { backgroundColor: theme.terracotta, opacity: !validPhone || !consent ? 0.4 : pressed ? 0.8 : 1 },
        ]}
      >
        {sending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="phone-call" size={16} color="#FFFFFF" />
            <Text style={styles.shareText}>Book reminder call · ₹10</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
  patientLang: string;
}

export function AgreedSummary({ visible, onClose, messages, patientLang }: Props) {
  const { theme } = useTheme();
  const items = messages.filter(hasNumbers);
  // The reminder agent speaks Hindi only.
  const lines = patientLang === "hi-IN" ? reminderLines(items) : [];

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
          {lines.length > 0 && <ReminderCall lines={lines} />}
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
  callBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  callTitle: { fontSize: 16, fontWeight: "700" },
  callHint: { fontSize: 13, lineHeight: 18 },
  phoneRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  prefix: { fontSize: 16, marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  whenRow: { flexDirection: "row", gap: 8 },
  whenChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  consentText: { flex: 1, fontSize: 13 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
