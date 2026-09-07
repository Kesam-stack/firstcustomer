const hits = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function limitOrThrow(req: Request, route: string, limit: number, windowMs = 10 * 60 * 1000) {
  if (!rateLimit(`${route}:${clientIp(req)}`, limit, windowMs)) {
    throw Object.assign(new Error("Too many requests. Wait a few minutes and try again."), { status: 429 });
  }
}
