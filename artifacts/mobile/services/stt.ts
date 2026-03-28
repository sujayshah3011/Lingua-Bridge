import { API_BASE, fileHeaders } from "./api";

export interface STTResult {
  transcript: string;
  languageCode?: string;
  credits?: number;
}

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
    default:
      return { mimeType: "audio/wav", filename: "recording.wav" };
  }
}

export async function transcribeAudio(
  fileUri: string,
  languageCode: string = "unknown"
): Promise<STTResult> {
  const { mimeType, filename } = audioMeta(fileUri);
  const headers = await fileHeaders();

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    type: mimeType,
    name: filename,
  } as unknown as Blob);
  formData.append("language_code", languageCode);

  const res = await fetch(`${API_BASE}/stt`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[STT] ${res.status} error:`, body);
    throw new Error(`STT_ERROR_${res.status}`);
  }

  const data = await res.json();
  return {
    transcript: data.transcript ?? "",
    languageCode: data.language_code,
    credits: data.credits,
  };
}

export function openStreamingSTT(
  onPartialTranscript: (text: string) => void,
  onFinalTranscript: (text: string) => void,
  onError: (err: Error) => void
) {
  const WSClass = WebSocket as new (
    url: string,
    protocols?: string[],
    options?: { headers?: Record<string, string> }
  ) => WebSocket;
  const ws = new WSClass(
    "wss://api.sarvam.ai/speech-to-text-translate/streaming",
    [],
    { headers: { "api-subscription-key": "" } }
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
