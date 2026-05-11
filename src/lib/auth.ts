import { API_PREFIX } from "@/config/constants";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env, isProd, isTest } from "@/env";
import { redis } from "@/lib/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  // BetterAuth defaults to /api/auth. We mount under API_PREFIX (/api/v1) so
  // it needs to know the real base path to match its routes.
  basePath: `${API_PREFIX}/auth`,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Session lookups land in Redis instead of Postgres — fast, expiring naturally.
  // Skipped in tests because the cached payload includes user fields and tests
  // mutate role mid-flight without re-signing in.
  ...(isTest
    ? {}
    : {
        secondaryStorage: {
          get: (key: string) => redis.get(`ba:${key}`),
          set: (key: string, value: string, ttlSeconds?: number) => {
            if (ttlSeconds)
              return redis.set(`ba:${key}`, value, "EX", ttlSeconds).then(() => undefined);
            return redis.set(`ba:${key}`, value).then(() => undefined);
          },
          delete: (key: string) => redis.del(`ba:${key}`).then(() => undefined),
        },
      }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.CORS_ORIGIN.includes("*") ? undefined : env.CORS_ORIGIN,
  user: {
    additionalFields: {
      // RBAC role. `input: false` means clients can't self-assign on sign-up —
      // promotion happens server-side (seed script, admin endpoint, SQL).
      role: { type: "string", defaultValue: "user", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
    // cookieCache pins the signed session payload into the cookie for `maxAge`
    // seconds. Disable in tests so role/profile changes are reflected without
    // a re-sign-in.
    cookieCache: { enabled: !isTest, maxAge: 60 * 5 },
  },
  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: isProd ? "lax" : "lax",
    },
  },
});

export type Auth = typeof auth;
