/**
 * Sarvam AI — Text-to-Speech Service
 *
 * Uses the `bulbul:v3` model for natural-sounding Indian language synthesis.
 * Writes the decoded WAV audio to the device cache and returns a file URI
 * that expo-av can load and play.
 */

// expo-file-system 17+ moved legacy helpers (cacheDirectory, writeAsStringAsync, EncodingType)
// to the /legacy subpath — import from there for backwards-compatible usage.
import * as FileSystem from "expo-file-system/legacy";

const SARVAM_BASE = "https://api.sarvam.ai";

/**
 * Voice map: best Sarvam speaker per target language.
 * Sarvam provides gender-differentiated voices for major languages.
 */
export const VOICE_MAP: Record<string, string> = {
  "hi-IN": "meera",
  "ta-IN": "valli",
  "te-IN": "pavithra",
  "kn-IN": "shreya",
  "ml-IN": "sobha",
  "bn-IN": "diya",
  "gu-IN": "neel",
  "mr-IN": "madhur",
  "pa-IN": "amol",
  "od-IN": "indira",
  "en-IN": "ritu",
  "as-IN": "diya",
  "ur-IN": "meera",
  "sd-IN": "meera",
  "ks-IN": "meera",
  "ne-IN": "meera",
  "sa-IN": "meera",
  "mai-IN": "meera",
  "mni-IN": "diya",
  "brx-IN": "diya",
  "doi-IN": "meera",
  "kok-IN": "meera",
  "sat-IN": "diya",
};

function getSpeaker(langCode: string): string {
  return VOICE_MAP[langCode] ?? "meera";
}

/**
 * Synthesize speech for the given text and language.
 * Returns a local file URI that expo-av can play.
 *
 * Limits input to 500 characters (Sarvam REST TTS limit).
 * For longer text, chunk it or use the streaming WS endpoint.
 */
export async function synthesizeSpeech(
  text: string,
  targetLanguageCode: string,
  apiKey: string
): Promise<string> {
  const input = text.slice(0, 500);
  if (!input.trim()) throw new Error("TTS_EMPTY_INPUT");
  const speaker = getSpeaker(targetLanguageCode);

  const requestBody = {
    inputs: [input],
    target_language_code: targetLanguageCode,
    speaker,
    model: "bulbul:v3",
    pitch: 0,
    pace: 1.0,
    loudness: 1.5,
    speech_sample_rate: 22050,
    enable_preprocessing: true,
    eng_interpolation_wt: 123,
  };
  console.log("[TTS] request →", JSON.stringify(requestBody));

  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 401) throw new Error("INVALID_KEY");
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => "");
    }
    console.error(`[TTS] API error ${res.status}:`, detail);
    throw new Error(`TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  // Write the base64 WAV to a temp cache file so expo-av can load it
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("TTS_NO_CACHE_DIR");
  const tempPath = `${cacheDir}tts_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(tempPath, base64Wav, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return tempPath;
}
