import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { tintedShadow } from "@/constants/colors";
import { getLanguageByCode } from "@/constants/languages";
import { useTheme } from "@/hooks/useTheme";

interface TranslationOutputProps {
  translatedText: string;
  isLoading: boolean;
  detectedLang?: string;
  targetLang: string;
  onCopy?: () => void;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}

export function TranslationOutput({
  translatedText,
  isLoading,
  detectedLang,
  targetLang,
  onCopy,
  onSpeak,
  isSpeaking = false,
}: TranslationOutputProps) {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const targetLangData = getLanguageByCode(targetLang);
  const detectedLangData = detectedLang ? getLanguageByCode(detectedLang) : null;

  const handleCopy = async () => {
    if (!translatedText) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(translatedText);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!translatedText) return;
    if (Platform.OS === "web") return;
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(translatedText, {
        dialogTitle: "Share Translation",
        UTI: "public.plain-text",
        mimeType: "text/plain",
      } as Parameters<typeof Sharing.shareAsync>[1]);
    }
  };

  const handleSpeak = async () => {
    if (!translatedText || !onSpeak) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSpeak();
  };

  const cardShadow = tintedShadow(
    isDark ? theme.primary : theme.primary,
    isDark ? 0.1 : 0.07,
    14
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surfaceSecondary : theme.surface,
          borderColor: isDark ? theme.border : "#F0E4D8",
        },
        cardShadow,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.langBadge}>
          <View
            style={[styles.langDot, { backgroundColor: theme.primary }]}
          />
          <Text style={[styles.langLabel, { color: theme.textSecondary }]}>
            {targetLangData?.name ?? targetLang}
          </Text>
          {targetLangData?.nativeName && (
            <Text style={[styles.nativeLabel, { color: theme.textMuted }]}>
              · {targetLangData.nativeName}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          {/* Speak button — hidden on web where file system TTS isn't available */}
          {Platform.OS !== "web" && !!translatedText && !!onSpeak && (
            <Pressable
              onPress={handleSpeak}
              hitSlop={12}
              disabled={isSpeaking}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: isSpeaking
                    ? theme.primary + "20"
                    : theme.surfaceSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {isSpeaking ? (
                <ActivityIndicator size={14} color={theme.primary} />
              ) : (
                <Feather name="volume-2" size={15} color={theme.primary} />
              )}
            </Pressable>
          )}
          <Pressable
            onPress={handleCopy}
            hitSlop={12}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: copied
                  ? theme.success + "20"
                  : theme.surfaceSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name={copied ? "check" : "copy"}
              size={15}
              color={copied ? theme.success : theme.textSecondary}
            />
          </Pressable>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={handleShare}
              hitSlop={12}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.surfaceSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="share-2" size={15} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.textArea}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.primary} size="small" />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Translating...
            </Text>
          </View>
        ) : translatedText ? (
          <Animated.View entering={FadeInDown.duration(250).springify()}>
            <Text
              style={[
                styles.translatedText,
                { color: theme.text },
              ]}
              selectable
            >
              {translatedText}
            </Text>
          </Animated.View>
        ) : (
          <Text style={[styles.placeholder, { color: theme.textMuted }]}>
            Translation will appear here...
          </Text>
        )}
      </View>

      {!!detectedLangData && !isLoading && !!translatedText && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.detectedRow, { borderTopColor: theme.border }]}
        >
          <Feather name="zap" size={11} color={theme.primary} />
          <Text style={[styles.detectedText, { color: theme.textMuted }]}>
            Detected: {detectedLangData.name} ({detectedLangData.nativeName})
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  langLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  nativeLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 80,
  },
  translatedText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 28,
  },
  placeholder: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  detectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detectedText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
