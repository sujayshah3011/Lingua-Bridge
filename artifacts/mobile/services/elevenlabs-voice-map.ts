export const ELEVENLABS_VOICE_MAP: Record<string, { female: string; male: string }> = {
  "hi-IN":  { female: "21m00Tcm4TlvDq8ikWAM",   male: "ODq5zmih8GrVes37Dizd"   },
  "en-IN":  { female: "EXAVITQu4vr4xnSDxMaL",   male: "IKne3meq5aSn9XLyUdCD"   },
  "ta-IN":  { female: "ThT5KcBeYPX3keUQqHPh",   male: "TxGEqnHWrfWFTfGW9XjX"   },
  "te-IN":  { female: "Xb7hH8MSUJpSbSDYk0k2",   male: "AZnzlk1XvdvUeBnXmlld"   },
  "kn-IN":  { female: "pNInz6obpgDQGcFmaJgB",   male: "yoZ06aMxZJJ28mfd3POQ"   },
  "ml-IN":  { female: "lbjW6UzMdY7v4wO58oDE",   male: "fW1UF1DcX2SfM1nOyBVP"   },
  "bn-IN":  { female: "LcfcDJNUP1GQjkzn1xJk",   male: "g5CIjZEefAph4nQFvHAz"   },
  "gu-IN":  { female: "N2lVS1w4EtoT3dr4eOWO",   male: "IKvfIlSu2cXKTLFVsN0s"   },
  "mr-IN":  { female: "OYAJSJ3bN2x4w6O1F6oN",   male: "ZQe5CZNOzWekThL2Sf2T"   },
  "pa-IN":  { female: "MF3mGyEYCl7XYWbV9V6O",   male: "8gW1jF1cT2bU3dE4f5gH"   },
  "od-IN":  { female: "pqHfZKPfFy3Jw5Y6zI7a",   male: "rN8sT9uV0wX1yZ2aB3cD"   },
  "default": { female: "21m00Tcm4TlvDq8ikWAM",   male: "ODq5zmih8GrVes37Dizd"   },
};

export const ELEVENLABS_SUPPORTED = new Set(
  Object.keys(ELEVENLABS_VOICE_MAP).filter((k) => k !== "default")
);

export function getElevenLabsVoice(langCode: string, gender: "female" | "male"): string {
  return ELEVENLABS_VOICE_MAP[langCode]?.[gender]
    ?? ELEVENLABS_VOICE_MAP["default"]![gender];
}
