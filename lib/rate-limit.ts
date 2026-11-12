type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function ipFromHeaders(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "local").slice(0, 80);
}

/**
 * Fixed-window counter kept in this server process.
 * On multi-instance hosts this slows a single instance; it is not a global lock.
 */
export function allowRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 2000) {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
