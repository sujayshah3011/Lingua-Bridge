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
  AccessibilityInfo,
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
  // Two pulse rings that scale outward and fade when recording
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      // Ring 1: fast pulse
      const ring1 = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulse1, {
              toValue: 1.6,
              duration: 900,
              useNativeDriver: false,
            }),
            Animated.timing(opacity1, {
              toValue: 0,
              duration: 900,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulse1, {
              toValue: 1,
              duration: 0,
              useNativeDriver: false,
            }),
            Animated.timing(opacity1, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: false,
            }),
          ]),
        ])
      );
      // Ring 2: delayed pulse for stagger effect
      const ring2 = Animated.loop(
        Animated.sequence([
          Animated.delay(450),
          Animated.parallel([
            Animated.timing(pulse2, {
              toValue: 1.6,
              duration: 900,
              useNativeDriver: false,
            }),
            Animated.timing(opacity2, {
              toValue: 0,
              duration: 900,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulse2, {
              toValue: 1,
              duration: 0,
              useNativeDriver: false,
            }),
            Animated.timing(opacity2, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: false,
            }),
          ]),
        ])
      );
      pulseAnim.current = Animated.parallel([ring1, ring2]);
      opacity1.setValue(0.5);
      opacity2.setValue(0.5);
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
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
    ? "#C0392B"
    : COLORS.primary;

  const ringColor = isRecording ? "#E74C3C" : COLORS.primary;

  return (
    <View style={styles.wrapper} accessible={false}>
      {/* Outer pulse ring */}
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
      {/* Inner pulse ring */}
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
        <Feather
          name={isRecording ? "square" : "mic"}
          size={size * 0.38}
          color="#FFFFFF"
        />
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
