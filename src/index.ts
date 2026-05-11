import { buildApp } from "@/app";
import { closeDb } from "@/db";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { closeRedis } from "@/lib/redis";

const app = buildApp();

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  development: env.NODE_ENV !== "production",
});

logger.info(
  { port: server.port, env: env.NODE_ENV, docs: `${env.BETTER_AUTH_URL}/docs` },
  "server started",
);

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  try {
    server.stop(false);
    await Promise.allSettled([closeDb(), closeRedis()]);
    logger.info("shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "shutdown error");
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandled rejection");
  process.exit(1);
});
