import { auth } from "@/lib/auth";
import type { AppBindings } from "@/types/hono";
import { Hono } from "hono";

/**
 * Mount BetterAuth's built-in handler at /auth/*.
 * BetterAuth owns: /sign-up, /sign-in, /sign-out, /get-session, /verify-email,
 * /reset-password, /change-password, etc. See https://better-auth.com for the
 * full surface. Endpoints are documented in `auth.openapi.ts` for Scalar.
 */
export const authRoutes = new Hono<AppBindings>().on(["GET", "POST"], "/auth/*", (c) =>
  auth.handler(c.req.raw),
);
