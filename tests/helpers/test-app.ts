import { buildApp } from "@/app";

/**
 * Returns a fresh app instance for tests. Each test should build its own so
 * middleware state (rate-limit counters, etc.) doesn't bleed across tests.
 *
 * NOTE: Set NODE_ENV=test and DATABASE_URL to a test database before importing
 * this. The recommended pattern is `bun test --env-file=.env.test`.
 */
export function makeTestApp() {
  return buildApp();
}

/** Helper to call the app's fetch with a JSON body. */
export async function request(
  app: ReturnType<typeof buildApp>,
  method: string,
  path: string,
  init: { body?: unknown; headers?: Record<string, string>; cookie?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init.cookie ? { cookie: init.cookie } : {}),
    ...(init.headers ?? {}),
  };
  const res = await app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    }),
  );
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  return { status: res.status, body: json, headers: res.headers };
}
