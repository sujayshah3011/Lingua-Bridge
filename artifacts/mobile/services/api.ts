import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://2axm7sju4jczjb7uyntvti6kee0gdawy.lambda-url.ap-south-1.on.aws/api";

const DEVICE_ID_KEY = "bhaashai_device_id";
let _deviceId: string | null = null;

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  try {
    const { auth } = await import("./firebase");
    if (auth.currentUser) {
      return `uid_${auth.currentUser.uid}`;
    }
  } catch {}

  if (_deviceId) return _deviceId;
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  _deviceId = id;
  return id;
}

async function getAuthToken(): Promise<string> {
  const { auth } = await import("./firebase");
  if (!auth.currentUser) throw new Error("NOT_SIGNED_IN");
  return auth.currentUser.getIdToken();
}

export async function jsonHeaders(): Promise<Record<string, string>> {
  const [deviceId, token] = await Promise.all([getDeviceId(), getAuthToken()]);
  return {
    "Content-Type": "application/json",
    "x-device-id": deviceId,
    Authorization: `Bearer ${token}`,
  };
}

export async function fileHeaders(): Promise<Record<string, string>> {
  const [deviceId, token] = await Promise.all([getDeviceId(), getAuthToken()]);
  return { "x-device-id": deviceId, Authorization: `Bearer ${token}` };
}

// Best-effort extraction of a human-readable message from a failed
// response, so callers can show/log the real upstream reason instead of
// just an HTTP status code. Falls back to the raw body when the JSON
// shape doesn't match what we expect.
export async function extractErrorDetail(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  if (!body) return "";
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message ?? parsed?.message ?? parsed?.error ?? parsed?.detail;
    if (typeof msg === "string" && msg) return msg;
  } catch {}
  return body.slice(0, 300);
}

export async function fetchCredits(): Promise<number> {
  try {
    const deviceId = await getDeviceId();
    const res = await fetch(`${API_BASE}/sarvam/credits?deviceId=${deviceId}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.credits === "number" ? data.credits : 0;
  } catch {
    return 0;
  }
}
