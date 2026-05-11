import { closeDb, db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { closeRedis } from "@/lib/redis";
import { eq } from "drizzle-orm";

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "user";
};

const USERS: SeedUser[] = [
  { email: "admin@example.com", password: "admin1234", name: "Admin", role: "admin" },
  { email: "alice@example.com", password: "alice1234", name: "Alice" },
  { email: "bob@example.com", password: "bobpass1", name: "Bob" },
];

async function ensureUser(u: SeedUser): Promise<{ id: string; created: boolean }> {
  const existing = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, u.email))
    .limit(1);

  if (existing[0]) return { id: existing[0].id, created: false };

  // Use BetterAuth so the password is hashed exactly as the runtime expects.
  const res = await auth.api.signUpEmail({
    body: { email: u.email, password: u.password, name: u.name },
  });
  return { id: res.user.id, created: true };
}

async function main() {
  logger.info("seeding database");
  for (const u of USERS) {
    const { id, created } = await ensureUser(u);
    if (u.role === "admin") {
      await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, id));
    }
    logger.info({ email: u.email, id, created, role: u.role ?? "user" }, "seed user");
  }
  logger.info("seed complete");
}

main()
  .then(async () => {
    await Promise.allSettled([closeDb(), closeRedis()]);
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, "seed failed");
    await Promise.allSettled([closeDb(), closeRedis()]);
    process.exit(1);
  });
