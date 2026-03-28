import { Router, Request, Response } from "express";

const router = Router();
const SARVAM_BASE = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env["SARVAM_API_KEY"];
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

router.post("/translate", async (req: Request, res: Response) => {
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
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.post("/detect-language", async (req: Request, res: Response) => {
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
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.post("/transliterate", async (req: Request, res: Response) => {
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
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.post("/tts", async (req: Request, res: Response) => {
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
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.post("/stt", async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
      method: "POST",
      headers: {
        "api-subscription-key": getApiKey(),
      },
      body: req.body,
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
});

router.get("/credits", (_req: Request, res: Response) => {
  res.json({ credits: 0 });
});

export default router;
