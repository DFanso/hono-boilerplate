import { z } from "@hono/zod-openapi";

export const PaginationSchema = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("Pagination");

export const SuccessMetaSchema = z
  .object({
    requestId: z.string().optional(),
    pagination: PaginationSchema.optional(),
  })
  .openapi("SuccessMeta");

export const ErrorBodySchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    }),
  })
  .openapi("ErrorResponse");

export function successSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    meta: SuccessMetaSchema.optional(),
  });
}

export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: { requestId?: string; pagination?: z.infer<typeof PaginationSchema> };
};

export type ErrorResponse = z.infer<typeof ErrorBodySchema>;

export function ok<T>(data: T, meta?: SuccessResponse<T>["meta"]): SuccessResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function paginated<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  requestId?: string,
): SuccessResponse<T[]> {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  return {
    success: true,
    data,
    meta: {
      ...(requestId ? { requestId } : {}),
      pagination: { ...pagination, totalPages },
    },
  };
}
