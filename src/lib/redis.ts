import { env, isTest } from "@/env";
import { logger } from "@/lib/logger";
import Redis from "ioredis";

// Single shared client across the app. ioredis auto-reconnects with exponential
// backoff and queues commands until the connection is back.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: isTest ? 1 : null,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 5_000),
});

redis.on("error", (err) => logger.warn({ err }, "redis error"));
redis.on("connect", () => logger.info("redis connected"));
redis.on("reconnecting", () => logger.warn("redis reconnecting"));

export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const reply = await redis.ping();
    return reply === "PONG";
  } catch {
    return false;
  }
}
