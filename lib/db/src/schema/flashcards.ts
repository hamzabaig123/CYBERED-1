import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectionsTable } from "./curriculum";

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => sectionsTable.id),
  front: text("front").notNull(),
  back: text("back").notNull(),
  referenceSource: text("reference_source"),
  referenceYear: integer("reference_year"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type FlashcardRow = typeof flashcardsTable.$inferSelect;
