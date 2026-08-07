import { pgTable, text, serial, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./curriculum";
import { usersTable } from "./users";
import { chaptersTable } from "./curriculum";
import { questionsTable } from "./questions";

export const storeStatusEnum = pgEnum("store_status", ["pending", "ready", "error"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "accepted", "kept_mine", "dismissed"]);
export const questionTypeEnum = pgEnum("question_type", ["mcq", "short", "long"]);

export const bookStoresTable = pgTable("book_stores", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }).unique(),
  geminiStoreName: text("gemini_store_name").notNull(),
  status: storeStatusEnum("status").notNull().default("pending"),
  indexedPages: integer("indexed_pages").notNull().default(0),
  textbookTitle: text("textbook_title"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiVerificationsTable = pgTable("ai_verifications", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  questionType: questionTypeEnum("question_type").notNull(),
  aiAnswer: text("ai_answer").notNull(),
  sourcePage: integer("source_page"),
  sourceFilename: text("source_filename"),
  confidence: integer("confidence"),
  agreesWithStored: boolean("agrees_with_stored"),
  status: verificationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const aiGeneratedQuestionsTable = pgTable("ai_generated_questions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  questionType: questionTypeEnum("question_type").notNull(),
  payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
  sourcePage: integer("source_page"),
  topicFocus: text("topic_focus"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiChatSessionsTable = pgTable("ai_chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiChatMessagesTable = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => aiChatSessionsTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  citationsJson: jsonb("citations_json").$type<Array<{ page: number; filename: string; snippet: string }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookStoreSchema = createInsertSchema(bookStoresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBookStore = z.infer<typeof insertBookStoreSchema>;
export type BookStoreRow = typeof bookStoresTable.$inferSelect;

export const insertAIVerificationSchema = createInsertSchema(aiVerificationsTable).omit({ id: true, createdAt: true });
export type InsertAIVerification = z.infer<typeof insertAIVerificationSchema>;
export type AIVerificationRow = typeof aiVerificationsTable.$inferSelect;

export const insertAIGeneratedQuestionSchema = createInsertSchema(aiGeneratedQuestionsTable).omit({ id: true, createdAt: true });
export type InsertAIGeneratedQuestion = z.infer<typeof insertAIGeneratedQuestionSchema>;
export type AIGeneratedQuestionRow = typeof aiGeneratedQuestionsTable.$inferSelect;

export const insertAIChatSessionSchema = createInsertSchema(aiChatSessionsTable).omit({ id: true, createdAt: true });
export type InsertAIChatSession = z.infer<typeof insertAIChatSessionSchema>;
export type AIChatSessionRow = typeof aiChatSessionsTable.$inferSelect;

export const insertAIChatMessageSchema = createInsertSchema(aiChatMessagesTable).omit({ id: true, createdAt: true });
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;
export type AIChatMessageRow = typeof aiChatMessagesTable.$inferSelect;