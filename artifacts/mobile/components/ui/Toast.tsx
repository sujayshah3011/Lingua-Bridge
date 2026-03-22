import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type ToastType = "info" | "error" | "success";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
}

export function Toast({ message, type = "info", visible }: ToastProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible]);

  const bg =
    type === "error"
      ? theme.error
      : type === "success"
        ? theme.success
        : theme.primary;

  const icon =
    type === "error"
      ? "alert-circle"
      : type === "success"
        ? "check-circle"
        : "info";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { top: insets.top + 12, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color="#fff" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
});
