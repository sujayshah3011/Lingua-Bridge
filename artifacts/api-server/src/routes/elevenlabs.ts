import { Router, Request, Response } from "express";
import { synthesizeSpeech, getVoiceId, listVoices } from "../lib/elevenlabs";
import { requireAuth } from "../middlewares/require-auth";
import { chargeUser, refundUser, InsufficientCreditsError } from "../lib/firestore-credits";
import { USER_PRICE_ELEVENLABS, round6 } from "../lib/pricing";

const router = Router();

router.post("/tts", requireAuth, async (req: Request, res: Response) => {
  const uid = req.uid!;
  const body = req.body as {
    inputs?: string[];
    target_language_code?: string;
    speaker?: "female" | "male";
    model?: string;
  };

  const text = body.inputs?.[0]?.slice(0, 5000).trim();
  if (!text) {
    res.status(400).json({ error: "Empty text input" });
    return;
  }

  const cost = round6(text.length * USER_PRICE_ELEVENLABS.tts.perChar);
  let balanceAfter: number;
  try {
    ({ balanceAfter } = await chargeUser(uid, "tts_elevenlabs", cost, {
      chars: text.length,
      targetLang: body.target_language_code,
    }));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits: err.credits });
      return;
    }
    res.status(500).json({ error: "credit_charge_failed" });
    return;
  }

  try {
    // getVoiceId falls back to a default multilingual voice for any language
    // code without a curated voice — ElevenLabs' model reads the language
    // from the input text itself, so passing the real code through (instead
    // of silently swapping to en-IN) lets it attempt the correct language
    // even without a hand-picked voice for it.
    const langCode = body.target_language_code ?? "en-IN";

    const gender = body.speaker === "male" ? "male" : "female";
    const voiceId = getVoiceId(langCode, gender);

    const result = await synthesizeSpeech({
      text,
      voiceId,
      modelId: body.model ?? "eleven_flash_v2_5",
    });

    res.json({ ...result, credits: balanceAfter });
  } catch (error: any) {
    console.error("[ElevenLabs TTS]", error.message);
    await refundUser(uid, cost, "tts_elevenlabs");
    const credits = balanceAfter + cost;

    if (error.status === 401) { res.status(401).json({ error: "Invalid API key", credits }); return; }
    if (error.status === 429) { res.status(429).json({ error: "Rate limited", credits }); return; }
    if (error.status === 402) { res.status(402).json({ error: "Insufficient credits", credits }); return; }

    res.status(502).json({ error: "upstream_error", details: error.message, credits });
  }
});

router.get("/voices", async (_req: Request, res: Response) => {
  try {
    const voices = await listVoices();
    res.json({ voices });
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

export default router;
