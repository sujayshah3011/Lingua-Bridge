// One voice per gender for every language: ElevenLabs' multilingual model takes
// the language from the text, not the voice. The old per-language table held 9
// voice IDs that don't exist (checked against /v1/voices) and only English voices
// otherwise. Both of these are ElevenLabs "premade" voices, which can't be
// withdrawn by a third-party owner the way library voices can.
export const ELEVENLABS_VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL", // Sarah
  male: "pNInz6obpgDQGcFmaJgB", // Adam
} as const;
