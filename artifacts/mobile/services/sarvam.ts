import { API_BASE, extractErrorDetail, jsonHeaders } from "./api";

export interface TranslateParams {
  input: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  formalMode: boolean;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLang?: string;
  credits?: number;
}

export async function detectLanguage(input: string): Promise<string> {
  try {
    const headers = await jsonHeaders();
    const res = await fetch(`${API_BASE}/sarvam/detect-language`, {
      method: "POST",
      headers,
      body: JSON.stringify({ input }),
    });
    if (!res.ok) return "en-IN";
    const data = await res.json();
    return data.language_code ?? "en-IN";
  } catch {
    return "en-IN";
  }
}

export async function translateText(
  params: TranslateParams
): Promise<TranslateResult> {
  let sourceLang = params.sourceLanguageCode;

  if (sourceLang === "auto" || sourceLang === "unknown") {
    sourceLang = await detectLanguage(params.input);
  }

  if (sourceLang === params.targetLanguageCode) {
    return {
      translatedText: params.input,
      detectedSourceLang: sourceLang,
    };
  }

  const headers = await jsonHeaders();
  const res = await fetch(`${API_BASE}/sarvam/translate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: params.input,
      source_language_code: sourceLang,
      target_language_code: params.targetLanguageCode,
      mode: params.formalMode ? "formal" : "modern-colloquial",
      model: "sarvam-translate:v1",
      enable_preprocessing: true,
    }),
  });

  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    console.error(`[Translate] ${res.status}:`, detail);
    throw new Error(detail ? `HTTP_${res.status}: ${detail}` : `HTTP_${res.status}`);
  }

  const data = await res.json();
  return {
    translatedText: data.translated_text ?? "",
    detectedSourceLang: sourceLang,
    credits: data.credits,
  };
}
