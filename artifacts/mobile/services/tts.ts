import * as FileSystem from "expo-file-system/legacy";
import { API_BASE, jsonHeaders } from "./api";

export type VoiceGender = "female" | "male";

export const SPEAKER_MAP: Record<string, { female: string; male: string }> = {
  "hi-IN":  { female: "neha",      male: "aditya"   },
  "en-IN":  { female: "ritu",      male: "rahul"    },
  "ta-IN":  { female: "kavitha",   male: "kabir"    },
  "te-IN":  { female: "kavitha",   male: "rahul"    },
  "kn-IN":  { female: "shreya",    male: "manan"    },
  "ml-IN":  { female: "ishita",    male: "varun"    },
  "bn-IN":  { female: "niharika",  male: "rohan"    },
  "gu-IN":  { female: "priya",     male: "dev"      },
  "mr-IN":  { female: "kavya",     male: "amit"     },
  "pa-IN":  { female: "simran",    male: "sumit"    },
  "od-IN":  { female: "roopa",     male: "kabir"    },
  "as-IN":  { female: "neha",      male: "aayan"    },
  "ur-IN":  { female: "ishita",    male: "rehan"    },
  "sa-IN":  { female: "pooja",     male: "anand"    },
  "mai-IN": { female: "tanya",     male: "tarun"    },
  "brx-IN": { female: "shruti",    male: "sunny"    },
  "doi-IN": { female: "suhani",    male: "mohit"    },
  "kok-IN": { female: "rupali",    male: "soham"    },
  "ks-IN":  { female: "sophia",    male: "advait"   },
  "mni-IN": { female: "amelia",    male: "gokul"    },
  "ne-IN":  { female: "niharika",  male: "vijay"    },
  "sat-IN": { female: "shubh",     male: "ashutosh" },
  "sd-IN":  { female: "ratan",     male: "mani"     },
};

export function getSpeakerName(langCode: string, gender: VoiceGender): string {
  return SPEAKER_MAP[langCode]?.[gender] ?? (gender === "male" ? "aditya" : "neha");
}

export async function synthesizeSpeech(
  text: string,
  targetLanguageCode: string,
  gender: VoiceGender = "female"
): Promise<string> {
  const input = text.slice(0, 500);
  if (!input.trim()) throw new Error("TTS_EMPTY_INPUT");
  const speaker = getSpeakerName(targetLanguageCode, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/sarvam/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [input],
      target_language_code: targetLanguageCode,
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

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("TTS_NO_CACHE_DIR");
  const tempPath = `${cacheDir}tts_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(tempPath, base64Wav, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return tempPath;
}
