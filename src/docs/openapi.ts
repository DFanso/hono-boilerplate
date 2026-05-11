import { env } from "@/env";
import type { AppBindings } from "@/types/hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";

export function mountDocs(app: OpenAPIHono<AppBindings>) {
  app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  });

  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Hono Boilerplate API",
      version: "0.1.0",
      description:
        "Production-grade Hono + Bun API. All responses follow `{ success, data | error, meta? }`.",
    },
    servers: [{ url: env.BETTER_AUTH_URL }],
  });

  app.get(
    "/docs",
    apiReference({
      spec: { url: "/openapi.json" },
      theme: "default",
      pageTitle: "Hono Boilerplate API",
    }),
  );
}
