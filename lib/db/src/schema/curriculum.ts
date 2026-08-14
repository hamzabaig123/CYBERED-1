import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { questionsTable } from "./questions";
import { usersTable } from "./users";

void questionsTable; // used in dynamic references below
void usersTable;

// ── Classes ───────────────────────────────────────────────────────────────────
export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassRow = typeof classesTable.$inferSelect;

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type SubjectRow = typeof subjectsTable.$inferSelect;

// ── Chapters ──────────────────────────────────────────────────────────────────
export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertChapterSchema = createInsertSchema(chaptersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type ChapterRow = typeof chaptersTable.$inferSelect;

// ── Sections (Legacy - being replaced by topics) ──────────────────────────────
export const sectionTypeValues = [
  "mcqs",
  "short_questions",
  "long_questions",
  "notes",
  "past_papers",
  "essays",
  "practical_questions",
  "viva_questions",
  "programming_questions",
  "flashcards",
  "mind_maps",
  "formula_sheets",
  "cheat_sheets",
  "custom",
] as const;

export const sectionsTable = pgTable("sections", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id),
  name: text("name").notNull(),
  sectionType: text("section_type").notNull().default("mcqs"),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSectionSchema = createInsertSchema(sectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type SectionRow = typeof sectionsTable.$inferSelect;

// ── Topics (New flexible hierarchy) ───────────────────────────────────────────
// Self-referencing topics table: Class → Subject → Chapter → Topic (infinite nesting)
export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  chapterId: integer("chapter_id").references(() => chaptersTable.id),
  parentId: integer("parent_id"), // Self-referencing FK to topics(id)
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type TopicRow = typeof topicsTable.$inferSelect;

// ── MCQ Options ───────────────────────────────────────────────────────────────
export const mcqOptionsTable = pgTable("mcq_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  optionKey: text("option_key").notNull(), // 'A', 'B', 'C', 'D', 'E'
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMcqOptionSchema = createInsertSchema(mcqOptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMcqOption = z.infer<typeof insertMcqOptionSchema>;
export type McqOptionRow = typeof mcqOptionsTable.$inferSelect;

// ── Question Sources ──────────────────────────────────────────────────────────
export const sourceTypeValues = ["textbook", "board_paper", "past_paper", "coaching", "teacher_created", "ai_generated"] as const;

export const questionSourcesTable = pgTable("question_sources", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // textbook | board_paper | past_paper | coaching | teacher_created | ai_generated
  sourceName: text("source_name"), // e.g., "Sindh Board", "Physics XI Textbook"
  sourceYear: integer("source_year"),
  pageNumber: integer("page_number"),
  board: text("board"), // e.g., "Sindh Board", "Federal Board"
  paperType: text("paper_type"), // e.g., "Annual", "Supply"
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSourceSchema = createInsertSchema(questionSourcesTable).omit({ id: true, createdAt: true });
export type InsertQuestionSource = z.infer<typeof insertQuestionSourceSchema>;
export type QuestionSourceRow = typeof questionSourcesTable.$inferSelect;

// ── Notes ─────────────────────────────────────────────────────────────────────
export const noteTypeValues = ["text", "rich_text", "markdown"] as const;

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("text"), // text | rich_text | markdown
  tags: text("tags").array().notNull().default([]),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type NoteRow = typeof notesTable.$inferSelect;

// ── Documents (PDFs and other files) ──────────────────────────────────────────
export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  noteId: integer("note_id").references(() => notesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count"),
  isProcessed: boolean("is_processed").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentRow = typeof documentsTable.$inferSelect;

// ── Document Pages ────────────────────────────────────────────────────────────
export const documentPagesTable = pgTable("document_pages", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentPageSchema = createInsertSchema(documentPagesTable).omit({ id: true, createdAt: true });
export type InsertDocumentPage = z.infer<typeof insertDocumentPageSchema>;
export type DocumentPageRow = typeof documentPagesTable.$inferSelect;

// ── Document Chunks (for RAG) ─────────────────────────────────────────────────
export const documentChunksTable = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  contentLength: integer("content_length").notNull(),
  embeddingJson: text("embedding_json"), // JSONB stored as text for Drizzle compatibility
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunksTable).omit({ id: true, createdAt: true });
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunkRow = typeof documentChunksTable.$inferSelect;
