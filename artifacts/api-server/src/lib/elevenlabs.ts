import { ELEVENLABS_VOICE_MAP, ELEVENLABS_SUPPORTED_LANGS } from "./voice-map";

interface ElevenLabsTTSOptions {
  text: string;
  voiceId: string;
  modelId?: string;
}

interface TTSResponse {
  audios: string[];
  provider: string;
  voice_id: string;
}

export function getVoiceId(langCode: string, gender: "female" | "male"): string {
  return ELEVENLABS_VOICE_MAP[langCode]?.[gender]
    ?? ELEVENLABS_VOICE_MAP["default"]![gender];
}

export function isLangSupported(langCode: string): boolean {
  return ELEVENLABS_SUPPORTED_LANGS.has(langCode);
}

export async function synthesizeSpeech(opts: ElevenLabsTTSOptions): Promise<TTSResponse> {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: opts.modelId ?? "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (res.status === 401) throw Object.assign(new Error("Invalid API key"), { status: 401 });
  if (res.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
  if (res.status === 402) throw Object.assign(new Error("Insufficient credits"), { status: 402 });
  if (!res.ok) throw Object.assign(new Error(`ElevenLabs error: ${res.status}`), { status: res.status });

  const arrayBuffer = await res.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  return {
    audios: [base64Audio],
    provider: "elevenlabs",
    voice_id: opts.voiceId,
  };
}

export async function listVoices(): Promise<{ voice_id: string; name: string }[]> {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) return [];

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) return [];

  const data = await res.json() as { voices: { voice_id: string; name: string }[] };
  return data.voices ?? [];
}
