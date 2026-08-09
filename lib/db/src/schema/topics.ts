import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./curriculum";

// ── Flexible Topics ─────────────────────────────────────────────────────────────
// Self-referencing topics table: replaces fixed chapters with flexible tree structure
// Every topic stores subjectId directly (not just through parent chain) for fast queries
//
// NOTE: Self-referencing FK is handled via ts-reset or manual SQL migration
// The parentId column references topics(id) but Drizzle can't express this in TypeScript

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  parentId: integer("parent_id"), // Self-referencing topics(id) - nullable for top-level topics
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type TopicRow = typeof topicsTable.$inferSelect;

// ── Topic Hierarchy Helpers ────────────────────────────────────────────────────

/**
 * Get all descendant topic IDs for a given topic.
 * Returns an array of topic IDs (including the starting topic).
 * 
 * Usage in SQL:
 * with recursive topic_tree as (
 *   select id, parent_id from topics where id = ?
 *   union all
 *   select t.id, t.parent_id from topics t
 *   join topic_tree tt on t.parent_id = tt.id
 * ) select id from topic_tree;
 */
export function getDescendantTopicIds(topicId: number): number[] {
  // Placeholder - actual implementation uses raw SQL query in your db helper
  return [topicId];
}