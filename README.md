# Hono + Bun Boilerplate

Production-grade backend template built with **Hono**, **Bun**, **Drizzle (Postgres)**, **BetterAuth**, and **Scalar / OpenAPI**. Clone it, set a few env vars, and start shipping.

## Stack

| Concern        | Choice                                                       |
|----------------|--------------------------------------------------------------|
| Runtime        | Bun 1.x                                                      |
| Framework      | Hono 4                                                       |
| Docs           | `@hono/zod-openapi` + `@scalar/hono-api-reference`           |
| Validation     | Zod                                                          |
| Auth           | BetterAuth (Drizzle adapter, email + password)               |
| Database       | Postgres 16 + Drizzle ORM + Drizzle Kit migrations           |
| Logging        | Pino (pretty in dev, JSON in prod) + per-request child loggers + request IDs |
| Security       | `secureHeaders`, `cors`, `hono-rate-limiter` (per user / IP) |
| Lint / Format  | Biome                                                        |
| Tests          | `bun test`                                                   |
| Containers     | Multi-stage Bun Dockerfile + `docker-compose.yml`            |
| CI             | GitHub Actions (lint → typecheck → migrate → test → build)   |

## Quick start

```bash
cp .env.example .env             # fill BETTER_AUTH_SECRET (>= 32 chars), DATABASE_URL
docker compose up -d postgres    # or point DATABASE_URL at any Postgres
bun install
bun run db:push                  # apply schema (use db:generate + db:migrate for prod)
bun run dev                      # http://localhost:3000
```

- API docs (Scalar UI): http://localhost:3000/docs
- Raw OpenAPI spec:     http://localhost:3000/openapi.json
- Liveness:             http://localhost:3000/health
- Readiness (pings DB): http://localhost:3000/health/ready

## Scripts

| Script             | Purpose                                              |
|--------------------|------------------------------------------------------|
| `bun run dev`      | Start dev server with hot reload                     |
| `bun run build`    | Bundle to `dist/`                                    |
| `bun run start`    | Run the prod bundle                                  |
| `bun run typecheck`| `tsc --noEmit`                                       |
| `bun run lint`     | Biome lint + format check                            |
| `bun run lint:fix` | Auto-fix lint/format issues                          |
| `bun test`         | Run unit + integration tests                         |
| `bun run db:generate` | Generate a new migration from schema             |
| `bun run db:migrate`  | Apply migrations (production path)               |
| `bun run db:push`     | Push schema directly (dev only)                  |
| `bun run db:studio`   | Open Drizzle Studio                              |
| `bun run auth:generate` | Regenerate the BetterAuth schema file          |

## Project layout

```
src/
├── index.ts                # Bun.serve + graceful shutdown
├── app.ts                  # OpenAPIHono + global middleware + route registration
├── env.ts                  # Zod-validated process.env (fails fast at startup)
├── config/constants.ts     # API_PREFIX, pagination defaults, header names
├── db/
│   ├── index.ts            # Drizzle client, pingDb, closeDb
│   └── schema/             # auth.ts (BetterAuth tables), users.ts (app data)
├── lib/
│   ├── auth.ts             # BetterAuth instance
│   ├── logger.ts           # Pino root logger
│   ├── errors.ts           # AppError + typed subclasses
│   ├── response.ts         # ok(), paginated(), successSchema(), ErrorBodySchema
│   └── http-status.ts
├── middlewares/
│   ├── request-id.ts       # Reads or generates x-request-id
│   ├── logger.ts           # Per-request child logger + access logs
│   ├── auth.ts             # attachSession + requireAuth
│   ├── rate-limit.ts       # hono-rate-limiter, keyed by user/IP
│   └── error-handler.ts    # Single source of truth for error envelopes
├── modules/
│   ├── health/             # /health, /health/ready
│   ├── auth/               # BetterAuth handler + OpenAPI docs
│   └── users/              # Sample CRUD: schemas / routes / handlers / service
└── docs/openapi.ts         # /openapi.json + /docs (Scalar)
tests/                      # bun test
```

## Response contract

Every response is a discriminated union. Build them with the helpers — never hand-write the envelope.

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

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `SERVICE_UNAVAILABLE` (503).

## Adding a new module

1. Create `src/modules/<name>/<name>.{schema,service,routes}.ts`. Define Zod schemas first — they're reused for validation **and** OpenAPI.
2. Use `createRoute` from `@hono/zod-openapi` so docs stay in sync with runtime.
3. Wrap handler responses in `ok()` / `paginated()` and let thrown `AppError`s bubble to the global handler — never write JSON manually.
4. Register the router in `src/app.ts`: `app.route(API_PREFIX, myRoutes)`.

## Auth flow

- BetterAuth owns `/api/auth/*` — sign-up, sign-in, sign-out, session, password reset, etc.
- `attachSession` middleware runs globally and populates `c.get("user")` / `c.get("session")` when a session cookie is present.
- `requireAuth` middleware throws `UnauthorizedError` if no session — use it on protected routes.
- BetterAuth endpoints are documented in Scalar via `registerAuthOpenApi()`.

## Docker

```bash
docker compose up --build       # app + postgres
docker compose down -v          # tear down + drop volume
```

The Dockerfile is multi-stage (deps → builder → runner), runs as a non-root user, and includes a `HEALTHCHECK` that hits `/health`.

## CI

`.github/workflows/ci.yml` runs lint → typecheck → schema push → tests → build on every push and PR, against a Postgres service container.
