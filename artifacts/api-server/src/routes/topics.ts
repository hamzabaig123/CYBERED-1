import { Router, type IRouter } from "express";
import { db, topicsTable, notesTable, documentsTable, questionsTable, mcqOptionsTable } from "@workspace/db";
import { eq, and, asc, sql, isNull, or } from "drizzle-orm";
import { requireAuth, requireEditor } from "../middlewares/auth";

const router: IRouter = Router();

// Helper to parse numeric path param
function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// ═══════════════════════════════════════════════════════════════════════════
// Topics - Flexible hierarchy with unlimited nesting
// ═══════════════════════════════════════════════════════════════════════════

// GET /topics?chapterId=X&parentId=Y
router.get("/topics", requireAuth, async (req, res): Promise<void> => {
  try {
    const { chapterId, parentId, includeArchived } = req.query;
    
    if (!chapterId) {
      res.status(400).json({ error: "chapterId is required" });
      return;
    }

    const chapterIdNum = parseInt(chapterId as string);
    const parentIdNum = parentId ? parseInt(parentId as string) : null;

    // Build where conditions
    const conditions = [eq(topicsTable.chapterId, chapterIdNum)];
    
    if (parentIdNum !== null) {
      conditions.push(eq(topicsTable.parentId, parentIdNum));
    } else {
      conditions.push(isNull(topicsTable.parentId));
    }

    if (includeArchived !== 'true') {
      conditions.push(eq(topicsTable.isArchived, false));
    }

    const rows = await db
      .select({
        id: topicsTable.id,
        chapterId: topicsTable.chapterId,
        parentId: topicsTable.parentId,
        name: topicsTable.name,
        description: topicsTable.description,
        orderIndex: topicsTable.orderIndex,
        isArchived: topicsTable.isArchived,
        createdAt: topicsTable.createdAt,
        updatedAt: topicsTable.updatedAt,
        // Count stats
        mcqCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = topics.id
          AND questions.question_type = 'mcq'
          AND questions.is_archived = false
        )`,
        shortQuestionCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = topics.id
          AND questions.question_type = 'short'
          AND questions.is_archived = false
        )`,
        longQuestionCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = topics.id
          AND questions.question_type = 'long'
          AND questions.is_archived = false
        )`,
        noteCount: sql<number>`(
          SELECT count(*)::int FROM notes
          WHERE notes.topic_id = topics.id
          AND notes.is_archived = false
        )`,
        documentCount: sql<number>`(
          SELECT count(*)::int FROM documents
          WHERE documents.topic_id = topics.id
          AND documents.is_archived = false
        )`,
        subtopicCount: sql<number>`(
          SELECT count(*)::int FROM topics AS subtopics
          WHERE subtopics.parent_id = topics.id
          AND subtopics.is_archived = false
        )`,
      })
      .from(topicsTable)
      .where(and(...conditions))
      .orderBy(asc(topicsTable.orderIndex), asc(topicsTable.name));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /chapters/:chapterId/topics
router.post("/chapters/:chapterId/topics", requireEditor, async (req, res): Promise<void> => {
  try {
    const chapterId = parseId(req.params.chapterId);
    const { name, description, parentId, orderIndex } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // Get subject_id from chapter
    const [chapter] = await db.query.chaptersTable.findMany({
      where: (chapters, { eq }) => eq(chapters.id, chapterId),
      columns: { subjectId: true }
    });

    if (!chapter) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    const [row] = await db
      .insert(topicsTable)
      .values({
        chapterId,
        subjectId: chapter.subjectId,
        parentId: parentId || null,
        name,
        description: description || null,
        orderIndex: orderIndex || 0,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// GET /topics/:topicId
router.get("/topics/:topicId", requireAuth, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);

    const [row] = await db
      .select({
        id: topicsTable.id,
        chapterId: topicsTable.chapterId,
        subjectId: topicsTable.subjectId,
        parentId: topicsTable.parentId,
        name: topicsTable.name,
        description: topicsTable.description,
        orderIndex: topicsTable.orderIndex,
        isArchived: topicsTable.isArchived,
        createdAt: topicsTable.createdAt,
        updatedAt: topicsTable.updatedAt,
        // Stats
        mcqCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = ${topicId}
          AND questions.question_type = 'mcq'
          AND questions.is_archived = false
        )`,
        shortQuestionCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = ${topicId}
          AND questions.question_type = 'short'
          AND questions.is_archived = false
        )`,
        longQuestionCount: sql<number>`(
          SELECT count(*)::int FROM questions
          WHERE questions.topic_id = ${topicId}
          AND questions.question_type = 'long'
          AND questions.is_archived = false
        )`,
        noteCount: sql<number>`(
          SELECT count(*)::int FROM notes
          WHERE notes.topic_id = ${topicId}
          AND notes.is_archived = false
        )`,
        documentCount: sql<number>`(
          SELECT count(*)::int FROM documents
          WHERE documents.topic_id = ${topicId}
          AND documents.is_archived = false
        )`,
        subtopicCount: sql<number>`(
          SELECT count(*)::int FROM topics AS subtopics
          WHERE subtopics.parent_id = ${topicId}
          AND subtopics.is_archived = false
        )`,
      })
      .from(topicsTable)
      .where(eq(topicsTable.id, topicId));

    if (!row) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

// PATCH /topics/:topicId
router.patch("/topics/:topicId", requireEditor, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);
    const { name, description, parentId, orderIndex } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (parentId !== undefined) updates.parentId = parentId;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db
      .update(topicsTable)
      .set(updates)
      .where(eq(topicsTable.id, topicId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// PATCH /topics/:topicId/archive
router.patch("/topics/:topicId/archive", requireEditor, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);

    const [row] = await db
      .update(topicsTable)
      .set({ isArchived: true })
      .where(eq(topicsTable.id, topicId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error archiving topic:', error);
    res.status(500).json({ error: 'Failed to archive topic' });
  }
});

// DELETE /topics/:topicId
router.delete("/topics/:topicId", requireEditor, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);

    // Check if topic has children
    const [hasChildren] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(topicsTable)
      .where(eq(topicsTable.parentId, topicId));

    if (hasChildren && hasChildren.count > 0) {
      res.status(400).json({ 
        error: "Cannot delete topic with subtopics. Archive it instead or delete subtopics first." 
      });
      return;
    }

    const [row] = await db
      .delete(topicsTable)
      .where(eq(topicsTable.id, topicId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ message: "Topic deleted successfully", topic: row });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// GET /topics/:topicId/tree - Get topic with all descendants
router.get("/topics/:topicId/tree", requireAuth, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);

    // Use the PostgreSQL function we created in migration
    const descendants = await db.execute(sql`
      SELECT * FROM get_topic_descendants(${topicId})
    `);

    res.json(descendants.rows);
  } catch (error) {
    console.error('Error fetching topic tree:', error);
    res.status(500).json({ error: 'Failed to fetch topic tree' });
  }
});

// GET /topics/:topicId/path - Get breadcrumb path to root
router.get("/topics/:topicId/path", requireAuth, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);

    // Use the PostgreSQL function we created in migration
    const path = await db.execute(sql`
      SELECT * FROM get_topic_path(${topicId})
    `);

    res.json(path.rows);
  } catch (error) {
    console.error('Error fetching topic path:', error);
    res.status(500).json({ error: 'Failed to fetch topic path' });
  }
});

export default router;
