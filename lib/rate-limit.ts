import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS } from "@/config/business";
import { upstashConfig } from "@/lib/env";

/**
 * Per-IP limits on the API routes. Upstash Redis in production (shared by every
 * Vercel instance); an in-memory window in development.
 */

export type LimitName = keyof typeof RATE_LIMITS;
export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const WINDOW_MS = 60 * 60 * 1000;
let upstash: Partial<Record<LimitName, Ratelimit>> | null | undefined;

function upstashLimiter(name: LimitName): Ratelimit | null {
  if (upstash === undefined) {
    const config = upstashConfig();
    upstash = config ? {} : null;
    if (!config) console.warn("[rate-limit] Upstash not configured — using in-memory limits (dev only)");
  }
  if (!upstash) return null;
  const config = upstashConfig()!;
  return (upstash[name] ??= new Ratelimit({
    redis: new Redis({ url: config.url, token: config.token }),
    limiter: Ratelimit.slidingWindow(RATE_LIMITS[name], "1 h"),
    prefix: `zf:${name}`,
  }));
}

const memory = new Map<string, number[]>();

function memoryLimit(name: LimitName, id: string, now: number): LimitResult {
  const key = `${name}:${id}`;
  const recent = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMITS[name]) {
    memory.set(key, recent);
    return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  memory.set(key, recent);
  return { ok: true };
}

export async function rateLimit(name: LimitName, req: Request): Promise<LimitResult> {
  const id = clientIp(req);
  const limiter = upstashLimiter(name);
  if (!limiter) return memoryLimit(name, id, Date.now());
  try {
    const { success, reset } = await limiter.limit(id);
    return success ? { ok: true } : { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (err) {
    // Redis down: keep serving customers, but still apply the local limit.
    console.error("[rate-limit] Upstash error, falling back to memory", err);
    return memoryLimit(name, id, Date.now());
  }
}

/** Vercel sets x-forwarded-for to the real client IP (client-sent values are overwritten). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
  );
}
