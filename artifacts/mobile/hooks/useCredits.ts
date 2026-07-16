import { doc, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/firebase";

export interface UserStats {
  charsTranslated?: number;
  charsTTS?: number;
  secondsSTT?: number;
  sessionCount?: number;
}

export function useCredits(uid: string | undefined) {
  const [credits, setCreditsState] = useState<number>(0);
  const [totalDebited, setTotalDebited] = useState<number>(0);
  const [stats, setStats] = useState<UserStats>({});
  const [ready, setReady] = useState(false);

  const setCredits = useCallback((n: number) => {
    setCreditsState(n);
  }, []);

  useEffect(() => {
    if (!uid) {
      setReady(true);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCreditsState(data.credits ?? 0);
        setTotalDebited(data.totalDebited ?? 0);
        setStats(data.stats ?? {});
      }
      setReady(true);
    });
    return unsub;
  }, [uid]);

  return { credits, totalDebited, stats, ready, setCredits };
}
