import * as schema from "@/db/schema";
import { env, isProd } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const queryClient = postgres(env.DATABASE_URL, {
  max: isProd ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema, logger: false });

export async function closeDb(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}

export async function pingDb(): Promise<boolean> {
  try {
    await queryClient`select 1`;
    return true;
  } catch {
    return false;
  }
}

export type DB = typeof db;
export { schema };
