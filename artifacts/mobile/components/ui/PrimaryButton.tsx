import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";

type IconName = React.ComponentProps<typeof Feather>["name"];

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = "primary",
  size = "md",
  fullWidth = false,
}: PrimaryButtonProps) {
  const { theme } = useTheme();

  const sizeMap = { sm: 40, md: 52, lg: 60 };
  const height = sizeMap[size];
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: height / 2.6,
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
          backgroundColor: isPrimary
            ? theme.primary
            : isOutline
              ? "transparent"
              : "transparent",
          borderWidth: isOutline ? 1.5 : 0,
          borderColor: isOutline ? theme.primary : "transparent",
          paddingHorizontal: size === "sm" ? 18 : 28,
          alignSelf: fullWidth ? "stretch" : "auto",
          shadowColor: isPrimary ? theme.primary : "transparent",
          shadowOffset: { width: 0, height: isPrimary ? 4 : 0 },
          shadowOpacity: isPrimary ? 0.3 : 0,
          shadowRadius: isPrimary ? 12 : 0,
          elevation: isPrimary ? 6 : 0,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? "#fff" : theme.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Feather
              name={icon}
              size={size === "sm" ? 15 : 18}
              color={isPrimary ? "#fff" : isOutline ? theme.primary : theme.primary}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: isPrimary ? "#fff" : isOutline ? theme.primary : theme.primary,
                fontSize: size === "sm" ? 13 : size === "lg" ? 17 : 15,
              },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
