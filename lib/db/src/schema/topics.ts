import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./curriculum";

// ── Flexible Topics ─────────────────────────────────────────────────────────────
// Self-referencing topics table: replaces fixed chapters with flexible tree structure
// Every topic stores subjectId directly (not just through parent chain) for fast queries
//
// Architecture:
// Class → Subject → Topic (infinite nesting) → Section
//
// Design decisions:
// 1. subjectId is stored on every topic (not just through parent chain) for fast queries
// 2. parentId is nullable (null = top-level under subject)
// 3. Self-referencing FK to topics(id) is handled via SQL migration

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  parentId: integer("parent_id"), // Self-referencing FK to topics(id) - set via SQL migration
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

// ── Recursive CTE Helper for getting all descendants ───────────────────────────
//
// SQL implementation example:
// 
// SELECT * FROM get_topic_descendants(123);
// -- Returns all topic IDs in the tree rooted at topic 123
//
// CREATE OR REPLACE FUNCTION get_topic_descendants(topic_id_param INTEGER)
// RETURNS TABLE(
//   id INTEGER, name TEXT, parent_id INTEGER, order_index INTEGER
// ) AS $$
// BEGIN
//   RETURN QUERY
//   WITH RECURSIVE topic_tree AS (
//     SELECT id, name, parent_id, order_index, ARRAY[id] as path, 0 as depth
//     FROM topics WHERE id = topic_id_param
//     UNION ALL
//     SELECT t.id, t.name, t.parent_id, t.order_index, 
//            tt.path || t.id, tt.depth + 1
//     FROM topics t
//     JOIN topic_tree tt ON t.parent_id = tt.parent_id
//   )
//   SELECT * FROM topic_tree ORDER BY path;
// END;
// $$ LANGUAGE plpgsql;

export type TopicDescendant = typeof topicsTable.$inferSelect & {
  depth: number;
  path: number[];
};