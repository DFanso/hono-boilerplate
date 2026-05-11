import { createHash } from "node:crypto";
import { IdempotencyKeyReusedError } from "@/lib/errors";
import { redis } from "@/lib/redis";
import type { AppBindings } from "@/types/hono";
import { createMiddleware } from "hono/factory";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH"]);
const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const HEADER = "idempotency-key";
const MAX_KEY_LEN = 255;

type CachedEntry = {
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
};

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function redisKey(userId: string, key: string): string {
  return `idem:${userId}:${key}`;
}

/**
 * Idempotency-Key middleware backed by Redis. Opt-in: only kicks in when the
 * header is present on POST/PUT/PATCH AND the request is authenticated.
 * Anonymous requests pass through.
 *
 *   1. Hash (method + path + body) and look up the cache key.
 *   2. Same hash → return the cached response unchanged (+ Idempotency-Replayed: true).
 *   3. Different hash → 409 IDEMPOTENCY_KEY_REUSED.
 *   4. Miss → run the handler, cache the response on 2xx (24h TTL).
 *
 * Caching only 2xx avoids pinning transient failures.
 */
export const idempotency = createMiddleware<AppBindings>(async (c, next) => {
  if (!MUTATING_METHODS.has(c.req.method)) return next();

  const rawKey = c.req.header(HEADER);
  if (!rawKey) return next();
  const key = rawKey.trim();
  if (!key || key.length > MAX_KEY_LEN) return next();

  const user = c.get("user");
  if (!user) return next(); // idempotency requires auth; anon falls through

  const bodyText = await c.req.raw.clone().text();
  const path = new URL(c.req.url).pathname;
  const hash = sha256(`${c.req.method}\n${path}\n${bodyText}`);
  const cacheKey = redisKey(user.id, key);

  const cached = await redis.get(cacheKey);
  if (cached) {
    const entry = JSON.parse(cached) as CachedEntry;
    if (entry.requestHash !== hash) throw new IdempotencyKeyReusedError();
    c.header("Idempotency-Replayed", "true");
    return c.json(entry.responseBody, entry.responseStatus as 200);
  }

  await next();

  if (c.res.status >= 200 && c.res.status < 300) {
    try {
      const cloned = c.res.clone();
      const text = await cloned.text();
      const parsed = text ? JSON.parse(text) : null;
      const entry: CachedEntry = {
        requestHash: hash,
        responseStatus: c.res.status,
        responseBody: parsed,
      };
      // NX: don't overwrite — first writer wins, handles concurrent retries.
      await redis.set(cacheKey, JSON.stringify(entry), "EX", TTL_SECONDS, "NX");
    } catch {
      // Non-JSON response or Redis hiccup — silently skip caching.
    }
  }
});
