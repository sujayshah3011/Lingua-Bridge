/*
 * STT SERVICE — DO NOT MODIFY AUDIO FORMAT SETTINGS
 *
 * Recording: Audio.Recording.createAsync(HIGH_QUALITY)
 * MIME type sent to API: audio/m4a
 *
 * WHY createAsync AND NOT new Audio.Recording() + prepareToRecordAsync:
 * The two-step manual approach throws "recorder not prepared" in Expo Go.
 * createAsync is the ONLY reliable method — it combines permission check,
 * audio mode, prepare, and start atomically in one call.
 *
 * WHY audio/m4a AND NOT audio/wav:
 * HIGH_QUALITY preset produces M4A/AAC natively on iOS and Android.
 * iOS ignores WAV settings and writes M4A bytes. Sending those bytes
 * as audio/wav causes Sarvam to detect the mismatch and reject.
 * Sarvam STT accepts: mp3, wav, aac, m4a, mp4, ogg, flac, webm, amr.
 * audio/m4a is FULLY SUPPORTED. ✅
 *
 * NEVER change type to 'audio/wav', 'audio/vnd.wave', or any hardcoded value.
 */

import { Audio } from "expo-av";
import { API_BASE, fileHeaders } from "./api";

export interface STTResult {
  transcript: string;
  languageCode?: string;
  credits?: number;
}

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
let _recording: Audio.Recording | null = null;
let _recordingStartTime: number = 0;

// ─── START RECORDING ──────────────────────────────────────────────────────────
// Uses Audio.Recording.createAsync — the ONLY reliable Expo method.
// It handles permission check, audio mode, prepare, and start atomically.
// NEVER use `new Audio.Recording() + prepareToRecordAsync` — it fails in Expo Go.
export const startVoiceRecording = async (): Promise<void> => {
  // Clean up any leftover recording
  if (_recording) {
    try { await _recording.stopAndUnloadAsync(); } catch (_) {}
    _recording = null;
  }

  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") throw new Error("MICROPHONE_PERMISSION_DENIED");

  // MUST set audio mode before recording on iOS
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  // createAsync = the single atomic call that always works
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  _recording = recording;
  _recordingStartTime = Date.now();
};

// ─── STOP RECORDING ───────────────────────────────────────────────────────────
export const stopVoiceRecording = async (): Promise<{
  uri: string;
  durationSeconds: number;
}> => {
  if (!_recording) throw new Error("NO_ACTIVE_RECORDING");

  const recording = _recording;
  _recording = null;

  const durationSeconds = Math.max(
    0.5,
    (Date.now() - _recordingStartTime) / 1000
  );
  _recordingStartTime = 0;

  try { await recording.stopAndUnloadAsync(); } catch (_) {}

  // Reset audio mode so playback works after recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  const uri = recording.getURI();
  if (!uri) throw new Error("NO_RECORDING_URI");

  return { uri, durationSeconds };
};

// ─── CANCEL (silent cleanup) ───────────────────────────────────────────────────
export const cancelVoiceRecording = async (): Promise<void> => {
  if (!_recording) return;
  const recording = _recording;
  _recording = null;
  _recordingStartTime = 0;
  try { await recording.stopAndUnloadAsync(); } catch (_) {}
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  } catch (_) {}
};

// ─── TRANSCRIBE (via API server — handles auth + credit deduction) ─────────────
export async function transcribeAudio(
  uri: string,
  languageCode: string = "unknown"
): Promise<STTResult> {
  const headers = await fileHeaders();
  const formData = new FormData();

  // HIGH_QUALITY preset produces M4A/AAC on iOS and Android.
  // type: 'audio/m4a' matches the actual bytes — Sarvam accepts it.
  formData.append("file", {
    uri,
    name: `recording-${Date.now()}.m4a`,
    type: "audio/m4a",
  } as any);
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
    console.error(`[STT] ${res.status}:`, body);
    throw new Error(`STT_ERROR_${res.status}`);
  }

  const data = await res.json();
  return {
    transcript: (data.transcript ?? data.text ?? "").trim(),
    languageCode: data.language_code,
    credits: data.credits,
  };
}

// ─── STOP + TRANSCRIBE (convenience for conversation screen) ──────────────────
export const stopAndTranscribe = async (
  languageCode: string = "unknown"
): Promise<STTResult & { durationSeconds: number }> => {
  const { uri, durationSeconds } = await stopVoiceRecording();
  const result = await transcribeAudio(uri, languageCode);
  return { ...result, durationSeconds };
};
