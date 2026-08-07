import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./curriculum";

export const virusScanStatusValues = ["pending", "clean", "infected", "skipped", "error"] as const;
export const processingStatusValues = ["pending", "processing", "done", "error"] as const;

export const virusScanStatusEnum = pgEnum("virus_scan_status", virusScanStatusValues);
export const processingStatusEnum = pgEnum("processing_status", processingStatusValues);

// ── File Assets ───────────────────────────────────────────────────────────────
// One row per stored file (textbook PDFs today). `storage_key` points at the
// physical object — either a local path under FILE_STORAGE_DIR or an S3/R2/B2
// bucket key later. Full extracted text lives at `full_text_key`.
export const fileAssetsTable = pgTable("file_assets", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  isTextbook: boolean("is_textbook").notNull().default(true),

  storageKey: text("storage_key").notNull().unique(),
  originalFilename: text("original_filename").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: text("mime_type").notNull(),

  virusScanStatus: virusScanStatusEnum("virus_scan_status").notNull().default("pending"),
  processingStatus: processingStatusEnum("processing_status").notNull().default("pending"),

  pageCount: integer("page_count"),
  fullTextKey: text("full_text_key"),
  textPreview: text("text_preview"),

  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFileAssetSchema = createInsertSchema(fileAssetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFileAsset = z.infer<typeof insertFileAssetSchema>;
export type FileAssetRow = typeof fileAssetsTable.$inferSelect;
