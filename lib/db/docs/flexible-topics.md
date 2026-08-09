# Flexible Topic Tree Implementation

This document describes the implementation of the flexible topic tree schema migration from fixed `chapters` table to self-referencing `topics` table.

## Overview

The old schema:
- `chapters` table with fixed levels: Class → Subject → Chapters → Sections → Questions
- Limited to a fixed hierarchy structure

The new schema:
- `topics` table as a self-referencing tree structure
- Any depth of nesting allowed: Class → Subject → Topic → (Subtopic → Subsubtopic → ...) → Questions
- Chapters become top-level topics under a subject

## Schema Changes

### New Topics Table

```typescript
export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  parentId: integer("parent_id").references("topics(id)"),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

### Key Design Decisions

1. **`subjectId` stored on every topic** - Allows "give me all questions in this subject" without tree traversal
2. **`parentId` is nullable** - Null means top-level under a subject
3. **Self-referencing via `foreignKey`** - Avoids circular TypeScript type issues
4. **Indexes on `subject_id` and `parent_id`** - Fast queries for "all topics in subject" and "children of topic"

## Query Patterns

### Get all topics in a subject (no tree traversal needed)
```sql
SELECT * FROM topics WHERE subject_id = 123;
```

### Get all descendants of a topic (recursive CTE)
```sql
WITH RECURSIVE topic_tree AS (
  SELECT id, name, parent_id FROM topics WHERE id = 456
  UNION ALL
  SELECT t.id, t.name, t.parent_id 
  FROM topics t
  JOIN topic_tree tt ON t.parent_id = tt.id
)
SELECT * FROM topic_tree;
```

### Get full path for a topic (breadcrumb)
```sql
WITH RECURSIVE topic_path AS (
  SELECT id, name, parent_id, ARRAY[name] as path
  FROM topics WHERE id = 789
  UNION ALL
  SELECT t.id, t.name, t.parent_id, tp.path || t.name
  FROM topics t
  JOIN topic_path tp ON t.id = tp.parent_id
)
SELECT path FROM topic_path WHERE id = 789;
```

## Migration

Run the migration script:
```bash
psql $DATABASE_URL -f lib/db/migrations/001_flexible_topics.sql
```

## API Usage

### Question/Topic Hierarchy

```
Subject (subject_id)
  └── Topic (subject_id, parent_id = NULL)
      └── Subtopic (subject_id, parent_id = topic_id)
          └── Questions (via section.topicId)
```

Every topic knows its subject directly, so you can:
- List all topics for a subject without tree traversal
- Find all questions in a subject efficiently
- Build breadcrumbs by traversing parent_id

## Benefits

1. **Flexible depth** - No limit on nesting levels
2. **No tree traversal for subject queries** - Direct `subject_id` filter
3. **Simple parent/child relationships** - Standard adjacency list model
4. **Easy to modify** - Can move topics between parents, archive, reorder

## Migration Path

1. Run the SQL migration script
2. Update API code to:
   - Use `topicsTable` instead of `chaptersTable`
   - Query topics by `subjectId` directly
   - Use recursive queries for hierarchical displays
3. Update frontend to:
   - Display topics as a tree/breadcrumb
   - Allow topic creation at any level
   - Support drag-and-drop reordering

## Related Tables

### Sections
- Now references `topicId` instead of `chapterId`
- Or can be migrated to reference topics hierarchically

### Questions
- Through sections → topics relationship
- Alternative: direct `topicId` reference for simpler queries