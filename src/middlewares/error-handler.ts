import { isProd } from "@/env";
import { AppError, InternalError, NotFoundError } from "@/lib/errors";
import { logger as baseLogger } from "@/lib/logger";
import type { ErrorResponse } from "@/lib/response";
import type { AppBindings } from "@/types/hono";
import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

function body(err: AppError, requestId: string | undefined): ErrorResponse {
  return {
    success: false,
    error: {
      code: err.code,
      message: err.expose ? err.message : "Internal server error",
      ...(err.details !== undefined ? { details: err.details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };
}

function getLogger(c: Context<AppBindings>) {
  try {
    return c.get("logger") ?? baseLogger;
  } catch {
    return baseLogger;
  }
}

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  const requestId = c.get("requestId");
  const log = getLogger(c);

  if (err instanceof AppError) {
    if (err.statusCode >= 500) log.error({ err, requestId }, err.message);
    else log.warn({ code: err.code, requestId }, err.message);
    return c.json(body(err, requestId), err.statusCode as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    const wrapped = new AppError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: err.issues,
    });
    log.warn({ issues: err.issues, requestId }, "validation error");
    return c.json(body(wrapped, requestId), 400);
  }

  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    const wrapped = new AppError({
      statusCode: status,
      code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
      message: err.message || "Request failed",
    });
    log.warn({ status, requestId }, err.message);
    return c.json(body(wrapped, requestId), status);
  }

  const wrapped = new InternalError(
    isProd ? "Internal server error" : err instanceof Error ? err.message : String(err),
    err,
  );
  log.error({ err, requestId }, "unhandled error");
  return c.json(body(wrapped, requestId), 500);
};

export const notFoundHandler: NotFoundHandler<AppBindings> = (c) => {
  const requestId = c.get("requestId");
  const err = new NotFoundError(`Route not found: ${c.req.method} ${new URL(c.req.url).pathname}`);
  return c.json(body(err, requestId), 404);
};
