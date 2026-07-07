import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://lingua-bridge.onrender.com/api";

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

export async function jsonHeaders(): Promise<Record<string, string>> {
  const deviceId = await getDeviceId();
  return {
    "Content-Type": "application/json",
    "x-device-id": deviceId,
  };
}

export async function fileHeaders(): Promise<Record<string, string>> {
  const deviceId = await getDeviceId();
  return { "x-device-id": deviceId };
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
