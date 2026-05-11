import { pingDb } from "@/db";
import { ok } from "@/lib/response";
import { ErrorBodySchema, successSchema } from "@/lib/response";
import type { AppBindings } from "@/types/hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const HealthSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
});

const ReadySchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({ db: z.boolean() }),
});

const liveRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Liveness probe",
  responses: {
    200: {
      description: "Service is alive",
      content: { "application/json": { schema: successSchema(HealthSchema) } },
    },
  },
});

const readyRoute = createRoute({
  method: "get",
  path: "/health/ready",
  tags: ["Health"],
  summary: "Readiness probe (checks DB)",
  responses: {
    200: {
      description: "Service is ready",
      content: { "application/json": { schema: successSchema(ReadySchema) } },
    },
    503: {
      description: "Service is not ready",
      content: { "application/json": { schema: ErrorBodySchema } },
    },
  },
});

export const healthRoutes = new OpenAPIHono<AppBindings>()
  .openapi(liveRoute, (c) =>
    c.json(
      ok({
        status: "ok" as const,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
      200,
    ),
  )
  .openapi(readyRoute, async (c) => {
    const db = await pingDb();
    const status = db ? ("ok" as const) : ("degraded" as const);
    const requestId = c.get("requestId");
    if (!db) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Dependency check failed",
            details: { db },
            requestId,
          },
        },
        503,
      );
    }
    return c.json(ok({ status, checks: { db } }), 200);
  });
