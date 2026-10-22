/**
 * NumberWarning — shown under a translation when the server's number check
 * couldn't confirm every number, or saw the rupee turn into another currency
 * (see artifacts/api-server/src/lib/number-check.ts).
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { NumberCheck } from "@/services/sarvam";

export function numberWarningText(check?: NumberCheck): string | null {
  if (!check || check.ok) return null;
  const parts: string[] = [];
  if (check.missing.length) parts.push(`Couldn't confirm ${check.missing.join(", ")} in the translation`);
  if (check.wrongCurrency) parts.push("the currency may have changed from rupees");
  return `${parts.join("; ")}. Please confirm with the speaker.`;
}

export function NumberWarning({ check, color }: { check?: NumberCheck; color: string }) {
  const text = numberWarningText(check);
  if (!text) return null;
  return (
    <View style={styles.row} accessibilityRole="alert">
      <Feather name="alert-triangle" size={14} color={color} style={styles.icon} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginTop: 8 },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
