import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";

const MAX_CHARS = 1000;

interface TranslatorInputProps {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function TranslatorInput({
  value,
  onChange,
  onClear,
}: TranslatorInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: isOverLimit ? theme.error : theme.border,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          if (t.length <= MAX_CHARS + 50) onChange(t);
        }}
        placeholder="Type or paste text here..."
        placeholderTextColor={theme.textMuted}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          {
            color: isOverLimit ? theme.error : theme.text,
            fontFamily: "Inter_400Regular",
          },
        ]}
        scrollEnabled={false}
        maxLength={MAX_CHARS + 50}
      />

      <View style={styles.footer}>
        <Text
          style={[
            styles.charCount,
            { color: isOverLimit ? theme.error : theme.textMuted },
          ]}
        >
          {charCount}/{MAX_CHARS}
        </Text>
        {value.length > 0 && (
          <Pressable onPress={onClear} hitSlop={12} style={styles.clearBtn}>
            <Feather name="x-circle" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 140,
    overflow: "hidden",
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    paddingBottom: 8,
    minHeight: 110,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  clearBtn: {
    padding: 2,
  },
});
