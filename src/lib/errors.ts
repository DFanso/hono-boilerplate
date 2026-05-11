import { HttpStatus } from "@/lib/http-status";

// AppError accepts any HTTP status (not just the curated set) so it can wrap
// errors thrown by Hono / BetterAuth without fighting the type system.
type HttpStatusCode = number;

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  readonly statusCode: HttpStatusCode;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(opts: {
    statusCode: HttpStatusCode;
    code: ErrorCode;
    message: string;
    details?: unknown;
    expose?: boolean;
    cause?: unknown;
  }) {
    super(opts.message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
    this.expose = opts.expose ?? opts.statusCode < 500;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super({ statusCode: HttpStatus.BAD_REQUEST, code: "VALIDATION_ERROR", message, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super({ statusCode: HttpStatus.UNAUTHORIZED, code: "UNAUTHORIZED", message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super({ statusCode: HttpStatus.FORBIDDEN, code: "FORBIDDEN", message });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super({ statusCode: HttpStatus.NOT_FOUND, code: "NOT_FOUND", message });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super({ statusCode: HttpStatus.CONFLICT, code: "CONFLICT", message, details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super({ statusCode: HttpStatus.TOO_MANY_REQUESTS, code: "RATE_LIMITED", message });
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error", cause?: unknown) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message,
      cause,
      expose: false,
    });
  }
}
