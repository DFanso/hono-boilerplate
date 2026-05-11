import { db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { logger as baseLogger } from "@/lib/logger";
import type { AppBindings } from "@/types/hono";
import type { Context } from "hono";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.role_change"
  | "auth.signin"
  | "auth.signout"
  | (string & {}); // allow forward-extension without losing autocomplete

export type AuditOptions = {
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an audit log entry. Best-effort — DB failures are logged but never
 * thrown so audit issues can't break the request that triggered them. Call this
 * *after* the action has succeeded so we don't record phantom events.
 */
export async function recordAudit(
  c: Context<AppBindings>,
  action: AuditAction,
  opts: AuditOptions = {},
): Promise<void> {
  const user = c.get("user");
  const headers = c.req.raw.headers;
  const ipFwd = headers.get("x-forwarded-for");
  const ip = ipFwd?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;

  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: user?.id ?? null,
      action,
      resourceType: opts.resourceType ?? null,
      resourceId: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
      ipAddress: ip,
      userAgent: headers.get("user-agent"),
    });
  } catch (err) {
    const log = c.get("logger") ?? baseLogger;
    log.warn({ err, action }, "audit log insert failed");
  }
}
