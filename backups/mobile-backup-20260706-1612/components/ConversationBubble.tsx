/**
 * ConversationBubble — Chat bubble for dual-speaker conversation mode.
 *
 * Speaker A → right-aligned, saffron background.
 * Speaker B → left-aligned, navy background.
 * Each bubble shows the original text with the translation in smaller italic below.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/colors";

export interface Message {
  id: string;
  speaker: "A" | "B";
  original: string;
  translated: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  timestamp: number;
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
          <Text style={[styles.translated, isA ? styles.translatedA : styles.translatedB]}>
            {message.translated}
          </Text>
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
  translated: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 19,
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
