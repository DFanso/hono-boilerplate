import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/config/constants";
import { z } from "@hono/zod-openapi";

export const UserDto = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    role: z.string(),
    image: z.string().nullable(),
    bio: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("User");

export const UserIdParam = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "abc123" }),
});

export const ListUsersQuery = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(100).optional(),
});

export const UpdateMeBody = z
  .object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).nullable().optional(),
    image: z.string().url().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export type UserDtoT = z.infer<typeof UserDto>;
export type ListUsersQueryT = z.infer<typeof ListUsersQuery>;
export type UpdateMeBodyT = z.infer<typeof UpdateMeBody>;
