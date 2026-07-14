import { NextFunction, Request, Response } from "express";
import { adminAuth } from "../lib/firebase-admin";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "MISSING_AUTH_TOKEN" });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    // The real reason (expired token, project-id/audience mismatch between
    // this server's FIREBASE_PROJECT_ID and the app's Firebase config,
    // malformed token, clock skew...) only shows up here — logged so it's
    // visible in the platform's runtime logs instead of a bare 401.
    req.log?.warn({ err }, "requireAuth: token verification failed");
    res.status(401).json({ error: "INVALID_AUTH_TOKEN" });
  }
}
