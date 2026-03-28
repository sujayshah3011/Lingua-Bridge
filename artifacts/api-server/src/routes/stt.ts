import { Router, Request, Response } from "express";
import multer from "multer";
import { getCredits, useCredits } from "../lib/credits";

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
  upload.single("file"),
  async (req: Request, res: Response) => {
    const deviceId = req.headers["x-device-id"];
    if (!deviceId || typeof deviceId !== "string") {
      res.status(400).json({ error: "x-device-id header required" });
      return;
    }

    const { allowed, credits } = useCredits(deviceId, "stt");
    if (!allowed) {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", credits });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No audio file provided", credits });
      return;
    }

    try {
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      const form = new FormData();
      form.append("file", blob, req.file.originalname ?? "recording.wav");
      form.append("model", "saaras:v2.5");
      form.append("language_code", (req.body.language_code as string) ?? "unknown");
      form.append("mode", "transcribe");
      form.append("with_timestamps", "false");

      const upstream = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
        method: "POST",
        headers: { "api-subscription-key": getApiKey() },
        body: form,
      });

      const data = await upstream.json();
      res.status(upstream.status).json({ ...data, credits });
    } catch {
      res.status(502).json({ error: "upstream_error", credits: getCredits(deviceId) });
    }
  }
);

export default router;
