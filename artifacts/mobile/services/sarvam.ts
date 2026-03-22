const SARVAM_BASE = "https://api.sarvam.ai";

export interface TranslateParams {
  input: string;
  sourceLanguageCode: string; // pass "auto" to detect & translate
  targetLanguageCode: string;
  formalMode: boolean;
  apiKey: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLang?: string;
}

export interface TransliterateParams {
  input: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  apiKey: string;
}

/** Detect the language of a text snippet. Returns a language code like "hi-IN". */
export async function detectLanguage(
  input: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(`${SARVAM_BASE}/detect-language`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) return "en-IN"; // fail silently, fall back to English
  const data = await res.json();
  return data.language_code ?? "en-IN";
}

/**
 * Translate text using the Sarvam translate API.
 *
 * When sourceLanguageCode === "auto", we first call /detect-language to get
 * the actual source language, then translate. This avoids passing an invalid
 * value to the translate endpoint.
 */
export async function translateText(
  params: TranslateParams
): Promise<TranslateResult> {
  let sourceLang = params.sourceLanguageCode;

  // Resolve auto-detect: call /detect-language first
  if (sourceLang === "auto" || sourceLang === "unknown") {
    sourceLang = await detectLanguage(params.input, params.apiKey);
  }

  // If source and target are the same, skip the API call
  if (sourceLang === params.targetLanguageCode) {
    return {
      translatedText: params.input,
      detectedSourceLang: sourceLang,
    };
  }

  const body = {
    input: params.input,
    source_language_code: sourceLang,
    target_language_code: params.targetLanguageCode,
    mode: params.formalMode ? "formal" : "modern-colloquial",
    model: "sarvam-translate:v1",
    enable_preprocessing: true,
  };

  const res = await fetch(`${SARVAM_BASE}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": params.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new Error("INVALID_KEY");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP_${res.status}`);
  }

  const data = await res.json();
  return {
    translatedText: data.translated_text ?? "",
    detectedSourceLang: sourceLang,
  };
}

export async function transliterateText(
  params: TransliterateParams
): Promise<string> {
  const res = await fetch(`${SARVAM_BASE}/transliterate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": params.apiKey,
    },
    body: JSON.stringify({
      input: params.input,
      source_language_code: params.sourceLanguageCode,
      target_language_code: params.targetLanguageCode,
    }),
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data.transliterated_text ?? "";
}
