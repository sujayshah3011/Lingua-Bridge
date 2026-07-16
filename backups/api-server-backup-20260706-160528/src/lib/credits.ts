const INITIAL_CREDITS = 50;

export const CREDIT_COSTS = {
  translate: 1,
  transliterate: 1,
  tts: 1,
  stt: 2,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

const store = new Map<string, number>();

export function getCredits(deviceId: string): number {
  if (!store.has(deviceId)) store.set(deviceId, INITIAL_CREDITS);
  return store.get(deviceId)!;
}

export function useCredits(
  deviceId: string,
  operation: CreditOperation
): { allowed: boolean; credits: number } {
  const cost = CREDIT_COSTS[operation];
  const current = getCredits(deviceId);
  if (current < cost) return { allowed: false, credits: current };
  const updated = current - cost;
  store.set(deviceId, updated);
  return { allowed: true, credits: updated };
}
