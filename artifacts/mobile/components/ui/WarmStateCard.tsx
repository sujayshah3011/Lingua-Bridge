import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

type IconName = React.ComponentProps<typeof Feather>["name"];

interface WarmStateCardProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  loading?: boolean;
  illustration?: boolean;
}

export function WarmStateCard({
  icon = "smile",
  title,
  subtitle,
  loading = false,
  illustration = true,
}: WarmStateCardProps) {
  const { isDark } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
          },
        ]}
      >
        {illustration && (
          <View
            style={[
              styles.iconRing,
              { borderColor: C.primary + "20" },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: C.primary + "12" },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Feather name={icon} size={28} color={C.primary} />
              )}
            </View>
          </View>
        )}
        <Text style={[styles.title, { color: C.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: C.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
