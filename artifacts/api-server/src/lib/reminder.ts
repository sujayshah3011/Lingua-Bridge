// Request validation for routes/reminder.ts — kept import-free so eval/ can test it.

const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/;
const MAX_SCHEDULE_MS = 7 * 24 * 60 * 60 * 1000;

export function validateReminder(body: Record<string, unknown>): string | null {
  if (body["consent"] !== true) return "consent_required";
  if (body["language"] !== "hi-IN") return "only_hindi_supported";
  if (typeof body["phone"] !== "string" || !INDIAN_MOBILE.test(body["phone"])) return "invalid_phone";
  const lines = body["lines"];
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 10) return "invalid_lines";
  if (!lines.every((l) => typeof l === "string" && l.trim() && l.length <= 200)) return "invalid_lines";
  const at = body["scheduledAt"];
  if (at !== undefined) {
    const t = typeof at === "string" ? Date.parse(at) : NaN;
    if (Number.isNaN(t) || t < Date.now() || t > Date.now() + MAX_SCHEDULE_MS) return "invalid_schedule";
  }
  return null;
}
