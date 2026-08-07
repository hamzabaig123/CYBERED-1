import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  totalMarks: integer("total_marks").notNull().default(0),
  questionCount: integer("question_count").notNull().default(0),
  mcqCount: integer("mcq_count").notNull().default(0),
  shortCount: integer("short_count").notNull().default(0),
  longCount: integer("long_count").notNull().default(0),
  configJson: text("config_json"), // stored TestConfig as JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Join table: test questions (ordered)
export const testQuestionsTable = pgTable("test_questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  questionId: integer("question_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

// Test attempts (submitted answers)
export const testAttemptsTable = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  score: integer("score").notNull().default(0),
  totalMarks: integer("total_marks").notNull().default(0),
  mcqScore: integer("mcq_score").notNull().default(0),
  answersJson: text("answers_json").notNull(), // JSON array of answers
  resultsJson: text("results_json").notNull(), // JSON array of results
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestSchema = createInsertSchema(testsTable).omit({ id: true, createdAt: true });
export type InsertTest = z.infer<typeof insertTestSchema>;
export type TestRow = typeof testsTable.$inferSelect;
