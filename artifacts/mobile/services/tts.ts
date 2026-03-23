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

export type VoiceGender = "female" | "male";

/**
 * Speaker map: valid bulbul:v3 speaker names per language, split by gender.
 * Both names are confirmed valid for the bulbul:v3 model.
 */
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
  "as-IN":  { female: "neha",     male: "hitesh"   },
  "ur-IN":  { female: "ishita",   male: "rehan"    },
  "sa-IN":  { female: "pooja",    male: "anand"    },
  "mai-IN": { female: "tanya",    male: "tarun"    },
  "brx-IN": { female: "shruti",   male: "sunny"    },
  "doi-IN": { female: "suhani",   male: "mohit"    },
  "kok-IN": { female: "rupali",   male: "soham"    },
  "ks-IN":  { female: "sophia",   male: "advait"   },
  "mni-IN": { female: "amelia",   male: "gokul"    },
  "ne-IN":  { female: "nisha",    male: "vijay"    },
  "sat-IN": { female: "shubh",    male: "ashutosh" },
  "sd-IN":  { female: "ratan",    male: "mani"     },
};

export function getSpeakerName(langCode: string, gender: VoiceGender): string {
  return SPEAKER_MAP[langCode]?.[gender] ?? "anushka";
}

/**
 * Synthesize speech for the given text and language.
 * Returns a local file URI that expo-av can play.
 *
 * Limits input to 500 characters (Sarvam REST TTS limit).
 * Note: bulbul:v3 does NOT accept pitch or loudness — omit them.
 */
export async function synthesizeSpeech(
  text: string,
  targetLanguageCode: string,
  apiKey: string,
  gender: VoiceGender = "female"
): Promise<string> {
  const input = text.slice(0, 500);
  if (!input.trim()) throw new Error("TTS_EMPTY_INPUT");
  const speaker = getSpeakerName(targetLanguageCode, gender);

  const requestBody = {
    inputs: [input],
    target_language_code: targetLanguageCode,
    speaker,
    model: "bulbul:v3",
    pace: 1.0,
    speech_sample_rate: 22050,
    enable_preprocessing: true,
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
