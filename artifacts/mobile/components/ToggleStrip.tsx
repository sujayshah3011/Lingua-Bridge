import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

export function ToggleStrip() {
  const { formalMode, setFormalMode, transliteration, setTransliteration, autoDetect, setAutoDetect } =
    useApp();
  const { theme } = useTheme();

  const switchTrackFalse = theme.border;
  const switchTrackTrue = theme.primary;

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.item}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {formalMode ? "Formal" : "Colloquial"}
        </Text>
        <Switch
          value={formalMode}
          onValueChange={setFormalMode}
          trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
          thumbColor={Platform.OS === "android" ? (formalMode ? "#fff" : "#fff") : undefined}
          ios_backgroundColor={switchTrackFalse}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.item}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Transliterate
        </Text>
        <Switch
          value={transliteration}
          onValueChange={setTransliteration}
          trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
          thumbColor={Platform.OS === "android" ? "#fff" : undefined}
          ios_backgroundColor={switchTrackFalse}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.item}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Auto Detect
        </Text>
        <Switch
          value={autoDetect}
          onValueChange={setAutoDetect}
          trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
          thumbColor={Platform.OS === "android" ? "#fff" : undefined}
          ios_backgroundColor={switchTrackFalse}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: 4,
  },
});
