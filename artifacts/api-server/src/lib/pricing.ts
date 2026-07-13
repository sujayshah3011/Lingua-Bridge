// Mirrors artifacts/mobile/constants/pricing.ts — keep both in sync.
// Not shared as a workspace package: it's ~20 lines and rarely changes.

const SARVAM_COST = {
  translate: { perChar: 20 / 10000 },
  tts: { perChar: 15 / 10000 },
  stt: { perSecond: 30 / 3600 },
  transliterate: { perChar: 20 / 10000 },
};

const ELEVENLABS_COST = {
  tts: { perChar: (0.18 / 1000) * 83 },
};

export const USER_PRICE = {
  translate: { perChar: SARVAM_COST.translate.perChar * 2 },
  tts: { perChar: SARVAM_COST.tts.perChar * 2 },
  stt: { perSecond: SARVAM_COST.stt.perSecond * 2 },
  transliterate: { perChar: SARVAM_COST.transliterate.perChar * 2 },
};

export const USER_PRICE_ELEVENLABS = {
  tts: { perChar: ELEVENLABS_COST.tts.perChar * 2 },
};

export const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
