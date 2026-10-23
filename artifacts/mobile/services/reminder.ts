import { API_BASE, extractErrorDetail, jsonHeaders } from "./api";

// Asks the server to have the Bolna agent phone the patient and read these lines
// verbatim (artifacts/api-server/src/routes/reminder.ts). Hindi only for now.
export async function scheduleReminderCall(params: {
  phone: string; // E.164, e.g. +919876543210
  lines: string[];
  consent: boolean;
  scheduledAt?: string; // ISO 8601; omit to call now
}): Promise<{ executionId: string; credits?: number }> {
  const res = await fetch(`${API_BASE}/reminder-call`, {
    method: "POST",
    headers: await jsonHeaders(),
    body: JSON.stringify({ ...params, language: "hi-IN" }),
  });
  if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (!res.ok) {
    const detail = await extractErrorDetail(res);
    throw new Error(detail || `HTTP_${res.status}`);
  }
  const data = await res.json();
  return { executionId: data.execution_id, credits: data.credits };
}
