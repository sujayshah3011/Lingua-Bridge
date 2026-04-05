/*
 * TTS SERVICE
 * Model: bulbul:v3
 * Playback: expo-av Audio.Sound from base64 data URI (no filesystem writes)
 *
 * FORBIDDEN params for bulbul:v3: pitch, loudness, eng_interpolation_wt
 * Valid params: inputs, target_language_code, speaker, model, pace,
 *               speech_sample_rate, enable_preprocessing
 */

import { Audio } from "expo-av";
import { API_BASE, jsonHeaders } from "./api";

export type VoiceGender = "female" | "male";

// ─── SPEAKER MAP ──────────────────────────────────────────────────────────────
// All names verified valid for bulbul:v3
export const SPEAKER_MAP: Record<string, { female: string; male: string }> = {
  "hi-IN":  { female: "anushka",  male: "abhilash" },
  "en-IN":  { female: "ritu",     male: "aditya"   },
  "ta-IN":  { female: "vidya",    male: "karun"    },
  "te-IN":  { female: "kavitha",  male: "rahul"    },
  "kn-IN":  { female: "shreya",   male: "manan"    },
  "ml-IN":  { female: "manisha",  male: "varun"    },
  "bn-IN":  { female: "arya",     male: "rohan"    },
  "gu-IN":  { female: "priya",    male: "dev"      },
  "mr-IN":  { female: "kavya",    male: "amit"     },
  "pa-IN":  { female: "simran",   male: "sumit"    },
  "od-IN":  { female: "roopa",    male: "kabir"    },
  "as-IN":  { female: "neha",     male: "aayan"    },
  "ur-IN":  { female: "ishita",   male: "rehan"    },
  "sa-IN":  { female: "pooja",    male: "anand"    },
  "mai-IN": { female: "tanya",    male: "tarun"    },
  "brx-IN": { female: "shruti",   male: "sunny"    },
  "doi-IN": { female: "suhani",   male: "mohit"    },
  "kok-IN": { female: "rupali",   male: "soham"    },
  "ks-IN":  { female: "sophia",   male: "advait"   },
  "mni-IN": { female: "amelia",   male: "gokul"    },
  "ne-IN":  { female: "neha",     male: "vijay"    },
  "sat-IN": { female: "shubh",    male: "ashutosh" },
  "sd-IN":  { female: "ratan",    male: "mani"     },
};

export function getSpeakerName(langCode: string, gender: VoiceGender): string {
  return SPEAKER_MAP[langCode]?.[gender] ?? (gender === "male" ? "aditya" : "anushka");
}

// bulbul:v3 supports these 11 languages; others fall back to en-IN
const TTS_SUPPORTED = new Set([
  "hi-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN",
  "bn-IN", "gu-IN", "mr-IN", "pa-IN", "od-IN", "en-IN",
]);

// ─── GLOBAL PLAYBACK STATE ────────────────────────────────────────────────────
let _currentSound: Audio.Sound | null = null;

// ─── STOP PLAYBACK ────────────────────────────────────────────────────────────
export const stopSpeaking = async (): Promise<void> => {
  if (_currentSound) {
    try { await _currentSound.stopAsync(); } catch (_) {}
    try { await _currentSound.unloadAsync(); } catch (_) {}
    _currentSound = null;
  }
};

// ─── SYNTHESIZE + PLAY ────────────────────────────────────────────────────────
// Calls the API server (which handles Sarvam TTS + credit deduction),
// then plays the returned base64 WAV as a data URI — no filesystem writes.
export const speakText = async (
  text: string,
  targetLang: string,
  gender: VoiceGender = "female"
): Promise<void> => {
  const input = text.slice(0, 500).trim();
  if (!input) return;

  const ttsLang = TTS_SUPPORTED.has(targetLang) ? targetLang : "en-IN";
  const speaker = getSpeakerName(ttsLang, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/sarvam/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [input],
      target_language_code: ttsLang,
      speaker,
      model: "bulbul:v3",
      pace: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      // CRITICAL: do NOT include pitch, loudness, eng_interpolation_wt
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[TTS] Error:", res.status, body);
    throw new Error(`TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  // Stop any currently playing sound
  await stopSpeaking();

  // Set audio mode for playback
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  // Play directly from data URI — no filesystem dependency
  const { sound } = await Audio.Sound.createAsync(
    { uri: `data:audio/wav;base64,${base64Wav}` },
    { shouldPlay: true, volume: 1.0 }
  );
  _currentSound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      if (_currentSound === sound) _currentSound = null;
    }
  });
};

// ─── SYNTHESIZE ONLY (returns URI — kept for backward compat) ─────────────────
// Returns a data URI rather than a file path. Voice screens that manage their
// own Audio.Sound can use this; prefer speakText() for new code.
export async function synthesizeSpeech(
  text: string,
  targetLanguageCode: string,
  gender: VoiceGender = "female"
): Promise<string> {
  const input = text.slice(0, 500).trim();
  if (!input) throw new Error("TTS_EMPTY_INPUT");

  const ttsLang = TTS_SUPPORTED.has(targetLanguageCode)
    ? targetLanguageCode
    : "en-IN";
  const speaker = getSpeakerName(ttsLang, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/sarvam/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [input],
      target_language_code: ttsLang,
      speaker,
      model: "bulbul:v3",
      pace: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[TTS] Error:", res.status, body);
    throw new Error(`TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  // Return data URI instead of writing to filesystem
  return `data:audio/wav;base64,${base64Wav}`;
}
