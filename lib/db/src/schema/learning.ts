import { pgTable, text, serial, timestamp, integer, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studyActivityTypeValues = [
  "session_logged",
  "questions_solved",
  "questions_added",
  "test_taken",
  "flashcards_reviewed",
  "revision_completed",
] as const;

// Per-event study activity log (one row per activity; aggregated per day on read).
export const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull().default("session_logged"),
  count: integer("count").notNull().default(1),
  minutes: integer("minutes").notNull().default(0),
  meta: jsonb("meta").$type<{ testId?: number; questionId?: number } | null>(),
  activityDate: date("activity_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Spaced-repetition revision schedules per question.
export const revisionSchedulesTable = pgTable("revision_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  questionId: integer("question_id").notNull(),
  questionType: text("question_type").notNull().default("mcq"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  intervalDays: integer("interval_days").notNull().default(1),
  easeFactor: integer("ease_factor").notNull().default(250), // 2.50 as integer basis points
  repetitions: integer("repetitions").notNull().default(0),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Daily study goals.
export const dailyGoalsTable = pgTable("daily_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  goalDate: date("goal_date").notNull(),
  questionsTarget: integer("questions_target").notNull().default(0),
  minutesTarget: integer("minutes_target").notNull().default(0),
  testsTarget: integer("tests_target").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudySessionSchema = createInsertSchema(studySessionsTable).omit({ id: true, createdAt: true });
export const insertRevisionScheduleSchema = createInsertSchema(revisionSchedulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyGoalSchema = createInsertSchema(dailyGoalsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySessionRow = typeof studySessionsTable.$inferSelect;
export type RevisionScheduleRow = typeof revisionSchedulesTable.$inferSelect;
export type DailyGoalRow = typeof dailyGoalsTable.$inferSelect;
