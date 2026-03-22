/**
 * Sarvam AI — Speech-to-Text Service
 *
 * Uses the `/speech-to-text-translate` REST endpoint for reliable
 * cross-platform audio transcription. The WebSocket streaming version
 * requires raw PCM capture (not available in Expo Go) and is intended
 * for EAS native builds — see the comments below for that implementation.
 */

const SARVAM_BASE = "https://api.sarvam.ai";

export interface STTResult {
  transcript: string;
  languageCode?: string;
}

/**
 * Transcribe a recorded audio file URI via the Sarvam REST API.
 * Accepts WAV, M4A, MP3, and OGG files up to 25MB.
 */
export async function transcribeAudio(
  fileUri: string,
  apiKey: string,
  languageCode: string = "unknown"
): Promise<STTResult> {
  // Build multipart form data — React Native requires the file object shape
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    type: "audio/wav",
    name: "recording.wav",
  } as unknown as Blob);
  formData.append("model", "saaras:v3");
  formData.append("language_code", languageCode);
  formData.append("mode", "transcribe");
  formData.append("with_timestamps", "false");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      // NOTE: Do NOT set Content-Type manually — fetch sets it with the
      // correct boundary when body is FormData.
    },
    body: formData,
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 401) throw new Error("INVALID_KEY");
  if (!res.ok) throw new Error(`STT_ERROR_${res.status}`);

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
 *
 * Usage:
 *   const ws = openStreamingSTT(apiKey, onPartial, onFinal, onError);
 *   // Send audio chunks: ws.sendAudioChunk(base64PcmChunk)
 *   // Stop: ws.close()
 */
export function openStreamingSTT(
  apiKey: string,
  onPartialTranscript: (text: string) => void,
  onFinalTranscript: (text: string) => void,
  onError: (err: Error) => void
) {
  const ws = new WebSocket(
    "wss://api.sarvam.ai/speech-to-text-translate/streaming",
    [],
    { headers: { "api-subscription-key": apiKey } } as unknown as string[]
  );

  ws.onopen = () => {
    // Send configuration as the first message
    ws.send(
      JSON.stringify({
        type: "config",
        data: {
          sample_rate: 16000,
          encoding: "pcm_s16le",
          model: "saaras:v3",
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
        case "vad_speech_start":
        case "vad_speech_end":
        case "end_of_utterance":
          // VAD signals — handle in caller if needed
          break;
      }
    } catch {}
  };

  ws.onerror = () => onError(new Error("WebSocket error"));
  ws.onclose = () => {};

  return {
    /** Send a base64-encoded 16kHz mono 16-bit PCM chunk */
    sendAudioChunk: (base64Chunk: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "audio", data: base64Chunk }));
      }
    },
    /** Force the server to finalize the current utterance */
    flush: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "flush" }));
      }
    },
    /** Gracefully close the session */
    close: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
      }
      ws.close();
    },
  };
}
