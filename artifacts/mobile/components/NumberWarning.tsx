/**
 * Number check UI — green ✓ chips for every number the server confirmed in the
 * translation, and a warning when it couldn't confirm one or saw the rupee turn
 * into another currency (see artifacts/api-server/src/lib/number-check.ts).
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

// `verified` is absent on responses from before the server reported it.
export function VerifiedNumbers({ check, color }: { check?: NumberCheck; color: string }) {
  if (!check?.verified?.length) return null;
  return (
    <View style={styles.chips} accessibilityLabel={`Numbers checked: ${check.verified.join(", ")}`}>
      {check.verified.map((label, i) => (
        <View key={`${i}-${label}`} style={[styles.chip, { borderColor: color }]}>
          <Feather name="check" size={11} color={color} />
          <Text style={[styles.chipText, { color }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function NumberStatus({ check, okColor, warnColor }: { check?: NumberCheck; okColor: string; warnColor: string }) {
  return (
    <>
      <VerifiedNumbers check={check} color={okColor} />
      <NumberWarning check={check} color={warnColor} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginTop: 8 },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
});
