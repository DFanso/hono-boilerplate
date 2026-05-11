import { REQUEST_ID_HEADER } from "@/config/constants";
import type { AppBindings } from "@/types/hono";
import { createMiddleware } from "hono/factory";

export const requestId = createMiddleware<AppBindings>(async (c, next) => {
  const incoming = c.req.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  c.set("requestId", id);
  c.header(REQUEST_ID_HEADER, id);
  await next();
});
