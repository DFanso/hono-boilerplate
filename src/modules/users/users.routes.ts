import { ErrorBodySchema, ok, paginated, successSchema } from "@/lib/response";
import { getAuthUser, requireAuth } from "@/middlewares/auth";
import { ListUsersQuery, UpdateMeBody, UserDto, UserIdParam } from "@/modules/users/users.schema";
import * as service from "@/modules/users/users.service";
import type { AppBindings } from "@/types/hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const errorResponses = {
  400: {
    description: "Validation error",
    content: { "application/json": { schema: ErrorBodySchema } },
  },
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: ErrorBodySchema } },
  },
  404: { description: "Not found", content: { "application/json": { schema: ErrorBodySchema } } },
} as const;

const getMe = createRoute({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get current authenticated user",
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Current user",
      content: { "application/json": { schema: successSchema(UserDto) } },
    },
    401: errorResponses[401],
  },
});

const updateMe = createRoute({
  method: "patch",
  path: "/users/me",
  tags: ["Users"],
  summary: "Update current authenticated user",
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  request: { body: { content: { "application/json": { schema: UpdateMeBody } } } },
  responses: {
    200: {
      description: "Updated user",
      content: { "application/json": { schema: successSchema(UserDto) } },
    },
    400: errorResponses[400],
    401: errorResponses[401],
  },
});

const listUsers = createRoute({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List users (paginated)",
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  request: { query: ListUsersQuery },
  responses: {
    200: {
      description: "Paginated list of users",
      content: { "application/json": { schema: successSchema(z.array(UserDto)) } },
    },
    400: errorResponses[400],
    401: errorResponses[401],
  },
});

const getUser = createRoute({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Get a user by id",
  security: [{ cookieAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: UserIdParam },
  responses: {
    200: {
      description: "User",
      content: { "application/json": { schema: successSchema(UserDto) } },
    },
    401: errorResponses[401],
    404: errorResponses[404],
  },
});

export const usersRoutes = new OpenAPIHono<AppBindings>()
  .openapi(getMe, async (c) => {
    const dto = await service.getById(getAuthUser(c).id);
    return c.json(ok(dto, { requestId: c.get("requestId") }), 200);
  })
  .openapi(updateMe, async (c) => {
    const body = c.req.valid("json");
    const dto = await service.updateMe(getAuthUser(c).id, body);
    return c.json(ok(dto, { requestId: c.get("requestId") }), 200);
  })
  .openapi(listUsers, async (c) => {
    const { page, pageSize, search } = c.req.valid("query");
    const { items, total } = await service.list({ page, pageSize, search });
    return c.json(paginated(items, { page, pageSize, total }, c.get("requestId")), 200);
  })
  .openapi(getUser, async (c) => {
    const { id } = c.req.valid("param");
    const dto = await service.getById(id);
    return c.json(ok(dto, { requestId: c.get("requestId") }), 200);
  });
