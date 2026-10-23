import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/require-auth";
import { chargeUser, refundUser, InsufficientCreditsError } from "../lib/firestore-credits";
import { USER_PRICE, round6 } from "../lib/pricing";

const router = Router();
const SARVAM_BASE = "https://api.sarvam.ai";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function getApiKey(): string {
  const key = process.env["SARVAM_API_KEY"];
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const uid = req.uid!;

    if (!req.file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const languageCode = (req.body.language_code as string) ?? "";
    const durationSeconds = Math.max(0.5, Number(req.body.duration_seconds) || 0.5);
    const cost = round6(durationSeconds * USER_PRICE.stt.perSecond);

    let balanceAfter: number;
    try {
      ({ balanceAfter } = await chargeUser(uid, "stt", cost, {
        seconds: durationSeconds,
        sourceLang: languageCode,
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
      // saaras:v4 on /speech-to-text transcribes in the spoken language and keeps
      // Hindi number words as spoken ("पौने नौ बजे"), which the translate route
      // then normalizes and checks. The old /speech-to-text-translate call
      // returned *English* regardless of mode, with the numbers already wrong
      // ("पौने नौ" -> "9:45") — measured in eval/out/report-stt.md: v2.5 lost a
      // value in 9.6% of clips, v4 in 0 (its 3 misses there are scorer gaps).
      const validLang = languageCode && languageCode !== "unknown" ? languageCode : "unknown";
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      const form = new FormData();
      form.append("file", blob, req.file.originalname ?? "recording.m4a");
      form.append("model", "saaras:v4");
      form.append("language_code", validLang);

      const upstream = await fetch(`${SARVAM_BASE}/speech-to-text`, {
        method: "POST",
        headers: { "api-subscription-key": getApiKey() },
        body: form,
      });

      const data = (await upstream.json()) as Record<string, unknown>;
      if (!upstream.ok) {
        await refundUser(uid, cost, "stt");
        res.status(upstream.status).json({ ...data, credits: balanceAfter + cost });
        return;
      }
      res.status(upstream.status).json({ ...data, credits: balanceAfter });
    } catch (err) {
      await refundUser(uid, cost, "stt");
      const details = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: "upstream_error", details, credits: balanceAfter + cost });
    }
  }
);

export default router;
