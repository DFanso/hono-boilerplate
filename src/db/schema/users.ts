import { user } from "@/db/schema/auth";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Application-owned profile data, joined to the BetterAuth `user` table.
// Keep auth-managed columns on `user`; put product fields here.
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserProfile = typeof userProfile.$inferSelect;
export type NewUserProfile = typeof userProfile.$inferInsert;
