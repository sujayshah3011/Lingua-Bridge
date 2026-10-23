import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { round6 } from "./pricing";

export type ChargeType = "translate" | "tts" | "tts_elevenlabs" | "stt" | "transliterate" | "reminder_call";

export class InsufficientCreditsError extends Error {
  credits: number;
  constructor(credits: number) {
    super("INSUFFICIENT_CREDITS");
    this.credits = credits;
  }
}

// Deducts atomically before the upstream call is made — the cost of a
// translate/tts/stt call is fully determined by its input size, so there's
// no need to wait for the response to know what to charge. Call refundUser
// if the upstream call then fails, so a failed request doesn't cost credits.
export async function chargeUser(
  uid: string,
  type: ChargeType,
  userCharged: number,
  meta: { chars?: number; seconds?: number; sourceLang?: string; targetLang?: string } = {}
): Promise<{ balanceAfter: number }> {
  const userRef = adminDb.collection("users").doc(uid);
  let balanceBefore = 0;
  let balanceAfter = 0;

  await adminDb.runTransaction(async (txn) => {
    const snap = await txn.get(userRef);
    if (!snap.exists) throw new Error("USER_NOT_FOUND");

    balanceBefore = snap.data()?.["credits"] ?? 0;
    if (balanceBefore < userCharged) throw new InsufficientCreditsError(balanceBefore);

    balanceAfter = round6(balanceBefore - userCharged);
    txn.update(userRef, {
      credits: balanceAfter,
      totalDebited: FieldValue.increment(round6(userCharged)),
    });
  });

  await adminDb.collection("transactions").add({
    uid,
    type,
    chars: meta.chars ?? null,
    seconds: meta.seconds ?? null,
    userCharged: round6(userCharged),
    balanceBefore: round6(balanceBefore),
    balanceAfter: round6(balanceAfter),
    sourceLang: meta.sourceLang ?? null,
    targetLang: meta.targetLang ?? null,
    success: true,
    timestamp: FieldValue.serverTimestamp(),
  });

  const statKey =
    type === "stt" ? "stats.secondsSTT" : type === "translate" ? "stats.charsTranslated" : "stats.charsTTS";
  await userRef.update({ [statKey]: FieldValue.increment(meta.seconds ?? meta.chars ?? 0) });

  return { balanceAfter };
}

export async function refundUser(uid: string, amount: number, type: ChargeType): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  await userRef.update({
    credits: FieldValue.increment(round6(amount)),
    totalDebited: FieldValue.increment(-round6(amount)),
  });
  await adminDb.collection("transactions").add({
    uid,
    type: `refund_${type}`,
    userCharged: -round6(amount),
    note: "Upstream call failed after charge",
    success: true,
    timestamp: FieldValue.serverTimestamp(),
  });
}
