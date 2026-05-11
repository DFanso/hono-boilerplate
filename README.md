# Hono + Bun Boilerplate

<p align="left">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.x-000000?style=for-the-badge&logo=bun&logoColor=fbf0df" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Hono" src="https://img.shields.io/badge/Hono-4.x-E36002?style=for-the-badge&logo=hono&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" />
  <img alt="BetterAuth" src="https://img.shields.io/badge/BetterAuth-1.x-000000?style=for-the-badge" />
  <img alt="Zod" src="https://img.shields.io/badge/Zod-3.x-3E67B1?style=for-the-badge&logo=zod&logoColor=white" />
  <img alt="OpenAPI" src="https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white" />
  <img alt="Scalar" src="https://img.shields.io/badge/Scalar-Docs-1B1B1B?style=for-the-badge" />
  <img alt="Pino" src="https://img.shields.io/badge/Pino-9.x-687634?style=for-the-badge" />
  <img alt="Biome" src="https://img.shields.io/badge/Biome-1.9-60A5FA?style=for-the-badge&logo=biome&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-multi--stage-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img alt="GitHub Actions" src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
</p>

Production-grade Hono + Bun backend template — Scalar/OpenAPI docs, BetterAuth, Drizzle on Postgres, Redis-backed rate limiting + idempotency + session cache, RBAC with audit logging, versioned `/api/v1` surface, typed response envelope. Clone, set env vars, ship.

---

## Stack

| Concern            | Choice                                                                              |
|--------------------|-------------------------------------------------------------------------------------|
| Runtime            | **Bun** 1.x                                                                         |
| Framework          | **Hono** 4                                                                          |
| Language           | **TypeScript** 5 (strict, `noUncheckedIndexedAccess`)                               |
| API docs           | `@hono/zod-openapi` (schema-first) + `@scalar/hono-api-reference`                   |
| Validation         | **Zod** — request + env + OpenAPI all share one schema                              |
| Auth               | **BetterAuth** (Drizzle adapter, email + password, role via `additionalFields`)     |
| RDBMS              | **Postgres** 16 + **Drizzle** ORM + Drizzle Kit migrations (postgres-js driver)     |
| Cache / KV         | **Redis** 7 (idempotency cache, rate-limit store, BetterAuth secondary storage)     |
| Logging            | **Pino** (pretty in dev, JSON in prod), per-request child loggers, request IDs      |
| Security           | `secureHeaders`, `cors`, distributed rate limiter, request size discipline          |
| RBAC               | `role` column + `requireRole("admin")` middleware + `audit_log` table               |
| Idempotency        | `Idempotency-Key` header on POST/PUT/PATCH, 24h TTL in Redis                        |
| Versioning         | `/api/v1` prefix from a single constant                                             |
| Lint / Format      | **Biome** (one tool, no ESLint/Prettier)                                            |
| Tests              | `bun test` + integration tests using real Postgres + Redis                          |
| Containers         | Multi-stage Bun **Dockerfile** + `docker-compose.yml` (app + Postgres + Redis)      |
| CI                 | **GitHub Actions** (lint → typecheck → migrate → test → build)                      |
| Git hooks          | `simple-git-hooks` + `lint-staged` (pre-commit Biome check on staged files)         |

---

## Quick start

```bash
cp .env.example .env             # fill BETTER_AUTH_SECRET (>= 32 chars), DATABASE_URL, REDIS_URL
docker compose up -d postgres redis
bun install
bun run db:push                  # dev shortcut — use db:generate + db:migrate in prod
bun run db:seed                  # optional: creates admin@example.com / admin1234 + sample users
bun run dev                      # http://localhost:3000
```

| Endpoint                | What it gives you                                       |
|-------------------------|---------------------------------------------------------|
| `GET /docs`             | Scalar interactive API explorer                         |
| `GET /openapi.json`     | OpenAPI 3.1 spec                                        |
| `GET /health`           | Liveness                                                |
| `GET /health/ready`     | Readiness — pings Postgres + Redis                      |
| `POST /api/v1/auth/sign-up/email` | Email + password sign-up                      |
| `POST /api/v1/auth/sign-in/email` | Email + password sign-in (returns cookie)     |
| `GET /api/v1/users/me`  | Current user (requires session cookie)                  |
| `GET /api/v1/users`     | List users — **admin only**                             |

