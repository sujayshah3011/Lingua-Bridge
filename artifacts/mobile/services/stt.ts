/*
 * ╔══════════════════════════════════════════════════════╗
 * ║         STT AUDIO FORMAT — DO NOT CHANGE             ║
 * ╠══════════════════════════════════════════════════════╣
 * ║ Recording format: M4A (AAC in MPEG-4 container)      ║
 * ║ MIME type sent:   audio/mp4                          ║
 * ║                                                      ║
 * ║ WHY M4A and NOT WAV:                                 ║
 * ║ iOS produces M4A natively. Forcing WAV extension     ║
 * ║ does NOT change the actual bytes — iOS still writes  ║
 * ║ M4A/AAC bytes. Declaring audio/wav with M4A bytes    ║
 * ║ causes Sarvam to detect the mismatch and reject.     ║
 * ║                                                      ║
 * ║ Sarvam STT REST API accepts: mp3, wav, aac, aiff,    ║
 * ║ ogg, opus, flac, mp4/m4a, amr, wma, webm             ║
 * ║ M4A = audio/mp4 is FULLY SUPPORTED. ✅               ║
 * ║                                                      ║
 * ║ NEVER change mimeType to 'audio/wav' or              ║
 * ║ 'audio/vnd.wave'. If you get a 400 error, check      ║
 * ║ getMimeType() returns the right value for the file.  ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { Audio } from "expo-av";
import { API_BASE, fileHeaders } from "./api";

export interface STTResult {
  transcript: string;
  languageCode?: string;
  credits?: number;
}

// ─── RECORDING OPTIONS ────────────────────────────────────────────────────────
// M4A/AAC: what iOS and Android actually produce natively.
// Never use .wav extension — iOS ignores it and writes M4A bytes anyway.
export const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

// ─── MIME TYPE LOOKUP ─────────────────────────────────────────────────────────
// Always derive from the actual file extension — never hardcode per-platform.
export const getMimeType = (uri: string): string => {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    aac: "audio/aac",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    webm: "audio/webm",
    amr: "audio/amr",
  };
  return map[ext] ?? "audio/mp4"; // default: M4A from iOS/Android
};

// ─── GLOBAL RECORDING STATE ───────────────────────────────────────────────────
let _activeRecording: Audio.Recording | null = null;
let _recordingStartTime: number = 0;

// ─── START RECORDING ──────────────────────────────────────────────────────────
export const startRecording = async (): Promise<void> => {
  // Stop any pre-existing recording
  if (_activeRecording) {
    try { await _activeRecording.stopAndUnloadAsync(); } catch (_) {}
    _activeRecording = null;
  }

  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) throw new Error("MICROPHONE_PERMISSION_DENIED");

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(RECORDING_OPTIONS);
  await recording.startAsync();

  _activeRecording = recording;
  _recordingStartTime = Date.now();
};

// ─── STOP RECORDING ───────────────────────────────────────────────────────────
export const stopRecording = async (): Promise<{
  uri: string;
  durationSeconds: number;
  mimeType: string;
}> => {
  if (!_activeRecording) throw new Error("NO_ACTIVE_RECORDING");

  const recording = _activeRecording;
  _activeRecording = null;

  try { await recording.stopAndUnloadAsync(); } catch (_) {}

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  const uri = recording.getURI();
  if (!uri) throw new Error("NO_RECORDING_URI");

  const durationSeconds = Math.max(
    0.5, // minimum to avoid micro-charge
    (Date.now() - _recordingStartTime) / 1000
  );

  return { uri, durationSeconds, mimeType: getMimeType(uri) };
};

// ─── CANCEL RECORDING (silent cleanup) ────────────────────────────────────────
export const cancelRecording = async (): Promise<void> => {
  if (!_activeRecording) return;
  const recording = _activeRecording;
  _activeRecording = null;
  try { await recording.stopAndUnloadAsync(); } catch (_) {}
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  } catch (_) {}
};

// ─── TRANSCRIBE AUDIO (via API server — handles auth + credit deduction) ──────
export async function transcribeAudio(
  fileUri: string,
  languageCode: string = "unknown"
): Promise<STTResult> {
  const headers = await fileHeaders();
  const mimeType = getMimeType(fileUri);

  const formData = new FormData();
  // Derive MIME from actual extension via getMimeType().
  // For .m4a → "audio/mp4", which Sarvam fully accepts.
  // NEVER hardcode "audio/wav" here — iOS bytes are M4A, not WAV.
  formData.append("file", {
    uri: fileUri,
    type: mimeType,
    name: "recording.m4a",
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

// ─── STOP + TRANSCRIBE (convenience) ─────────────────────────────────────────
export const stopAndTranscribe = async (
  languageCode: string = "unknown"
): Promise<STTResult & { durationSeconds: number }> => {
  const { uri, durationSeconds } = await stopRecording();
  const result = await transcribeAudio(uri, languageCode);
  return { ...result, durationSeconds };
};
