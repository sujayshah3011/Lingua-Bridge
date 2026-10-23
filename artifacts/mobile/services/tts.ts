import { Audio } from "expo-av";
import { API_BASE, extractErrorDetail, jsonHeaders } from "./api";

export type VoiceGender = "female" | "male";
export type TTSProvider = "sarvam" | "elevenlabs";

// Sarvam bulbul:v3 voices, each checked against the API. "niharika" (the old
// female voice for ta/ml/bn) isn't a v3 speaker and failed with HTTP 400, so
// female speech silently never played in those languages.
export const SPEAKER_MAP: Record<string, { female: string; male: string }> = {
  "hi-IN": { female: "neha",    male: "aditya" },
  "en-IN": { female: "ritu",    male: "aditya" },
  "ta-IN": { female: "kavitha", male: "kabir"  },
  "te-IN": { female: "kavitha", male: "rahul"  },
  "kn-IN": { female: "shreya",  male: "manan"  },
  "ml-IN": { female: "shruti",  male: "varun"  },
  "bn-IN": { female: "ishita",  male: "rohan"  },
  "gu-IN": { female: "priya",   male: "dev"    },
  "mr-IN": { female: "kavya",   male: "amit"   },
  "pa-IN": { female: "simran",  male: "sumit"  },
  "od-IN": { female: "roopa",   male: "kabir"  },
};

export function getSpeakerName(langCode: string, gender: VoiceGender): string {
  return SPEAKER_MAP[langCode]?.[gender] ?? (gender === "male" ? "aditya" : "neha");
}

// The server includes the real balance it saw when it rejected the charge —
// surfacing that number (instead of a bare "INSUFFICIENT_CREDITS") is the
// only way to tell a genuinely empty wallet apart from a stale client-side
// display, without guessing.
async function insufficientCreditsError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  const credits = typeof body?.["credits"] === "number" ? (body["credits"] as number) : undefined;
  return new Error(credits !== undefined ? `INSUFFICIENT_CREDITS:${credits}` : "INSUFFICIENT_CREDITS");
}

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
    return speakTextElevenLabs(input, targetLang, gender);
  }

  return speakTextSarvam(input, targetLang, gender);
};

async function speakTextSarvam(
  input: string,
  targetLang: string,
  gender: VoiceGender
): Promise<void> {
  const speaker = getSpeakerName(targetLang, gender);

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/sarvam/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [input],
      target_language_code: targetLang,
      speaker,
      model: "bulbul:v3",
      pace: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    }),
  });

  if (res.status === 402) throw await insufficientCreditsError(res);
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    console.error("[TTS Sarvam] Error:", res.status, detail);
    throw new Error(detail ? `TTS_ERROR_${res.status}: ${detail}` : `TTS_ERROR_${res.status}`);
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
  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/elevenlabs/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [text],
      target_language_code: targetLang,
      speaker: gender,
      model: "eleven_flash_v2_5",
    }),
  });

  if (res.status === 402) throw await insufficientCreditsError(res);
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    console.error("[TTS ElevenLabs] Error:", res.status, detail);
    throw new Error(detail ? `ELEVENLABS_TTS_ERROR_${res.status}: ${detail}` : `ELEVENLABS_TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audio ?? data.audios?.[0];
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

  if (res.status === 402) throw await insufficientCreditsError(res);
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    console.error("[TTS Sarvam] Error:", res.status, detail);
    throw new Error(detail ? `TTS_ERROR_${res.status}: ${detail}` : `TTS_ERROR_${res.status}`);
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
  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/elevenlabs/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: [text],
      target_language_code: targetLanguageCode,
      speaker: gender,
      model: "eleven_flash_v2_5",
    }),
  });

  if (res.status === 402) throw await insufficientCreditsError(res);
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    console.error("[TTS ElevenLabs] Error:", res.status, detail);
    throw new Error(detail ? `ELEVENLABS_TTS_ERROR_${res.status}: ${detail}` : `ELEVENLABS_TTS_ERROR_${res.status}`);
  }

  const data = await res.json();
  const base64Wav: string = data.audio ?? data.audios?.[0];
  if (!base64Wav) throw new Error("TTS_EMPTY_RESPONSE");

  return `data:audio/wav;base64,${base64Wav}`;
}