---

## Scripts

| Script                  | Purpose                                              |
|-------------------------|------------------------------------------------------|
| `bun run dev`           | Start dev server with hot reload                     |
| `bun run build`         | Bundle to `dist/`                                    |
| `bun run start`         | Run the prod bundle                                  |
| `bun run typecheck`     | `tsc --noEmit`                                       |
| `bun run lint`          | Biome lint + format check                            |
| `bun run lint:fix`      | Auto-fix lint/format issues                          |
| `bun test`              | Run unit + integration tests                         |
| `bun run db:generate`   | Generate a new migration from schema                 |
| `bun run db:migrate`    | Apply migrations (production path)                   |
| `bun run db:push`       | Push schema directly (dev only)                      |
| `bun run db:studio`     | Open Drizzle Studio                                  |
| `bun run db:seed`       | Idempotent seed: 1 admin + 2 sample users            |
| `bun run auth:generate` | Regenerate the BetterAuth schema file                |

---

## Project layout

```
src/
├── index.ts                # Bun.serve + graceful shutdown (closes Postgres + Redis)
├── app.ts                  # OpenAPIHono + middleware order + route registration
├── env.ts                  # Zod-validated process.env (fails fast at startup)
├── config/constants.ts     # API_PREFIX = "/api/v1", pagination defaults
├── db/
│   ├── index.ts            # Drizzle client, pingDb, closeDb
│   ├── seed.ts             # bun run db:seed entry
│   └── schema/             # auth.ts (BetterAuth), users.ts (profile), audit.ts
├── lib/
│   ├── auth.ts             # BetterAuth instance (Redis secondary storage)
│   ├── audit.ts            # recordAudit(c, action, opts) — best-effort, swallows errors
│   ├── redis.ts            # ioredis client + pingRedis + closeRedis
│   ├── logger.ts           # Pino root logger
│   ├── errors.ts           # AppError + typed subclasses
│   ├── response.ts         # ok(), paginated(), successSchema(), ErrorBodySchema
│   └── http-status.ts
├── middlewares/
│   ├── request-id.ts       # Reads or generates x-request-id
│   ├── logger.ts           # Per-request child logger + access logs
│   ├── auth.ts             # attachSession, requireAuth, requireRole, getAuthUser
│   ├── rate-limit.ts       # Redis-backed sliding-window limiter
│   ├── idempotency.ts      # Idempotency-Key header → Redis cache (24h)
│   └── error-handler.ts    # Single source of truth for error envelopes
├── modules/
│   ├── health/             # /health, /health/ready
│   ├── auth/               # BetterAuth handler + OpenAPI docs
│   └── users/              # Sample CRUD: schemas / routes / handlers / service
└── docs/openapi.ts         # /openapi.json + /docs (Scalar)
tests/
├── factories/users.ts      # makeUser({ role }) — real BetterAuth flow
├── helpers/db.ts           # cleanDb() — truncate + Redis flushdb (test-only)
├── helpers/test-app.ts     # makeTestApp(), request() (accepts cookie)
├── health.test.ts
└── users.test.ts           # RBAC + audit log + idempotency integration tests
```

---

## Response contract

Every response is a discriminated union. Build them with the helpers in `src/lib/response.ts` — never hand-write the envelope.

**Success**
```json
{ "success": true, "data": { /* T */ }, "meta": { "requestId": "..." } }
```

**Paginated**
```json
{
  "success": true,
  "data": [ /* T[] */ ],
  "meta": { "requestId": "...", "pagination": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 } }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [ /* Zod issues, optional */ ],
    "requestId": "..."
  }
}
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `IDEMPOTENCY_KEY_REUSED` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `SERVICE_UNAVAILABLE` (503).

---

## RBAC

The `user` table has a `role` column (`"user"` | `"admin"`, default `"user"`), surfaced through BetterAuth's `additionalFields` so it flows into `c.get("user").role`. Promotion is server-side only — clients can't self-assign on sign-up.

Compose middleware:
```ts
import { requireAuth, requireRole } from "@/middlewares/auth";

