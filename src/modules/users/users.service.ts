import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { userProfile } from "@/db/schema/users";
import { NotFoundError } from "@/lib/errors";
import type { UpdateMeBodyT, UserDtoT } from "@/modules/users/users.schema";
import { and, count, eq, ilike, or } from "drizzle-orm";

type Row = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  image: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(row: Row): UserDtoT {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    role: row.role,
    image: row.image,
    bio: row.bio,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const baseSelect = {
  id: userTable.id,
  name: userTable.name,
  email: userTable.email,
  emailVerified: userTable.emailVerified,
  role: userTable.role,
  image: userTable.image,
  bio: userProfile.bio,
  createdAt: userTable.createdAt,
  updatedAt: userTable.updatedAt,
};

export async function findById(id: string): Promise<UserDtoT | null> {
  const rows = await db
    .select(baseSelect)
    .from(userTable)
    .leftJoin(userProfile, eq(userProfile.userId, userTable.id))
    .where(eq(userTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toDto(row) : null;
}

export async function getById(id: string): Promise<UserDtoT> {
  const u = await findById(id);
  if (!u) throw new NotFoundError(`User ${id} not found`);
  return u;
}

export async function list(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: UserDtoT[]; total: number }> {
  const offset = (opts.page - 1) * opts.pageSize;
  const where = opts.search
    ? or(ilike(userTable.name, `%${opts.search}%`), ilike(userTable.email, `%${opts.search}%`))
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select(baseSelect)
      .from(userTable)
      .leftJoin(userProfile, eq(userProfile.userId, userTable.id))
      .where(where ? and(where) : undefined)
      .limit(opts.pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(userTable)
      .where(where ? and(where) : undefined),
  ]);

  return { items: rows.map(toDto), total: Number(totalRows[0]?.value ?? 0) };
}

export async function updateMe(userId: string, patch: UpdateMeBodyT): Promise<UserDtoT> {
  await db.transaction(async (tx) => {
    if (patch.name !== undefined || patch.image !== undefined) {
      const userUpdates: Partial<typeof userTable.$inferInsert> = { updatedAt: new Date() };
      if (patch.name !== undefined) userUpdates.name = patch.name;
      if (patch.image !== undefined) userUpdates.image = patch.image;
      await tx.update(userTable).set(userUpdates).where(eq(userTable.id, userId));
    }

    if (patch.bio !== undefined) {
      await tx
        .insert(userProfile)
        .values({ userId, bio: patch.bio })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: { bio: patch.bio, updatedAt: new Date() },
        });
    }
  });

  return getById(userId);
}
