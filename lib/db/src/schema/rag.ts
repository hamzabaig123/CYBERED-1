import { pgTable, text, serial, timestamp, integer, boolean, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fileAssetsTable } from "./fileAssets";
import { classesTable, subjectsTable, chaptersTable, topicsTable } from "./curriculum";
import { customType } from "drizzle-orm/pg-core";

// Define the vector custom type since pgvector is not natively typed in basic Drizzle
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string | number[]): number[] {
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as number[];
      } catch {
        return [];
      }
    }
    return value;
  },
});

export const ragChunksTable = pgTable("rag_chunks", {
  id: serial("id").primaryKey(),
  fileAssetId: integer("file_asset_id").notNull().references(() => fileAssetsTable.id, { onDelete: "cascade" }),
  
  // Curriculum links
  classId: integer("class_id").references(() => classesTable.id),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  chapterId: integer("chapter_id").references(() => chaptersTable.id),
  topicId: integer("topic_id").references(() => topicsTable.id),
  
  // Chunk hierarchy
  parentChunkId: integer("parent_chunk_id"), // Self-referencing FK
  chunkType: varchar("chunk_type", { length: 50 }).notNull().default("paragraph"),
  chunkDepth: integer("chunk_depth").notNull().default(0),
  
  // Content
  content: text("content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA256
  
  // Embedding
  embedding: vector("embedding"),
  embeddingModel: varchar("embedding_model", { length: 100 }).notNull().default("text-embedding-004"),
  embeddingStatus: varchar("embedding_status", { length: 20 }).notNull().default("pending"),
  
  // Page info
  pageNumber: integer("page_number"),
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),
  
  // Structure
  chapterTitle: text("chapter_title"),
  sectionTitle: text("section_title"),
  topicTitle: text("topic_title"),
  
  // Metadata
  language: varchar("language", { length: 10 }).default("en"),
  documentType: varchar("document_type", { length: 50 }).default("textbook"),
  board: varchar("board", { length: 50 }),
  academicYear: integer("academic_year"),
  
  // Stats
  tokenCount: integer("token_count"),
  charCount: integer("char_count").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRagChunkSchema = createInsertSchema(ragChunksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRagChunk = z.infer<typeof insertRagChunkSchema>;
export type RagChunkRow = typeof ragChunksTable.$inferSelect;
