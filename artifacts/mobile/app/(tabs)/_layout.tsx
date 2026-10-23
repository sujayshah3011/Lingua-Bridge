import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useCallback } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

type IconName = React.ComponentProps<typeof Feather>["name"];

interface TabIcon {
  ios: string;
  feather: IconName;
}

const TABS: { name: string; label: string; icon: TabIcon }[] = [
  { name: "index", label: "Clinic", icon: { ios: "person.2", feather: "users" } },
  { name: "translate", label: "Translate", icon: { ios: "globe", feather: "globe" } },
  { name: "voice", label: "Voice", icon: { ios: "mic", feather: "mic" } },
  { name: "phrasebook", label: "Phrases", icon: { ios: "book", feather: "book-open" } },
  { name: "history", label: "Records", icon: { ios: "doc.text", feather: "file-text" } },
  { name: "settings", label: "Settings", icon: { ios: "gearshape", feather: "settings" } },
];

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Clinic</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Records</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="phrasebook">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Phrases</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="translate">
        <Icon sf={{ default: "globe", selected: "globe.fill" }} />
        <Label>Translate</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="voice" hidden>
        <Icon sf={{ default: "mic", selected: "mic.fill" }} />
        <Label>Voice</Label>
      </NativeTabs.Trigger>
      {/* Settings is reached from the gear on the Translate header. */}
      <NativeTabs.Trigger name="settings" hidden>
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AnimatedTabButton({
  children,
  onPress,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
}: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function ClassicTabLayout() {
  const { isDark } = useApp();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();

  const activeTint = "#FF6B00";
  const inactiveTint = isDark ? "#4A5568" : "#9AA5B1";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarButton: (props: any) => <AnimatedTabButton {...props} />,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#0A0F18" : "#fff",
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "#1E2A3A" : "#F0E4D8",
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          height: safeAreaInsets.bottom + 64,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#0A0F18" : "#fff" },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Clinic",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "person.2.fill" : "person.2"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="users" size={22} color={color} />
              </View>
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Records",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "doc.text.fill" : "doc.text"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="file-text" size={22} color={color} />
              </View>
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="phrasebook"
        options={{
          title: "Phrases",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "book.fill" : "book"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="book-open" size={22} color={color} />
              </View>
            ) : (
              <Feather name="book-open" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="translate"
        options={{
          title: "Translate",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "globe.fill" : "globe"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="globe" size={22} color={color} />
              </View>
            ) : (
              <Feather name="globe" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          // Folded into the Clinic tab, which does voice both ways.
          href: null,
          title: "Voice",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "mic.fill" : "mic"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="mic" size={22} color={color} />
              </View>
            ) : (
              <Feather name="mic" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          // Reached from the gear on the Translate header; keeps the bar at 5 tabs.
          href: null,
          title: "Settings",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "gearshape.fill" : "gearshape"}
                tintColor={color}
                size={24}
                weight={focused ? "bold" : "regular"}
              />
            ) : focused ? (
              <View style={[styles.activePill, { backgroundColor: activeTint + "15" }]}>
                <Feather name="settings" size={22} color={color} />
              </View>
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
