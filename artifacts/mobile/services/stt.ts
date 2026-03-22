/**
 * Sarvam AI — Speech-to-Text Service
 *
 * Uses the `/speech-to-text-translate` REST endpoint.
 * Accepted formats: WAV, MP3, M4A, OGG (up to 25 MB).
 */

const SARVAM_BASE = "https://api.sarvam.ai";

export interface STTResult {
  transcript: string;
  languageCode?: string;
}

/** Derive the correct MIME type and a clean filename from the recorded URI. */
function audioMeta(uri: string): { mimeType: string; filename: string } {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "wav":
      return { mimeType: "audio/wav", filename: "recording.wav" };
    case "mp3":
      return { mimeType: "audio/mpeg", filename: "recording.mp3" };
    case "ogg":
      return { mimeType: "audio/ogg", filename: "recording.ogg" };
    case "m4a":
    case "aac":
      return { mimeType: "audio/m4a", filename: "recording.m4a" };
    case "caf":
      // Core Audio Format from iOS — re-label so the API recognises it.
      // The audio is AAC-encoded inside a CAF container which many APIs handle.
      return { mimeType: "audio/x-caf", filename: "recording.caf" };
    default:
      return { mimeType: "audio/m4a", filename: "recording.m4a" };
  }
}

/**
 * Transcribe a recorded audio file URI via the Sarvam REST API.
 * Accepts WAV, MP3, M4A, OGG files up to 25 MB.
 */
export async function transcribeAudio(
  fileUri: string,
  apiKey: string,
  languageCode: string = "unknown"
): Promise<STTResult> {
  const { mimeType, filename } = audioMeta(fileUri);

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    type: mimeType,
    name: filename,
  } as unknown as Blob);
  formData.append("model", "saaras:v2");
  formData.append("language_code", languageCode === "unknown" ? "unknown" : languageCode);
  formData.append("with_timestamps", "false");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      // Do NOT set Content-Type — fetch adds it with the correct boundary.
    },
    body: formData,
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 401) throw new Error("INVALID_KEY");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `STT_ERROR_${res.status}`);
  }

  const data = await res.json();
  return {
    transcript: data.transcript ?? "",
    languageCode: data.language_code,
  };
}

/**
 * WebSocket Streaming STT — for EAS native builds only.
 *
 * In a native build with raw PCM capture (e.g. via react-native-audio-record),
 * this gives real-time partial transcripts with < 300ms latency.
 */
export function openStreamingSTT(
  apiKey: string,
  onPartialTranscript: (text: string) => void,
  onFinalTranscript: (text: string) => void,
  onError: (err: Error) => void
) {
  // React Native extends WebSocket with an optional options arg for headers,
  // but the standard TS lib doesn't include it — cast to bypass that check.
  const WSClass = WebSocket as new (
    url: string,
    protocols?: string[],
    options?: { headers?: Record<string, string> }
  ) => WebSocket;
  const ws = new WSClass(
    "wss://api.sarvam.ai/speech-to-text-translate/streaming",
    [],
    { headers: { "api-subscription-key": apiKey } }
  );

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: "config",
        data: {
          sample_rate: 16000,
          encoding: "pcm_s16le",
          model: "saaras:v2",
          language_code: "unknown",
          mode: "transcribe",
          vad_signals: true,
          high_vad_sensitivity: false,
        },
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      switch (msg.type) {
        case "partial_transcript":
          onPartialTranscript(msg.transcript ?? "");
          break;
        case "final_transcript":
          onFinalTranscript(msg.transcript ?? "");
          break;
      }
    } catch {}
  };

  ws.onerror = () => onError(new Error("WebSocket error"));
  ws.onclose = () => {};

  return {
    sendAudioChunk: (base64Chunk: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "audio", data: base64Chunk }));
      }
    },
    flush: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "flush" }));
      }
    },
    close: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
      }
      ws.close();
    },
  };
}
