import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { USER_PRICE, USER_PRICE_ELEVENLABS } from "@/constants/pricing";
import { db } from "./firebase";

const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

async function atomicDeduct({
  uid,
  type,
  chars = null,
  seconds = null,
  userCharged,
  sourceLang = null,
  targetLang = null,
}: {
  uid: string;
  type: string;
  chars?: number | null;
  seconds?: number | null;
  userCharged: number;
  sourceLang?: string | null;
  targetLang?: string | null;
}): Promise<{ balanceBefore: number; balanceAfter: number }> {
  const userRef = doc(db, "users", uid);
  let balanceBefore = 0;
  let balanceAfter = 0;

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(userRef);
    if (!snap.exists()) throw new Error("USER_NOT_FOUND");

    balanceBefore = snap.data().credits ?? 0;

    if (balanceBefore < userCharged) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    balanceAfter = round6(balanceBefore - userCharged);

    txn.update(userRef, {
      credits: balanceAfter,
      totalDebited: increment(round6(userCharged)),
    });
  });

  await addDoc(collection(db, "transactions"), {
    uid,
    type,
    chars,
    seconds,
    userCharged: round6(userCharged),
    balanceBefore: round6(balanceBefore),
    balanceAfter: round6(balanceAfter),
    sourceLang,
    targetLang,
    success: true,
    timestamp: serverTimestamp(),
  });

  return { balanceBefore, balanceAfter };
}

export async function chargeTranslate(
  uid: string,
  text: string,
  sourceLang: string,
  targetLang: string
) {
  const chars = text.length;
  const userCharged = round6(chars * USER_PRICE.translate.perChar);
  if (__DEV__) {
    console.log(`[CREDIT] translate: ${chars} chars → ₹${userCharged.toFixed(6)}`);
  }
  await atomicDeduct({ uid, type: "translate", chars, userCharged, sourceLang, targetLang });
  await updateDoc(doc(db, "users", uid), { "stats.charsTranslated": increment(chars) });
  return { chars, cost: userCharged };
}

export async function chargeTTS(
  uid: string,
  text: string,
  targetLang: string,
  provider: "sarvam" | "elevenlabs" = "sarvam"
) {
  const chars = text.length;
  const rate = provider === "elevenlabs" ? USER_PRICE_ELEVENLABS.tts.perChar : USER_PRICE.tts.perChar;
  const userCharged = round6(chars * rate);
  if (__DEV__) {
    console.log(`[CREDIT] tts(${provider}): ${chars} chars → ₹${userCharged.toFixed(6)}`);
  }
  await atomicDeduct({
    uid,
    type: provider === "elevenlabs" ? "tts_elevenlabs" : "tts",
    chars,
    userCharged,
    targetLang,
  });
  await updateDoc(doc(db, "users", uid), { "stats.charsTTS": increment(chars) });
  return { chars, cost: userCharged };
}

export async function chargeSTT(uid: string, audioSeconds: number, sourceLang: string) {
  const billable = round6(Math.max(0.5, audioSeconds));
  const userCharged = round6(billable * USER_PRICE.stt.perSecond);
  if (__DEV__) {
    console.log(`[CREDIT] stt: ${billable.toFixed(2)}s (raw ${audioSeconds.toFixed(2)}s) → ₹${userCharged.toFixed(6)}`);
  }
  await atomicDeduct({ uid, type: "stt", seconds: billable, userCharged, sourceLang });
  await updateDoc(doc(db, "users", uid), { "stats.secondsSTT": increment(billable) });
  return { seconds: billable, cost: userCharged };
}

export async function chargeTransliterate(uid: string, text: string) {
  const chars = text.length;
  const userCharged = round6(chars * USER_PRICE.transliterate.perChar);
  if (__DEV__) {
    console.log(`[CREDIT] transliterate: ${chars} chars → ₹${userCharged.toFixed(6)}`);
  }
  await atomicDeduct({ uid, type: "transliterate", chars, userCharged });
  return { chars, cost: userCharged };
}

export function estimateCost(
  type: "translate" | "tts" | "stt" | "transliterate",
  quantity: number
): number {
  const rates = {
    translate: USER_PRICE.translate.perChar,
    tts: USER_PRICE.tts.perChar,
    stt: USER_PRICE.stt.perSecond,
    transliterate: USER_PRICE.transliterate.perChar,
  };
  return round6(quantity * rates[type]);
}

export async function assertSufficientCredits(
  uid: string,
  type: "translate" | "tts" | "stt" | "transliterate",
  quantity: number
): Promise<void> {
  const snap = await getDoc(doc(db, "users", uid));
  const balance = snap.data()?.credits ?? 0;
  const needed = estimateCost(type, quantity);
  if (balance < needed) throw new Error("INSUFFICIENT_CREDITS");
}

export async function getBalance(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.data()?.credits ?? 0;
}
