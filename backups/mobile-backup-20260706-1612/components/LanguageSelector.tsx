import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { getLanguageByCode } from "@/constants/languages";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

interface LanguageSelectorProps {
  onSelectSource: () => void;
  onSelectTarget: () => void;
}

export function LanguageSelector({
  onSelectSource,
  onSelectTarget,
}: LanguageSelectorProps) {
  const { sourceLang, targetLang, setSourceLang, setTargetLang, autoDetect } =
    useApp();
  const { theme } = useTheme();

  const rotate = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const handleSwap = async () => {
    if (autoDetect) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rotate.value = withSequence(
      withSpring(180, { damping: 10, stiffness: 180 }),
      withSpring(0, { duration: 0 })
    );
    const prev = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prev);
  };

  const sourceLangData = getLanguageByCode(sourceLang);
  const targetLangData = getLanguageByCode(targetLang);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onSelectSource}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.75 : 1,
            flex: 1,
          },
        ]}
      >
        <Text
          style={[styles.pillLabel, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {autoDetect ? "Auto Detect" : (sourceLangData?.name ?? sourceLang)}
        </Text>
        {autoDetect && (
          <Text style={[styles.pillSub, { color: theme.primary }]}>
            auto
          </Text>
        )}
        <Feather
          name="chevron-down"
          size={14}
          color={theme.textMuted}
          style={{ marginLeft: 2 }}
        />
      </Pressable>

      <Pressable
        onPress={handleSwap}
        style={[
          styles.swapBtn,
          {
            backgroundColor: autoDetect
              ? theme.surfaceSecondary
              : theme.primary,
            opacity: autoDetect ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View style={animStyle}>
          <Feather
            name="repeat"
            size={16}
            color={autoDetect ? theme.textMuted : "#fff"}
          />
        </Animated.View>
      </Pressable>

      <Pressable
        onPress={onSelectTarget}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.75 : 1,
            flex: 1,
          },
        ]}
      >
        <Text
          style={[styles.pillLabel, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {targetLangData?.name ?? targetLang}
        </Text>
        <Feather
          name="chevron-down"
          size={14}
          color={theme.textMuted}
          style={{ marginLeft: 2 }}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pillLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  pillSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
