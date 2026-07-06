import { Audio } from "expo-av";
import { API_BASE, jsonHeaders } from "./api";
import { getElevenLabsVoice, ELEVENLABS_SUPPORTED } from "./elevenlabs-voice-map";

export type VoiceGender = "female" | "male";
export type TTSProvider = "sarvam" | "elevenlabs";

export const SPEAKER_MAP: Record<string, { female: string; male: string }> = {
  "hi-IN":  { female: "neha",     male: "aditya"   },
  "en-IN":  { female: "ritu",     male: "aditya"   },
  "ta-IN":  { female: "niharika", male: "kabir"    },
  "te-IN":  { female: "kavitha",  male: "rahul"    },
  "kn-IN":  { female: "shreya",   male: "manan"    },
  "ml-IN":  { female: "niharika", male: "varun"    },
  "bn-IN":  { female: "niharika", male: "rohan"    },
  "gu-IN":  { female: "priya",    male: "dev"      },
  "mr-IN":  { female: "kavya",    male: "amit"     },
  "pa-IN":  { female: "simran",   male: "sumit"    },
  "od-IN":  { female: "roopa",    male: "kabir"    },
  "as-IN":  { female: "neha",     male: "aayan"    },
  "ur-IN":  { female: "niharika", male: "rehan"    },
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
  return SPEAKER_MAP[langCode]?.[gender] ?? (gender === "male" ? "aditya" : "neha");
}

const TTS_SUPPORTED = new Set([
  "hi-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN",
  "bn-IN", "gu-IN", "mr-IN", "pa-IN", "od-IN", "en-IN",
]);

let _currentSound: Audio.Sound | null = null;

export const stopSpeaking = async (): Promise<void> => {
  if (_currentSound) {
    try { await _currentSound.stopAsync(); } catch (_) {}
    try { await _currentSound.unloadAsync(); } catch (_) {}
    _currentSound = null;
  }
};

export const speakText = async (
  text: string,
  targetLang: string,
  gender: VoiceGender = "female",
  provider: TTSProvider = "sarvam"
): Promise<void> => {
  const input = text.slice(0, 500).trim();
  if (!input) return;

  if (provider === "elevenlabs") {
    return speakTextElevenLabs(text, targetLang, gender);
  }

  return speakTextSarvam(input, targetLang, gender);
};

async function speakTextSarvam(
  input: string,
  targetLang: string,
  gender: VoiceGender
): Promise<void> {
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
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[TTS Sarvam] Error:", res.status, body);
    throw new Error(`TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  await stopSpeaking();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

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
}

async function speakTextElevenLabs(
  text: string,
  targetLang: string,
  gender: VoiceGender
): Promise<void> {
  const ttsLang = ELEVENLABS_SUPPORTED.has(targetLang) ? targetLang : "en-IN";
  const voiceId = getElevenLabsVoice(ttsLang, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/elevenlabs/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [text],
      target_language_code: ttsLang,
      speaker: gender,
      model: "eleven_multilingual_v2",
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[TTS ElevenLabs] Error:", res.status, body);
    throw new Error(`ELEVENLABS_TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  await stopSpeaking();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

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
}

export async function synthesizeSpeech(
  text: string,
  targetLanguageCode: string,
  gender: VoiceGender = "female",
  provider: TTSProvider = "sarvam"
): Promise<string> {
  const input = text.slice(0, 500).trim();
  if (!input) throw new Error("TTS_EMPTY_INPUT");

  if (provider === "elevenlabs") {
    return synthesizeElevenLabs(input, targetLanguageCode, gender);
  }

  return synthesizeSarvam(input, targetLanguageCode, gender);
}

async function synthesizeSarvam(
  input: string,
  targetLanguageCode: string,
  gender: VoiceGender
): Promise<string> {
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
    console.error("[TTS Sarvam] Error:", res.status, body);
    throw new Error(`TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  return `data:audio/wav;base64,${base64Wav}`;
}

async function synthesizeElevenLabs(
  text: string,
  targetLanguageCode: string,
  gender: VoiceGender
): Promise<string> {
  const ttsLang = ELEVENLABS_SUPPORTED.has(targetLanguageCode)
    ? targetLanguageCode
    : "en-IN";
  const voiceId = getElevenLabsVoice(ttsLang, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/elevenlabs/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [text],
      target_language_code: ttsLang,
      speaker: gender,
      model: "eleven_multilingual_v2",
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[TTS ElevenLabs] Error:", res.status, body);
    throw new Error(`ELEVENLABS_TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  return `data:audio/wav;base64,${base64Wav}`;
}
