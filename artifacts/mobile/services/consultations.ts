import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Message } from "@/components/ConversationBubble";

// Clinic sessions, saved on this phone only (they hold patient conversations, so
// they never leave the device). Each one reopens as "What we agreed" in Records.
export interface Consultation {
  id: string;
  startedAt: number;
  langA: string; // the patient (speaker A)
  langB: string;
  messages: Message[];
}

const KEY = "bhaashai_consultations";
// ponytail: newest 50 in one AsyncStorage entry; move to SQLite if clinics need more.
const MAX = 50;

export async function loadConsultations(): Promise<Consultation[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consultation[]) : [];
  } catch {
    return [];
  }
}

// Insert or replace by id, newest first. Audio clips aren't kept: they live in a
// cache directory the OS may clear.
export async function saveConsultation(c: Consultation): Promise<void> {
  const all = await loadConsultations();
  const slim = { ...c, messages: c.messages.map(({ audioUri: _audio, ...m }) => m) };
  const next = [slim, ...all.filter((x) => x.id !== c.id)].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function deleteConsultation(id: string): Promise<void> {
  const all = await loadConsultations();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((x) => x.id !== id)));
}
