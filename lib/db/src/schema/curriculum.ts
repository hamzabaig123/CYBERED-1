import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

// ── Sections ──────────────────────────────────────────────────────────────────
export const sectionTypeValues = ["mcqs", "short_questions", "long_questions", "notes", "past_papers", "custom"] as const;

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
