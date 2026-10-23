import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { chargeUser, refundUser, InsufficientCreditsError } from "../lib/firestore-credits";
import { USER_PRICE, round6 } from "../lib/pricing";
import { normalizeHindiNumbers } from "../lib/hindi-numbers";
import { checkNumbers, type NumberCheck } from "../lib/number-check";

const router = Router();
const SARVAM_BASE = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env["SARVAM_API_KEY"];
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

async function sarvamTranslate(body: unknown) {
  const upstream = await fetch(`${SARVAM_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": getApiKey() },
    body: JSON.stringify(body),
  });
  return { upstream, data: (await upstream.json()) as Record<string, unknown> };
}

// Only the number check uses this; not billed to the user (eval/ measured it as
// needed for ~5% of translations).
async function backTranslate(text: string, source: string, model: unknown): Promise<string> {
  const { upstream, data } = await sarvamTranslate({
    input: text, source_language_code: source, target_language_code: "en-IN", mode: "formal", model,
  });
  if (!upstream.ok) throw new Error(`back-translation ${upstream.status}`);
  return String(data["translated_text"] ?? "");
}

router.post("/translate", requireAuth, async (req: Request, res: Response) => {
  const uid = req.uid!;
  const source = req.body?.source_language_code as string | undefined;
  const target = req.body?.target_language_code as string | undefined;
  // "पौने नौ बजे" → "8:45 बजे" etc. before Sarvam sees it — see lib/hindi-numbers.ts.
  const rawInput = (req.body?.input as string) ?? "";
  const input = source === "hi-IN" ? normalizeHindiNumbers(rawInput) : rawInput;
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
    const { upstream, data: first } = await sarvamTranslate({ ...req.body, input });
    let data = first;
    if (!upstream.ok) {
      await refundUser(uid, cost, "translate");
      res.status(upstream.status).json({ ...data, credits: balanceAfter + cost });
      return;
    }

    // A failed check must not fail a translation the user already paid for —
    // the client treats a missing number_check as "not verified".
    let number_check: NumberCheck | undefined;
    try {
      const back = target && target !== "en-IN"
        ? (text: string) => backTranslate(text, target, req.body?.model)
        : null;
      number_check = await checkNumbers(input, String(data["translated_text"] ?? ""), back);
      // Normalizing can itself trip the model ("2500 रुपये" → "$2500" in eval/), so on
      // a failed check try the user's own wording too and keep it if it passes.
      // Checked against the normalized input, whose numbers are digits.
      if (!number_check.ok && input !== rawInput) {
        const alt = await sarvamTranslate({ ...req.body, input: rawInput });
        if (alt.upstream.ok) {
          const altCheck = await checkNumbers(input, String(alt.data["translated_text"] ?? ""), back);
          if (altCheck.ok) {
            data = alt.data;
            number_check = altCheck;
          }
        }
      }
      if (!number_check.ok) req.log.warn({ number_check, source, target }, "number check failed");
    } catch (err) {
      req.log.error({ err }, "number check errored");
    }
    // normalized_input lets the app read the numbers back to the speaker ("You said: 8:45").
    const normalized_input = input !== rawInput ? input : undefined;
    res.status(upstream.status).json({ ...data, number_check, normalized_input, credits: balanceAfter });
  } catch (err) {
    await refundUser(uid, cost, "translate");
    const details = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "upstream_error", details, credits: balanceAfter + cost });
  }
});

router.post("/detect-language", requireAuth, async (req: Request, res: Response) => {
  try {
    // Sarvam's actual endpoint is /text-lid, not /detect-language — this was
    // 404ing silently because the client's detectLanguage() catches any
    // non-OK response and falls back to "en-IN", masking the failure.
    const upstream = await fetch(`${SARVAM_BASE}/text-lid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
      },
      body: JSON.stringify(req.body),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    res.status(upstream.status).json(data);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "upstream_error", details });
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
  } catch (err) {
    await refundUser(uid, cost, "transliterate");
    const details = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "upstream_error", details, credits: balanceAfter + cost });
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
  } catch (err) {
    await refundUser(uid, cost, "tts");
    const details = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "upstream_error", details, credits: balanceAfter + cost });
  }
});

export default router;
