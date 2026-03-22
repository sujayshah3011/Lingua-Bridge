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

import { getLanguageByCode } from "@/constants/languages";
import { useTheme } from "@/hooks/useTheme";

interface TranslationOutputProps {
  translatedText: string;
  transliteratedText?: string;
  isLoading: boolean;
  detectedLang?: string;
  showTransliteration: boolean;
  targetLang: string;
  onCopy?: () => void;
}

export function TranslationOutput({
  translatedText,
  transliteratedText,
  isLoading,
  detectedLang,
  showTransliteration,
  targetLang,
  onCopy,
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

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surfaceSecondary : theme.surface,
          borderColor: theme.border,
        },
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
            {showTransliteration && !!transliteratedText && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text
                  style={[
                    styles.transliteratedText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {transliteratedText}
                </Text>
              </Animated.View>
            )}
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
  transliteratedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 20,
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
