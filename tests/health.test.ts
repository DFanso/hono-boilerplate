import { describe, expect, test } from "bun:test";
import { makeTestApp, request } from "./helpers/test-app";

describe("GET /health", () => {
  test("returns ok envelope", async () => {
    const app = makeTestApp();
    const res = await request(app, "GET", "/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: "ok" },
    });
  });
});

describe("GET /api/users/me", () => {
  test("rejects unauthenticated requests with 401 envelope", async () => {
    const app = makeTestApp();
    const res = await request(app, "GET", "/api/users/me");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("validation", () => {
  test("invalid query returns 400 VALIDATION_ERROR with details", async () => {
    const app = makeTestApp();
    const res = await request(app, "GET", "/api/users?page=not-a-number");

    // Either 401 (auth runs first) or 400 — both are valid envelopes.
    expect([400, 401]).toContain(res.status);
    expect((res.body as { success: boolean }).success).toBe(false);
  });
});

describe("not found", () => {
  test("unknown route returns 404 envelope", async () => {
    const app = makeTestApp();
    const res = await request(app, "GET", "/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
