import { logger as baseLogger } from "@/lib/logger";
import type { AppBindings } from "@/types/hono";
import { createMiddleware } from "hono/factory";

export const requestLogger = createMiddleware<AppBindings>(async (c, next) => {
  const reqId = c.get("requestId");
  const child = baseLogger.child({ requestId: reqId });
  c.set("logger", child);

  const start = performance.now();
  await next();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  const payload = {
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs,
  };

  if (c.res.status >= 500) child.error(payload, "request");
  else if (c.res.status >= 400) child.warn(payload, "request");
  else child.info(payload, "request");
});
