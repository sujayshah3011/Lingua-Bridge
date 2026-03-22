/**
 * Onboarding — 3-screen carousel shown on first app launch.
 *
 * Screens:
 *  1. Speak any Indian language
 *  2. Instant real-time translation
 *  3. Enter your Sarvam API key
 *
 * Stores `onboarding_completed` in AsyncStorage on finish.
 * Root layout checks this flag and redirects here if false.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";

const { width: SCREEN_W } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_completed";

interface Slide {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  isApiSlide?: boolean;
}

const SLIDES: Slide[] = [
  {
    id: "s1",
    icon: "mic",
    iconColor: "#FF6B00",
    title: "Speak any\nIndian language",
    subtitle:
      "BhaashAI listens to you in real time and translates across all 22 official Indian languages plus English.",
  },
  {
    id: "s2",
    icon: "globe",
    iconColor: "#2B7A0B",
    title: "Instant real-time\ntranslation",
    subtitle:
      "Powered by Sarvam AI — purpose-built for Indian languages with native script, transliteration, and natural voice output.",
  },
  {
    id: "s3",
    icon: "key",
    iconColor: "#0D1B2A",
    title: "Enter your\nSarvam API key",
    subtitle:
      "Get a free key at sarvam.ai. Your key is stored securely on your device and never sent anywhere else.",
    isApiSlide: true,
  },
];

export default function OnboardingScreen() {
  const { setApiKey } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const finish = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      if (keyInput.trim()) {
        await setApiKey(keyInput.trim());
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      router.replace("/(tabs)");
    } catch {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      router.replace("/(tabs)");
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            {/* Icon circle */}
            <View style={[styles.iconCircle, { borderColor: item.iconColor }]}>
              <Feather name={item.icon} size={56} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            {/* API key input on last slide */}
            {item.isApiSlide && (
              <View style={styles.apiInputWrap}>
                <TextInput
                  style={styles.apiInput}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  placeholderTextColor="#9AA5B1"
                  value={keyInput}
                  onChangeText={setKeyInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={finish}
                  accessible
                  accessibilityLabel="Sarvam API key input"
                />
              </View>
            )}
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.footer}>
        <Pressable
          onPress={isLastSlide ? finish : next}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? "Get started" : "Next"}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed || saving ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.btnText}>
            {isLastSlide ? (saving ? "Saving…" : "Get Started") : "Next"}
          </Text>
          <Feather
            name={isLastSlide ? "check" : "arrow-right"}
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: "#9AA5B1",
    fontFamily: "Inter_500Medium",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#0D1B2A",
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 24,
  },
  apiInputWrap: {
    width: "100%",
    marginTop: 8,
  },
  apiInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0D1B2A",
    backgroundColor: "#F8F9FA",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#FF6B00",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#E2E8F0",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 8 : 24,
  },
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
