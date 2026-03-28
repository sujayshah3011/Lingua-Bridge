import { Router, Request, Response } from "express";
import { getCredits, useCredits } from "../lib/credits";

const router = Router();
const SARVAM_BASE = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env["SARVAM_API_KEY"];
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

function requireDevice(
  req: Request,
  res: Response,
  next: () => void
): void {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId || typeof deviceId !== "string") {
    res.status(400).json({ error: "x-device-id header required" });
    return;
  }
  (req as Request & { deviceId: string }).deviceId = deviceId;
  next();
}

router.get("/credits", (req: Request, res: Response) => {
  const deviceId = req.query["deviceId"];
  if (!deviceId || typeof deviceId !== "string") {
    res.status(400).json({ error: "deviceId query param required" });
    return;
  }
  res.json({ credits: getCredits(deviceId) });
});

router.post(
  "/translate",
  requireDevice as unknown as Parameters<typeof router.post>[1],
  async (req: Request, res: Response) => {
    const deviceId = (req as Request & { deviceId: string }).deviceId;
    const { allowed, credits } = useCredits(deviceId, "translate");
    if (!allowed) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits });
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
      const data = await upstream.json();
      res.status(upstream.status).json({ ...data, credits });
    } catch (err) {
      res.status(502).json({ error: "upstream_error", credits });
    }
  }
);

router.post(
  "/detect-language",
  requireDevice as unknown as Parameters<typeof router.post>[1],
  async (req: Request, res: Response) => {
    const deviceId = (req as Request & { deviceId: string }).deviceId;
    try {
      const upstream = await fetch(`${SARVAM_BASE}/detect-language`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": getApiKey(),
        },
        body: JSON.stringify(req.body),
      });
      const data = await upstream.json();
      const credits = getCredits(deviceId);
      res.status(upstream.status).json({ ...data, credits });
    } catch {
      res.status(502).json({ error: "upstream_error" });
    }
  }
);

router.post(
  "/transliterate",
  requireDevice as unknown as Parameters<typeof router.post>[1],
  async (req: Request, res: Response) => {
    const deviceId = (req as Request & { deviceId: string }).deviceId;
    const { allowed, credits } = useCredits(deviceId, "transliterate");
    if (!allowed) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits });
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
      const data = await upstream.json();
      res.status(upstream.status).json({ ...data, credits });
    } catch {
      res.status(502).json({ error: "upstream_error", credits });
    }
  }
);

router.post(
  "/tts",
  requireDevice as unknown as Parameters<typeof router.post>[1],
  async (req: Request, res: Response) => {
    const deviceId = (req as Request & { deviceId: string }).deviceId;
    const { allowed, credits } = useCredits(deviceId, "tts");
    if (!allowed) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits });
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
      const data = await upstream.json();
      res.status(upstream.status).json({ ...data, credits });
    } catch {
      res.status(502).json({ error: "upstream_error", credits });
    }
  }
);

export default router;
