import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { eq } from "drizzle-orm";
import { makeUser } from "./factories";
import { cleanDb } from "./helpers/db";
import { makeTestApp, request } from "./helpers/test-app";

beforeEach(async () => {
  await cleanDb();
});

describe("RBAC", () => {
  test("admin can list users; non-admin gets 403", async () => {
    const app = makeTestApp();
    const admin = await makeUser({ role: "admin" });
    const alice = await makeUser({ role: "user" });

    const asAdmin = await request(app, "GET", "/api/v1/users", { cookie: admin.cookie });
    expect(asAdmin.status).toBe(200);
    expect((asAdmin.body as { success: boolean }).success).toBe(true);

    const asAlice = await request(app, "GET", "/api/v1/users", { cookie: alice.cookie });
    expect(asAlice.status).toBe(403);
    expect(asAlice.body).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
  });

  test("/users/me returns the authenticated user with role", async () => {
    const app = makeTestApp();
    const alice = await makeUser({ role: "user" });

    const res = await request(app, "GET", "/api/v1/users/me", { cookie: alice.cookie });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { id: alice.user.id, email: alice.user.email, role: "user" },
    });
  });
});

describe("Audit log", () => {
  test("PATCH /users/me records audit entry", async () => {
    const app = makeTestApp();
    const alice = await makeUser();

    const res = await request(app, "PATCH", "/api/v1/users/me", {
      cookie: alice.cookie,
      body: { bio: "from audit test" },
    });
    expect(res.status).toBe(200);

    const rows = await db.select().from(auditLog).where(eq(auditLog.userId, alice.user.id));
    expect(rows.length).toBe(1);
    expect(rows[0]?.action).toBe("user.update");
    expect(rows[0]?.resourceId).toBe(alice.user.id);
  });
});

describe("Idempotency", () => {
  test("same key + same body replays cached response", async () => {
    const app = makeTestApp();
    const alice = await makeUser();
    const headers = { "idempotency-key": "test-key-replay" };

    const first = await request(app, "PATCH", "/api/v1/users/me", {
      cookie: alice.cookie,
      headers,
      body: { bio: "first" },
    });
    expect(first.status).toBe(200);

    const second = await request(app, "PATCH", "/api/v1/users/me", {
      cookie: alice.cookie,
      headers,
      body: { bio: "first" },
    });
    expect(second.status).toBe(200);
    expect(second.headers.get("idempotency-replayed")).toBe("true");
    expect(second.body).toEqual(first.body);

    // Only one audit row — handler ran once.
    const rows = await db.select().from(auditLog).where(eq(auditLog.userId, alice.user.id));
    expect(rows.length).toBe(1);
  });

  test("same key + different body returns 409 IDEMPOTENCY_KEY_REUSED", async () => {
    const app = makeTestApp();
    const alice = await makeUser();
    const headers = { "idempotency-key": "test-key-conflict" };

    const first = await request(app, "PATCH", "/api/v1/users/me", {
      cookie: alice.cookie,
      headers,
      body: { bio: "original" },
    });
    expect(first.status).toBe(200);

    const second = await request(app, "PATCH", "/api/v1/users/me", {
      cookie: alice.cookie,
      headers,
      body: { bio: "different" },
    });
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      success: false,
      error: { code: "IDEMPOTENCY_KEY_REUSED" },
    });
  });
});
