import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import type { UserDtoT } from "@/modules/users/users.schema";
import * as usersService from "@/modules/users/users.service";
import { eq } from "drizzle-orm";

let counter = 0;

export type MakeUserOpts = Partial<{
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
}>;

export type MakeUserResult = {
  user: UserDtoT;
  /** Raw `Cookie:` header value — pass through to the test `request` helper. */
  cookie: string;
};

/**
 * Creates a user via the real BetterAuth flow, then returns their DTO plus the
 * signed cookie a client would carry. Use in integration tests so the code path
 * matches production (password hashing, session creation, etc.).
 */
export async function makeUser(opts: MakeUserOpts = {}): Promise<MakeUserResult> {
  counter += 1;
  const email = opts.email ?? `factory-${Date.now()}-${counter}@example.test`;
  const password = opts.password ?? "factory-password-123";
  const name = opts.name ?? `Factory User ${counter}`;

  const res = await auth.api.signUpEmail({
    body: { email, password, name },
    returnHeaders: true,
  });

  if (opts.role && opts.role !== "user") {
    await db
      .update(userTable)
      .set({ role: opts.role })
      .where(eq(userTable.id, res.response.user.id));
  }

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("BetterAuth did not return a set-cookie header");
  // Re-pack the Set-Cookie value into a Cookie header value (name=value pairs only).
  const cookie = setCookie
    .split(/,(?=[^;]+=)/)
    .map((part) => part.split(";")[0]?.trim())
    .filter((v): v is string => Boolean(v))
    .join("; ");

  const dto = await usersService.getById(res.response.user.id);
  return { user: dto, cookie };
}