const adminOnly = createRoute({
  // ...
  middleware: [requireAuth, requireRole("admin")] as const,
});
```

Promote a user:
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'alice@example.com';
```

The seed script (`bun run db:seed`) creates `admin@example.com / admin1234` as a starting admin.

---

## Audit log

`audit_log` records sensitive actions (FK to user, indexed by user + by resource). Call it from handlers *after* a successful mutation:

```ts
import { recordAudit } from "@/lib/audit";

await recordAudit(c, "user.update", {
  resourceType: "user",
  resourceId: user.id,
  metadata: { fields: Object.keys(body) },
});
```

Audit writes are best-effort — DB failures are logged but never re-thrown.

---

## Idempotency

Clients opt in by sending an `Idempotency-Key` header on `POST` / `PUT` / `PATCH`. The middleware (`src/middlewares/idempotency.ts`):

1. Hashes `method + path + body`.
2. Looks up `(key, userId)` in Redis (24h TTL).
3. **Same hash** → replays cached response unchanged, sets `Idempotency-Replayed: true`.
4. **Different hash** → `409 IDEMPOTENCY_KEY_REUSED`.
5. **Miss** → runs the handler, caches 2xx responses.

Idempotency requires authentication — anonymous requests pass through unchanged.

```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -b cookies.txt \
  -d '{"bio":"new bio"}'
```

---

## Auth flow

- BetterAuth owns `/api/v1/auth/*` — sign-up, sign-in, sign-out, session, password reset, etc.
- Sessions are **stateful cookies**, not access/refresh JWTs. Sliding 7-day expiry, refreshed once a day on use.
- Session lookups go through **Redis secondary storage** (5-minute hot cache via cookie signing).
- `attachSession` populates `c.get("user")` / `c.get("session")` when present.
- `requireAuth` throws `UnauthorizedError` if absent; `requireRole(...)` adds 403 on role mismatch.

For mobile clients or 3rd-party API consumers, drop in BetterAuth's `bearer()` + `jwt()` plugins later — no schema changes needed.

---

## Versioning

All API routes mount under `API_PREFIX` (`src/config/constants.ts`). Currently `/api/v1`. To cut `v2`:
1. Add a new `API_PREFIX_V2 = "/api/v2"`.
2. Mount the new module routers under that prefix in `app.ts`.
3. Keep the v1 surface unchanged until clients migrate.

---

## Adding a new module

1. Create `src/modules/<name>/<name>.{schema,service,routes}.ts`. Define Zod schemas first — they're reused for validation **and** OpenAPI.
2. Use `createRoute` from `@hono/zod-openapi` so docs stay in sync with runtime.
3. Wrap handler responses in `ok()` / `paginated()` and let thrown `AppError`s bubble to the global handler — never write JSON manually.
4. Register the router in `src/app.ts`: `app.route(API_PREFIX, myRoutes)`.

---

## Testing

```bash
bun test
```

Integration tests boot the real `OpenAPIHono` app and hit Postgres + Redis (no mocks). Use `tests/helpers/db.ts:cleanDb()` in a `beforeEach` to isolate cases, and `tests/factories/users.ts:makeUser({ role })` to seed authenticated test users.

---

## Docker

```bash
docker compose up --build       # app + postgres + redis
docker compose down -v          # tear down + drop volumes
```

The Dockerfile is multi-stage (deps → builder → runner), runs as a non-root user, and includes a `HEALTHCHECK` that hits `/health`.

---

## CI

`.github/workflows/ci.yml` runs lint → typecheck → schema push → tests → build on every push and PR, against Postgres + Redis service containers.

---

## Future additions (not yet wired)

- Email service (Resend/Postmark/SES) → unlocks BetterAuth verification + password reset
- OAuth social providers (Google/GitHub/etc.) — `account` table already has the columns
- Background jobs (pg-boss or BullMQ)
- File uploads + S3/R2 adapter
- Sentry, OpenTelemetry, Prometheus `/metrics`
- BetterAuth `jwt()` + `bearer()` for mobile/3rd-party API access
- WebSockets / SSE
