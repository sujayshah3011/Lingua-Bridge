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

/**
 * Derive filename and MIME type from the recorded URI.
 *
 * IMPORTANT — WAV files: React Native's networking layer may auto-detect the
 * MIME type of a WAV file as "audio/vnd.wave", which is NOT on Sarvam's
 * allowlist. We always explicitly specify "audio/wav" for WAV files so the
 * value we set is used verbatim and not overridden by the RN HTTP client.
 */
function audioMeta(uri: string): { mimeType: string; filename: string } {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "wav":
      // Hardcode "audio/wav" — do NOT use "audio/vnd.wave" (alias rejected by Sarvam)
      return { mimeType: "audio/wav", filename: "recording.wav" };
    case "mp3":
      return { mimeType: "audio/mpeg", filename: "recording.mp3" };
    case "ogg":
      return { mimeType: "audio/ogg", filename: "recording.ogg" };
    case "m4a":
    case "aac":
      return { mimeType: "audio/m4a", filename: "recording.m4a" };
    default:
      return { mimeType: "audio/wav", filename: "recording.wav" };
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

  // Explicitly pass the MIME string we derived — React Native's HTTP client
  // may sniff WAV files and replace the type with "audio/vnd.wave", which
  // Sarvam rejects. Our explicit value takes precedence over any sniffing.
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    type: mimeType,   // always "audio/wav" for WAV; never "audio/vnd.wave"
    name: filename,
  } as unknown as Blob);
  formData.append("model", "saaras:v2.5");
  formData.append("language_code", languageCode);
  formData.append("mode", "transcribe");
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
    // Log the body for debugging but always throw with our recognisable prefix
    // so the caller's catch block can classify it as an STT failure.
    const body = await res.text().catch(() => "");
    console.error(`[STT] ${res.status} error:`, body);
    throw new Error(`STT_ERROR_${res.status}`);
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
          model: "saaras:v2.5",
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
