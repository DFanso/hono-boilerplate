import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import type { AppBindings, AppVariables } from "@/types/hono";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

/**
 * Returns the authenticated user. Use *only* inside a handler that's behind
 * `requireAuth` — that's where the non-null guarantee is established.
 */
export function getAuthUser(c: Context<AppBindings>): NonNullable<AppVariables["user"]> {
  const user = c.get("user");
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Always resolves the session if present (does not throw).
 * Use this on routes where auth is optional.
 */
export const attachSession = createMiddleware<AppBindings>(async (c, next) => {
  try {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", result?.user ?? null);
    c.set("session", result?.session ?? null);
  } catch {
    // Treat lookup failures (DB down, malformed cookie, etc.) as no session;
    // requireAuth will reject with a clean 401 if the route demands one.
    c.set("user", null);
    c.set("session", null);
  }
  await next();
});

/**
 * Requires an active session. Throws UnauthorizedError if missing.
 * Composes with `attachSession` — if you've already run it, this just checks.
 */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  let user = c.get("user");
  let session = c.get("session");
  if (!user || !session) {
    try {
      const result = await auth.api.getSession({ headers: c.req.raw.headers });
      user = result?.user ?? null;
      session = result?.session ?? null;
      c.set("user", user);
      c.set("session", session);
    } catch {
      // fall through to UnauthorizedError below
    }
  }
  if (!user || !session) throw new UnauthorizedError();
  await next();
});
