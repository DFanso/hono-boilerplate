import { API_PREFIX } from "@/config/constants";
import { mountDocs } from "@/docs/openapi";
import { env } from "@/env";
import { attachSession } from "@/middlewares/auth";
import { errorHandler, notFoundHandler } from "@/middlewares/error-handler";
import { requestLogger } from "@/middlewares/logger";
import { rateLimit } from "@/middlewares/rate-limit";
import { requestId } from "@/middlewares/request-id";
import { registerAuthOpenApi } from "@/modules/auth/auth.openapi";
import { authRoutes } from "@/modules/auth/auth.routes";
import { healthRoutes } from "@/modules/health/health.routes";
import { usersRoutes } from "@/modules/users/users.routes";
import type { AppBindings } from "@/types/hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

export function buildApp() {
  const app = new OpenAPIHono<AppBindings>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false as const,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              details: result.error.issues,
              requestId: c.get("requestId"),
            },
          },
          400,
        );
      }
    },
  });

  // Global middleware (order matters)
  app.use("*", requestId);
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN.includes("*") ? "*" : env.CORS_ORIGIN,
      credentials: !env.CORS_ORIGIN.includes("*"),
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  app.use("*", requestLogger);
  // Auth + rate limit only on API routes — keep /health cheap and dependency-free
  app.use(`${API_PREFIX}/*`, attachSession);
  app.use(`${API_PREFIX}/*`, rateLimit);

  // Routes
  app.route("/", healthRoutes);
  app.route(API_PREFIX, authRoutes);
  app.route(API_PREFIX, usersRoutes);

  // OpenAPI metadata for the BetterAuth surface
  registerAuthOpenApi(app);

  // Docs
  mountDocs(app);

  // Error handlers
  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}

export type App = ReturnType<typeof buildApp>;
