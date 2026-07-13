import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { chargeUser, refundUser, InsufficientCreditsError } from "../lib/firestore-credits";
import { USER_PRICE, round6 } from "../lib/pricing";

const router = Router();
const SARVAM_BASE = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env["SARVAM_API_KEY"];
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

router.post("/translate", requireAuth, async (req: Request, res: Response) => {
  const uid = req.uid!;
  const input = (req.body?.input as string) ?? "";
  const cost = round6(input.length * USER_PRICE.translate.perChar);

  let balanceAfter: number;
  try {
    ({ balanceAfter } = await chargeUser(uid, "translate", cost, {
      chars: input.length,
      sourceLang: req.body?.source_language_code,
      targetLang: req.body?.target_language_code,
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
    const upstream = await fetch(`${SARVAM_BASE}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
      },
      body: JSON.stringify(req.body),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      await refundUser(uid, cost, "translate");
      res.status(upstream.status).json({ ...data, credits: balanceAfter + cost });
      return;
    }
    res.status(upstream.status).json({ ...data, credits: balanceAfter });
  } catch {
    await refundUser(uid, cost, "translate");
    res.status(502).json({ error: "upstream_error", credits: balanceAfter + cost });
  }
});

router.post("/detect-language", requireAuth, async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${SARVAM_BASE}/detect-language`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
      },
      body: JSON.stringify(req.body),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.post("/transliterate", requireAuth, async (req: Request, res: Response) => {
  const uid = req.uid!;
  const input = (req.body?.input as string) ?? "";
  const cost = round6(input.length * USER_PRICE.transliterate.perChar);

  let balanceAfter: number;
  try {
    ({ balanceAfter } = await chargeUser(uid, "transliterate", cost, { chars: input.length }));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits: err.credits });
      return;
    }
    res.status(500).json({ error: "credit_charge_failed" });
    return;
  }

  try {
    const upstream = await fetch(`${SARVAM_BASE}/transliterate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
      },
      body: JSON.stringify(req.body),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      await refundUser(uid, cost, "transliterate");
      res.status(upstream.status).json({ ...data, credits: balanceAfter + cost });
      return;
    }
    res.status(upstream.status).json({ ...data, credits: balanceAfter });
  } catch {
    await refundUser(uid, cost, "transliterate");
    res.status(502).json({ error: "upstream_error", credits: balanceAfter + cost });
  }
});

router.post("/tts", requireAuth, async (req: Request, res: Response) => {
  const uid = req.uid!;
  const text = (req.body?.inputs?.[0] as string) ?? "";
  const cost = round6(text.length * USER_PRICE.tts.perChar);

  let balanceAfter: number;
  try {
    ({ balanceAfter } = await chargeUser(uid, "tts", cost, {
      chars: text.length,
      targetLang: req.body?.target_language_code,
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
    const upstream = await fetch(`${SARVAM_BASE}/text-to-speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
      },
      body: JSON.stringify(req.body),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      await refundUser(uid, cost, "tts");
      res.status(upstream.status).json({ ...data, credits: balanceAfter + cost });
      return;
    }
    res.status(upstream.status).json({ ...data, credits: balanceAfter });
  } catch {
    await refundUser(uid, cost, "tts");
    res.status(502).json({ error: "upstream_error", credits: balanceAfter + cost });
  }
});

export default router;
