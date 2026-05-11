import { pingDb } from "@/db";
import { pingRedis } from "@/lib/redis";
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
  checks: z.object({ db: z.boolean(), redis: z.boolean() }),
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
    const [db, redis] = await Promise.all([pingDb(), pingRedis()]);
    const healthy = db && redis;
    const requestId = c.get("requestId");
    if (!healthy) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Dependency check failed",
            details: { db, redis },
            requestId,
          },
        },
        503,
      );
    }
    return c.json(ok({ status: "ok" as const, checks: { db, redis } }), 200);
  });
