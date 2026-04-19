type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(
  key: string,
  opts: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }
  if (existing.count >= opts.limit) {
    throw new Error("RATE_LIMITED");
  }
  existing.count += 1;
}
