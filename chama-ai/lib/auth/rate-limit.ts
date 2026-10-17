const buckets = new Map<string, number[]>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterMs: number } {
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    const retryAfterMs = windowMs - (now - recent[0]);
    buckets.set(key, recent);
    return { ok: false, retryAfterMs };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfterMs: 0 };
}
