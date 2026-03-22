export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: "as-IN", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা" },
  { code: "brx-IN", name: "Bodo", nativeName: "बर'" },
  { code: "doi-IN", name: "Dogri", nativeName: "डोगरी" },
  { code: "en-IN", name: "English", nativeName: "English" },
  { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिंदी" },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ks-IN", name: "Kashmiri", nativeName: "کٲشُر" },
  { code: "kok-IN", name: "Konkani", nativeName: "कोंकणी" },
  { code: "mai-IN", name: "Maithili", nativeName: "मैथिली" },
  { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mni-IN", name: "Manipuri", nativeName: "মৈতৈলোন্" },
  { code: "mr-IN", name: "Marathi", nativeName: "मराठी" },
  { code: "ne-IN", name: "Nepali", nativeName: "नेपाली" },
  { code: "od-IN", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "sa-IN", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "sat-IN", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "sd-IN", name: "Sindhi", nativeName: "سنڌي" },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ur-IN", name: "Urdu", nativeName: "اردو" },
];

export const RTL_LANGUAGES = ["ks-IN", "sd-IN", "ur-IN"];

export function isRTL(code: string): boolean {
  return RTL_LANGUAGES.includes(code);
}

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}
