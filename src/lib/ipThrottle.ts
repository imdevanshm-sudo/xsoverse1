/** Best-effort per-instance rate limit keyed by client IP. */
export function ipThrottle(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return function throttled(request: Request): boolean {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    if (hits.size > 5_000) {
      hits.forEach((v, k) => {
        if (v.reset < now) hits.delete(k);
      });
    }
    const entry = hits.get(ip);
    if (!entry || entry.reset < now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > limit;
  };
}
