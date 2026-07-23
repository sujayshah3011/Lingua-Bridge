/**
 * ConversationBubble — Chat bubble for dual-speaker conversation mode.
 *
 * Speaker A → right-aligned, saffron background.
 * Speaker B → left-aligned, navy background.
 * Each bubble shows the original text with the translation in smaller italic below.
 */

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

export interface Message {
  id: string;
  speaker: "A" | "B";
  original: string;
  translated: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  timestamp: number;
  // Set once the translation's speech is synthesized, so the replay button
  // can play the already-paid-for clip again without a new synthesis call.
  audioUri?: string;
}

interface Props {
  message: Message;
}

const ConversationBubble: React.FC<Props> = ({ message }) => {
  const isA = message.speaker === "A";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const toggleReplay = async () => {
    if (!message.audioUri) return;

    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlaying(false);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: message.audioUri },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setIsPlaying(true);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (!s.isLoaded || ("didJustFinish" in s && s.didJustFinish)) {
        sound.unloadAsync().catch(() => {});
        soundRef.current = null;
        setIsPlaying(false);
      }
    });
  };

  return (
    <View
      style={[styles.row, isA ? styles.rowA : styles.rowB]}
      accessible
      accessibilityLabel={`${isA ? "Speaker A" : "Speaker B"}: ${message.original}. Translation: ${message.translated}`}
    >
      <View
        style={[
          styles.bubble,
          isA ? styles.bubbleA : styles.bubbleB,
        ]}
      >
        {/* Original transcript */}
        <Text style={[styles.original, isA ? styles.textLight : styles.textLight]}>
          {message.original}
        </Text>
        {/* Translated text */}
        {message.translated ? (
          <View style={styles.translatedRow}>
            <Text
              style={[styles.translated, isA ? styles.translatedA : styles.translatedB]}
            >
              {message.translated}
            </Text>
            {message.audioUri ? (
              <Pressable
                onPress={toggleReplay}
                accessibilityLabel={isPlaying ? "Stop playback" : "Replay translation"}
                style={({ pressed }) => [styles.replayBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather
                  name={isPlaying ? "square" : "volume-2"}
                  size={14}
                  color={isA ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.75)"}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {/* Timestamp */}
        <Text style={[styles.time, isA ? styles.timeA : styles.timeB]}>
          {time}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowA: {
    justifyContent: "flex-end",
  },
  rowB: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleA: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleB: {
    backgroundColor: COLORS.navy,
    borderBottomLeftRadius: 4,
  },
  original: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  textLight: {
    color: "#FFFFFF",
  },
  translatedRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  translated: {
    flex: 1,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
  },
  replayBtn: {
    padding: 2,
  },
  translatedA: {
    color: "rgba(255,255,255,0.82)",
  },
  translatedB: {
    color: "rgba(255,255,255,0.75)",
  },
  time: {
    fontSize: 10,
    marginTop: 6,
  },
  timeA: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "right",
  },
  timeB: {
    color: "rgba(255,255,255,0.55)",
    textAlign: "left",
  },
});

export default ConversationBubble;
