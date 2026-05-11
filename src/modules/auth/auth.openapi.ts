import { API_PREFIX } from "@/config/constants";
import { ErrorBodySchema, successSchema } from "@/lib/response";
import type { AppBindings } from "@/types/hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";

const SignUpBody = z.object({
  email: z.string().email().openapi({ example: "alice@example.com" }),
  password: z.string().min(8),
  name: z.string().min(1),
});

const SignInBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SessionUser = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
});

const AuthSuccess = z.object({
  user: SessionUser,
  token: z.string().optional(),
});

const SessionResponse = z
  .object({
    user: SessionUser,
    session: z.object({
      id: z.string(),
      expiresAt: z.string(),
      userId: z.string(),
    }),
  })
  .nullable();

/**
 * BetterAuth owns the runtime for these endpoints (see `auth.routes.ts`).
 * Here we *only* register OpenAPI metadata so they appear in Scalar.
 */
export function registerAuthOpenApi(app: OpenAPIHono<AppBindings>) {
  const reg = app.openAPIRegistry;

  reg.registerPath({
    method: "post",
    path: `${API_PREFIX}/auth/sign-up/email`,
    tags: ["Auth"],
    summary: "Email + password sign-up",
    request: { body: { content: { "application/json": { schema: SignUpBody } } } },
    responses: {
      200: { description: "Signed up", content: { "application/json": { schema: AuthSuccess } } },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      409: {
        description: "Email already exists",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });

  reg.registerPath({
    method: "post",
    path: `${API_PREFIX}/auth/sign-in/email`,
    tags: ["Auth"],
    summary: "Email + password sign-in",
    request: { body: { content: { "application/json": { schema: SignInBody } } } },
    responses: {
      200: { description: "Signed in", content: { "application/json": { schema: AuthSuccess } } },
      401: {
        description: "Invalid credentials",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });

  reg.registerPath({
    method: "post",
    path: `${API_PREFIX}/auth/sign-out`,
    tags: ["Auth"],
    summary: "Sign out",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Signed out",
        content: { "application/json": { schema: successSchema(z.object({})) } },
      },
    },
  });

  reg.registerPath({
    method: "get",
    path: `${API_PREFIX}/auth/get-session`,
    tags: ["Auth"],
    summary: "Get current session",
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: "Active session",
        content: { "application/json": { schema: SessionResponse } },
      },
    },
  });
}
