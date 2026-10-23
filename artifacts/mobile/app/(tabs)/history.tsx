/**
 * Records — every Clinic conversation, saved on this phone as it happens
 * (services/consultations.ts). Tap one to reopen "What we agreed": share it or
 * book the reminder call. Credit activity lives on the Usage screen.
 */

import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgreedSummary, hasNumbers } from "@/components/AgreedSummary";
import { VerifiedNumbers } from "@/components/NumberWarning";
import { WarmStateCard } from "@/components/ui/WarmStateCard";
import { LANGUAGES } from "@/constants/languages";
import { useTheme } from "@/hooks/useTheme";
import { Consultation, deleteConsultation, loadConsultations } from "@/services/consultations";

const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

function when(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

export default function RecordsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<Consultation[]>([]);
  const [open, setOpen] = useState<Consultation | null>(null);
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  // Reload every time the tab is shown: Clinic saves while you talk.
  useFocusEffect(
    useCallback(() => {
      loadConsultations().then(setRecords);
    }, [])
  );

  const confirmDelete = (c: Consultation) =>
    Alert.alert("Delete this record?", "It's only stored on this phone and can't be recovered.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteConsultation(c.id).then(() => setRecords((r) => r.filter((x) => x.id !== c.id))),
      },
    ]);

  const renderItem = ({ item }: { item: Consultation }) => {
    const numbered = item.messages.filter(hasNumbers);
    const verified = numbered.flatMap((m) => m.numberCheck?.verified ?? []);
    const toConfirm = numbered.filter((m) => m.numberCheck?.ok === false).length;
    return (
      <Pressable
        onPress={() => setOpen(item)}
        onLongPress={() => confirmDelete(item)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityHint="Opens what was agreed. Long-press to delete."
      >
        <View style={styles.cardTop}>
          <Text style={[styles.when, { color: theme.textMuted }]}>{when(item.startedAt)}</Text>
          <View style={[styles.langPill, { backgroundColor: theme.primary + "12" }]}>
            <Text style={[styles.langText, { color: theme.primary }]}>
              {langName(item.langA)} ↔ {langName(item.langB)}
            </Text>
          </View>
        </View>
        <Text style={[styles.first, { color: theme.text }]} numberOfLines={2}>
          {item.messages[0]?.original}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {item.messages.length} {item.messages.length === 1 ? "turn" : "turns"}
          {toConfirm ? `  ·  ${toConfirm} to confirm` : ""}
        </Text>
        <VerifiedNumbers check={verified.length ? { ok: true, missing: [], verified: verified.slice(0, 6), wrongCurrency: false, backTranslated: false } : undefined} color={theme.success} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Records</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Every clinic conversation, saved on this phone</Text>
      </View>
      <FlatList
        data={records}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 84 }]}
        ListEmptyComponent={
          <WarmStateCard
            icon="message-square"
            title="No conversations yet"
            subtitle="Your clinic conversations will appear here, with every checked number."
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <AgreedSummary
        visible={!!open}
        onClose={() => setOpen(null)}
        messages={open?.messages ?? []}
        patientLang={open?.langA ?? ""}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  when: { fontSize: 12, fontFamily: "Inter_500Medium" },
  langPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  langText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  first: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
});
