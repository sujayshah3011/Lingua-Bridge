import { Router, Request, Response } from "express";
import { synthesizeSpeech, getVoiceId, isLangSupported, listVoices } from "../lib/elevenlabs";

const router = Router();

router.post("/tts", async (req: Request, res: Response) => {
  try {
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

    const langCode = body.target_language_code && isLangSupported(body.target_language_code)
      ? body.target_language_code
      : "en-IN";

    const gender = body.speaker === "male" ? "male" : "female";
    const voiceId = getVoiceId(langCode, gender);

    const result = await synthesizeSpeech({
      text,
      voiceId,
      modelId: body.model ?? "eleven_multilingual_v2",
    });

    res.json(result);
  } catch (error: any) {
    console.error("[ElevenLabs TTS]", error.message);

    if (error.status === 401) { res.status(401).json({ error: "Invalid API key" }); return; }
    if (error.status === 429) { res.status(429).json({ error: "Rate limited" }); return; }
    if (error.status === 402) { res.status(402).json({ error: "Insufficient credits" }); return; }

    res.status(502).json({ error: "upstream_error", details: error.message });
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
