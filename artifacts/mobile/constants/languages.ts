export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// The 11 languages that work end to end: Sarvam speech recognition, translation
// AND Sarvam speech output. The other 12 scheduled languages translate but
// Sarvam can't speak them (HTTP 400), and the ElevenLabs fallback model only
// covers Hindi and Tamil, so a voice interpreter can't offer them honestly.
export const LANGUAGES: Language[] = [
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা" },
  { code: "en-IN", name: "English", nativeName: "English" },
  { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिंदी" },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mr-IN", name: "Marathi", nativeName: "मराठी" },
  { code: "od-IN", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు" },
];

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}
