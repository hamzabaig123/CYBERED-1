import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Per-user state for questions (status, bookmarks, "your mistakes").
// Uses polymorphic question_id + question_type instead of separate FKs.
export const userQuestionStateTable = pgTable(
  "user_question_state",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    questionId: integer("question_id").notNull(),
    questionType: text("question_type").notNull(), // "mcq" | "short" | "long"
    status: text("status"), // solved | wrong | bookmarked
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.userId, t.questionId, t.questionType)],
);

export const insertUserQuestionStateSchema = createInsertSchema(userQuestionStateTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserQuestionState = z.infer<typeof insertUserQuestionStateSchema>;
export type UserQuestionStateRow = typeof userQuestionStateTable.$inferSelect;
