type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function requestAddress(request: Request): string {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 10_000) for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
  return { allowed: bucket.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return Response.json({ error: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
