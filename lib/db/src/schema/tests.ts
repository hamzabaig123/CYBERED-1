import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const testModeValues = ["practice", "exam"] as const;
export const attemptStatusValues = ["in_progress", "submitted", "auto_submitted"] as const;
export const gradingMethodValues = ["auto", "self", "manual"] as const;

// Tests (generated test papers / simulations)
export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull().default("practice"), // practice | exam
  timeLimitMinutes: integer("time_limit_minutes"), // enforced only in exam mode
  totalMarks: integer("total_marks").notNull().default(0),
  questionCount: integer("question_count").notNull().default(0),
  mcqCount: integer("mcq_count").notNull().default(0),
  shortCount: integer("short_count").notNull().default(0),
  longCount: integer("long_count").notNull().default(0),
  configJson: text("config_json"), // stored TestConfig as JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Join table: test questions (ordered) with a denormalized snapshot of the
// question content so later edits to the source question do not mutate the test.
export const testQuestionsTable = pgTable("test_questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  questionId: integer("question_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  questionType: text("question_type").notNull(),
  questionText: text("question_text").notNull(),
  optionA: text("option_a"),
  optionB: text("option_b"),
  optionC: text("option_c"),
  optionD: text("option_d"),
  correctOption: text("correct_option"),
  explanation: text("explanation"),
  modelAnswer: text("model_answer"),
  marks: integer("marks"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  difficulty: text("difficulty"),
});

// Test attempts (per-user, per-test run)
export const testAttemptsTable = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  mode: text("mode").notNull().default("practice"),
  status: text("status").notNull().default("submitted"), // in_progress | submitted | auto_submitted
  score: integer("score").notNull().default(0),
  totalMarks: integer("total_marks").notNull().default(0),
  mcqScore: integer("mcq_score").notNull().default(0),
  shortScore: integer("short_score").notNull().default(0),
  longScore: integer("long_score").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  timeLimitMinutes: integer("time_limit_minutes"),
  autoSubmitted: boolean("auto_submitted").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  answersJson: text("answers_json"), // JSON array of answers (autosave draft)
  resultsJson: text("results_json"), // JSON array of results
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-question attempt answers (gradeable rows for analytics)
export const attemptAnswersTable = pgTable("attempt_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => testAttemptsTable.id),
  questionId: integer("question_id").notNull(),
  questionType: text("question_type").notNull(),
  selectedOption: text("selected_option"),
  writtenAnswer: text("written_answer"),
  isCorrect: boolean("is_correct"),
  marksAwarded: integer("marks_awarded").notNull().default(0),
  marksPossible: integer("marks_possible").notNull().default(0),
  gradedBy: text("graded_by").notNull().default("manual"), // auto | self | manual
  needsGrading: boolean("needs_grading").notNull().default(false),
  keywordMatch: integer("keyword_match").notNull().default(0),
  keywordTotal: integer("keyword_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestSchema = createInsertSchema(testsTable).omit({ id: true, createdAt: true });
export type InsertTest = z.infer<typeof insertTestSchema>;
export type TestRow = typeof testsTable.$inferSelect;
export type TestQuestionRow = typeof testQuestionsTable.$inferSelect;
export type TestAttemptRow = typeof testAttemptsTable.$inferSelect;
export type AttemptAnswerRow = typeof attemptAnswersTable.$inferSelect;
