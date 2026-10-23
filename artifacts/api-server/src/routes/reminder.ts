import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { chargeUser, refundUser, InsufficientCreditsError } from "../lib/firestore-credits";
import { validateReminder } from "../lib/reminder";

// Reminder call through a Bolna voice agent: it phones the patient and reads back
// what was agreed in the conversation. The app sends only lines whose numbers the
// translate route verified, and the agent's prompt says to read them verbatim, so
// the call can't invent or round a number. The agent (Hindi) lives in the Bolna
// account; see docs/PLAN.md W5.

const router = Router();
const BOLNA_BASE = "https://api.bolna.ai";
// ponytail: flat price per call, not per minute — calls are capped at ~2 min by
// the agent prompt; meter by execution duration if longer calls appear.
const CALL_PRICE_INR = 10;
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const key = process.env["BOLNA_API_KEY"];
  const agentId = process.env["BOLNA_AGENT_ID"];
  if (!key || !agentId) {
    res.status(503).json({ error: "reminder_calls_not_configured" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const invalid = validateReminder(body);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const lines = body["lines"] as string[];

  const uid = req.uid!;
  let balanceAfter: number;
  try {
    ({ balanceAfter } = await chargeUser(uid, "reminder_call", CALL_PRICE_INR));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits: err.credits });
      return;
    }
    res.status(500).json({ error: "credit_charge_failed" });
    return;
  }

  try {
    const upstream = await fetch(`${BOLNA_BASE}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        agent_id: agentId,
        recipient_phone_number: body["phone"],
        ...(body["scheduledAt"] ? { scheduled_at: body["scheduledAt"] } : {}),
        user_data: {
          clinic_name: "BhaashAI",
          instructions: lines.map((l, i) => `${i + 1}. ${l.trim()}`).join("\n"),
        },
      }),
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      await refundUser(uid, CALL_PRICE_INR, "reminder_call");
      req.log.warn({ status: upstream.status, data }, "bolna call rejected");
      res.status(502).json({ error: "call_failed", details: data["message"] ?? data, credits: balanceAfter + CALL_PRICE_INR });
      return;
    }
    res.json({ execution_id: data["execution_id"], status: data["status"], credits: balanceAfter });
  } catch (err) {
    await refundUser(uid, CALL_PRICE_INR, "reminder_call");
    const details = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "upstream_error", details, credits: balanceAfter + CALL_PRICE_INR });
  }
});

export default router;
