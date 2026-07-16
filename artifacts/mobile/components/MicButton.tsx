/**
 * MicButton — Animated microphone button with pulsing ring effect.
 *
 * Active state: deep red (#C0392B) background with two expanding rings.
 * Idle state: saffron (#FF6B00) background.
 * Handles mic-permission-denied state with a grey tint.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

interface MicButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  accessibilityLabel?: string;
}

const MicButton: React.FC<MicButtonProps> = ({
  isRecording,
  onPress,
  disabled = false,
  size = 80,
  accessibilityLabel,
}) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      const springPulse = (value: Animated.Value, opacity: Animated.Value) =>
        Animated.sequence([
          Animated.parallel([
            Animated.spring(value, {
              toValue: 1.55,
              useNativeDriver: false,
              speed: 8,
              bounciness: 6,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 700,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.spring(value, {
              toValue: 1,
              useNativeDriver: false,
              speed: 40,
              bounciness: 2,
            }),
            Animated.timing(opacity, {
              toValue: 0.45,
              duration: 50,
              useNativeDriver: false,
            }),
          ]),
        ]);

      const ring1 = Animated.loop(springPulse(pulse1, opacity1));
      const ring2 = Animated.loop(
        Animated.sequence([Animated.delay(600), springPulse(pulse2, opacity2)])
      );

      Animated.spring(iconScale, {
        toValue: 1.15,
        useNativeDriver: false,
        speed: 14,
        bounciness: 8,
      }).start();

      pulseAnim.current = Animated.parallel([ring1, ring2]);
      opacity1.setValue(0.45);
      opacity2.setValue(0.45);
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      Animated.spring(iconScale, {
        toValue: 1,
        useNativeDriver: false,
        speed: 20,
        bounciness: 4,
      }).start();
      pulse1.setValue(1);
      pulse2.setValue(1);
      opacity1.setValue(0);
      opacity2.setValue(0);
    }
    return () => pulseAnim.current?.stop();
  }, [isRecording]);

  const bgColor = disabled
    ? COLORS.border
    : isRecording
    ? "#D4764A"
    : COLORS.primary;

  const ringColor = isRecording ? "#D4764A" : COLORS.primary;

  return (
    <View style={styles.wrapper} accessible={false}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: Animated.multiply(pulse2, size),
            height: Animated.multiply(pulse2, size),
            borderRadius: Animated.divide(Animated.multiply(pulse2, size), 2),
            borderColor: ringColor,
            opacity: opacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: Animated.multiply(pulse1, size),
            height: Animated.multiply(pulse1, size),
            borderRadius: Animated.divide(Animated.multiply(pulse1, size), 2),
            borderColor: ringColor,
            opacity: opacity1,
          },
        ]}
      />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ??
          (isRecording ? "Stop recording" : "Start recording")
        }
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Feather
            name={isRecording ? "square" : "mic"}
            size={size * 0.38}
            color="#FFFFFF"
          />
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MicButton;
