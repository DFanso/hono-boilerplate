import { env } from "@/env";
import { RateLimitError } from "@/lib/errors";
import type { AppBindings } from "@/types/hono";
import { rateLimiter } from "hono-rate-limiter";

export const rateLimit = rateLimiter<AppBindings>({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
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
