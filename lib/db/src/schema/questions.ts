import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectionsTable } from "./curriculum";

export const questionTypeValues = ["mcq", "short", "long"] as const;
export const referenceTypeValues = ["board_paper", "coaching_paper", "other"] as const;
export const difficultyValues = ["easy", "medium", "hard"] as const;
export const questionStatusValues = ["solved", "wrong", "bookmarked"] as const;

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => sectionsTable.id),
  questionType: text("question_type").notNull().default("mcq"),
  questionText: text("question_text").notNull(),
  optionA: text("option_a"),
  optionB: text("option_b"),
  optionC: text("option_c"),
  optionD: text("option_d"),
  correctOption: text("correct_option"), // "A" | "B" | "C" | "D"
  explanation: text("explanation"),
  modelAnswer: text("model_answer"),
  marks: integer("marks"),
  referenceSource: text("reference_source"),
  referenceYear: integer("reference_year"),
  referenceType: text("reference_type"), // board_paper | coaching_paper | other
  referenceNote: text("reference_note"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  difficulty: text("difficulty"), // easy | medium | hard
  bookPage: integer("book_page"),
  bookExplanation: text("book_explanation"),
  aiExplanation: text("ai_explanation"),
  imageUrl: text("image_url"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type QuestionRow = typeof questionsTable.$inferSelect;
