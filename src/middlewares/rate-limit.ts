import { env } from "@/env";
import { RateLimitError } from "@/lib/errors";
import { redis } from "@/lib/redis";
import type { AppBindings } from "@/types/hono";
import { rateLimiter } from "hono-rate-limiter";
import type { ClientRateLimitInfo, ConfigType, Store } from "hono-rate-limiter";

// Atomic INCR + first-write EXPIRE + TTL read in one round-trip. Returns
// [currentHits, ttlMs].
const INCR_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

class RedisStore implements Store<AppBindings> {
  readonly localKeys = false;
  prefix = "rl:";
  private windowMs = env.RATE_LIMIT_WINDOW_MS;

  init(options: ConfigType<AppBindings>) {
    this.windowMs = options.windowMs;
  }

  private k(key: string) {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const result = (await redis.eval(INCR_SCRIPT, 1, this.k(key), this.windowMs)) as [
      number,
      number,
    ];
    const [hits, ttlMs] = result;
    const resetTime = new Date(Date.now() + (ttlMs > 0 ? ttlMs : this.windowMs));
    return { totalHits: hits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await redis.decr(this.k(key));
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(this.k(key));
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const [value, ttlMs] = await Promise.all([redis.get(this.k(key)), redis.pttl(this.k(key))]);
    if (value === null) return undefined;
    return {
      totalHits: Number(value),
      resetTime: ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined,
    };
  }
}

export const rateLimit = rateLimiter<AppBindings>({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  store: new RedisStore(),
  keyGenerator: (c) => {
    const fwd = c.req.header("x-forwarded-for");
    const ip = fwd?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const userId = c.get("user")?.id;
    return userId ? `u:${userId}` : `ip:${ip}`;
  },
  handler: () => {
    throw new RateLimitError();
  },
});
