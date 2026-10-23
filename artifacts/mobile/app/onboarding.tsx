import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { WELCOME_CREDIT_INR } from "@/constants/pricing";

const { width: SCREEN_W } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_completed";

interface Slide {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: "s1",
    icon: "mic",
    title: "Speak Hindi,\nthey hear Tamil",
    subtitle:
      "Two people, two languages, one phone. BhaashAI translates both ways across 11 Indian languages and speaks it aloud.",
  },
  {
    id: "s2",
    icon: "check-circle",
    title: "Every number,\nchecked",
    subtitle:
      "Translators slip on times, doses and amounts — \"पौने नौ\" becomes 9:45. BhaashAI checks every number before speaking it, and warns you when one doesn't match.",
  },
  {
    id: "s3",
    icon: "zap",
    title: `Start with\n₹${WELCOME_CREDIT_INR} free`,
    subtitle:
      "Create a free account and get credit to try everything. You pay only for what you use — no subscription.",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const skip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#FFF8F0", "#FFEDE0", "#FFE0CC"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

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
          <Animated.View style={[styles.slide, { width: SCREEN_W, opacity: fadeAnim }]}>
            <View style={styles.iconCircle}>
              <Feather name={item.icon} size={52} color="#D4764A" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            {item.id === "s3" && (
              <View style={styles.creditsRow}>
                <View style={styles.creditBadge}>
                  <Feather name="zap" size={14} color="#84A98C" />
                  <Text style={styles.creditBadgeText}>₹{WELCOME_CREDIT_INR} free credit</Text>
                </View>
                <Text style={styles.creditDetail}>Translate · Voice · Conversation</Text>
              </View>
            )}
          </Animated.View>
        )}
      />

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

      <View style={styles.footer}>
        <Pressable
          onPress={isLastSlide ? finish : next}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? "Get started" : "Next"}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.btnText}>
            {isLastSlide ? "Get Started" : "Next"}
          </Text>
          <Feather
            name={isLastSlide ? "arrow-right" : "arrow-right"}
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
    color: "#B8A9A0",
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
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E0",
    marginBottom: 12,
    shadowColor: "#D4764A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#0D1B2A",
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 23,
    paddingHorizontal: 8,
  },
  creditsRow: {
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  creditBadgeText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#84A98C",
  },
  creditDetail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#B8A9A0",
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
    width: 28,
    backgroundColor: "#D4764A",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#F0E4D8",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 8 : 24,
  },
  btn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
