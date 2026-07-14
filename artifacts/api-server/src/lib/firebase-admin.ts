import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// PEM keys pasted into a platform's env var box routinely get their
// newlines or \n escapes mangled. FIREBASE_PRIVATE_KEY_B64 (the whole PEM,
// base64-encoded) sidesteps that entirely — prefer it when set.
function resolvePrivateKey(): string | undefined {
  const b64 = process.env["FIREBASE_PRIVATE_KEY_B64"];
  if (b64) return Buffer.from(b64, "base64").toString("utf8");

  const raw = process.env["FIREBASE_PRIVATE_KEY"];
  if (!raw) return undefined;
  // Strip accidental wrapping quotes, then turn literal \n back into newlines.
  return raw.replace(/^"(.*)"$/s, "$1").replace(/\\n/g, "\n");
}

function buildApp() {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = resolvePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY(_B64) must be set (Firebase service account credentials)."
    );
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY does not look like a PEM key after decoding — check it was set correctly (prefer FIREBASE_PRIVATE_KEY_B64)."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const app = getApps().length === 0 ? buildApp() : getApps()[0]!;

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
