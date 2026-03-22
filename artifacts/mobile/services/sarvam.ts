const SARVAM_BASE = "https://api.sarvam.ai";

export interface TranslateParams {
  input: string;
  sourceLanguageCode: string;
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

export async function translateText(
  params: TranslateParams
): Promise<TranslateResult> {
  const body = {
    input: params.input,
    source_language_code: params.sourceLanguageCode,
    target_language_code: params.targetLanguageCode,
    speaker_gender: "Male",
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
    throw new Error(text || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return {
    translatedText: data.translated_text ?? "",
    detectedSourceLang: data.source_language_code,
  };
}

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

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.language_code ?? "en-IN";
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
