import { db } from "@/db";
import { redis } from "@/lib/redis";
import { sql } from "drizzle-orm";

const TABLES = ["audit_log", "user_profile", "verification", "account", "session", "user"];

/**
 * Wipes all app tables in FK-safe order. Call in `beforeEach` if your test
 * suite needs isolation. Skipped if NODE_ENV !== "test" as a safety net.
 */
export async function cleanDb(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("cleanDb() refuses to run outside NODE_ENV=test");
  }
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`));
  await redis.flushdb();
}
