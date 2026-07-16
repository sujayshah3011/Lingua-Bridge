import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { VoiceGender, SPEAKER_MAP, getSpeakerName } from "@/services/tts";
import { useTheme } from "@/hooks/useTheme";

interface VoiceSelectorProps {
  targetLang: string;
  gender: VoiceGender;
  onGenderChange: (gender: VoiceGender) => void;
}

export function VoiceSelector({
  targetLang,
  gender,
  onGenderChange,
}: VoiceSelectorProps) {
  const { theme } = useTheme();
  const speakerName = getSpeakerName(targetLang, gender);
  const hasBoth = !!SPEAKER_MAP[targetLang];

  if (!hasBoth) return null;

  return (
    <View style={styles.row}>
      <Feather name="mic" size={13} color={theme.textSecondary} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>Voice</Text>

      <Pressable
        onPress={() => onGenderChange("female")}
        accessibilityRole="button"
        accessibilityLabel="Female voice"
        accessibilityState={{ selected: gender === "female" }}
        style={[
          styles.pill,
          { borderColor: theme.primary },
          gender === "female" && { backgroundColor: theme.primary },
        ]}
      >
        <Text
          style={[
            styles.pillText,
            gender === "female"
              ? { color: "#fff" }
              : { color: theme.primary },
          ]}
        >
          Female
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onGenderChange("male")}
        accessibilityRole="button"
        accessibilityLabel="Male voice"
        accessibilityState={{ selected: gender === "male" }}
        style={[
          styles.pill,
          { borderColor: theme.primary },
          gender === "male" && { backgroundColor: theme.primary },
        ]}
      >
        <Text
          style={[
            styles.pillText,
            gender === "male"
              ? { color: "#fff" }
              : { color: theme.primary },
          ]}
        >
          Male
        </Text>
      </Pressable>

      <Text style={[styles.speakerName, { color: theme.textMuted }]}>
        {speakerName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginRight: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  speakerName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginLeft: 2,
  },
});
