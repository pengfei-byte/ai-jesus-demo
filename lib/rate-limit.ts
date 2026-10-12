type Bucket = { start: number; count: number };

const buckets = new Map<string, Bucket>();

export function resetLimits(): void {
  buckets.clear();
}

export function allow(key: string, limit: number, windowMs: number, now: number): boolean {
  const current = buckets.get(key);
  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "local";
  return forwarded.split(",")[0]?.trim() || "local";
}
