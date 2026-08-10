import { Router, type IRouter } from "express";
import { db, notesTable, documentsTable } from "@workspace/db";
import { eq, and, asc, sql, desc } from "drizzle-orm";
import { requireAuth, requireEditor } from "../middlewares/auth";

const router: IRouter = Router();

// Helper to parse numeric path param
function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// ═══════════════════════════════════════════════════════════════════════════
// Notes - Study material attached to topics
// ═══════════════════════════════════════════════════════════════════════════

// GET /notes?topicId=X
router.get("/notes", requireAuth, async (req, res): Promise<void> => {
  try {
    const { topicId, includeArchived } = req.query;
    
    if (!topicId) {
      res.status(400).json({ error: "topicId is required" });
      return;
    }

    const topicIdNum = parseInt(topicId as string);

    const conditions = [eq(notesTable.topicId, topicIdNum)];
    
    if (includeArchived !== 'true') {
      conditions.push(eq(notesTable.isArchived, false));
    }

    const rows = await db
      .select({
        id: notesTable.id,
        topicId: notesTable.topicId,
        title: notesTable.title,
        content: notesTable.content,
        noteType: notesTable.noteType,
        tags: notesTable.tags,
        isAiGenerated: notesTable.isAiGenerated,
        isArchived: notesTable.isArchived,
        createdBy: notesTable.createdBy,
        createdAt: notesTable.createdAt,
        updatedAt: notesTable.updatedAt,
        // Count attachments
        attachmentCount: sql<number>`(
          SELECT count(*)::int FROM documents
          WHERE documents.note_id = notes.id
          AND documents.is_archived = false
        )`,
      })
      .from(notesTable)
      .where(and(...conditions))
      .orderBy(desc(notesTable.updatedAt));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /topics/:topicId/notes
router.post("/topics/:topicId/notes", requireAuth, async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);
    const { title, content, noteType, tags, isAiGenerated } = req.body;
    const userId = (req as any).user?.id;

    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }

    const [row] = await db
      .insert(notesTable)
      .values({
        topicId,
        title,
        content,
        noteType: noteType || 'text',
        tags: tags || [],
        isAiGenerated: isAiGenerated || false,
        createdBy: userId || null,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /notes/:noteId
router.get("/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  try {
    const noteId = parseId(req.params.noteId);

    const [row] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, noteId));

    if (!row) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    // Get attachments
    const attachments = await db
      .select()
      .from(documentsTable)
      .where(and(
        eq(documentsTable.noteId, noteId),
        eq(documentsTable.isArchived, false)
      ));

    res.json({ ...row, attachments });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// PATCH /notes/:noteId
router.patch("/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  try {
    const noteId = parseId(req.params.noteId);
    const { title, content, noteType, tags } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (noteType !== undefined) updates.noteType = noteType;
    if (tags !== undefined) updates.tags = tags;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db
      .update(notesTable)
      .set(updates)
      .where(eq(notesTable.id, noteId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// PATCH /notes/:noteId/archive
router.patch("/notes/:noteId/archive", requireEditor, async (req, res): Promise<void> => {
  try {
    const noteId = parseId(req.params.noteId);

    const [row] = await db
      .update(notesTable)
      .set({ isArchived: true })
      .where(eq(notesTable.id, noteId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error archiving note:', error);
    res.status(500).json({ error: 'Failed to archive note' });
  }
});

// DELETE /notes/:noteId
router.delete("/notes/:noteId", requireEditor, async (req, res): Promise<void> => {
  try {
    const noteId = parseId(req.params.noteId);

    const [row] = await db
      .delete(notesTable)
      .where(eq(notesTable.id, noteId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({ message: "Note deleted successfully", note: row });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// POST /notes/search - Full-text search across notes
router.post("/notes/search", requireAuth, async (req, res): Promise<void> => {
  try {
    const { query, topicId, limit } = req.body;

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const searchQuery = query.split(' ').map((word: string) => `${word}:*`).join(' & ');

    const conditions = [
      sql`content_tsv @@ to_tsquery('english', ${searchQuery})`
    ];

    if (topicId) {
      conditions.push(eq(notesTable.topicId, topicId));
    }

    conditions.push(eq(notesTable.isArchived, false));

    const rows = await db
      .select({
        id: notesTable.id,
        topicId: notesTable.topicId,
        title: notesTable.title,
        content: notesTable.content,
        noteType: notesTable.noteType,
        tags: notesTable.tags,
        createdAt: notesTable.createdAt,
        updatedAt: notesTable.updatedAt,
        rank: sql<number>`ts_rank(content_tsv, to_tsquery('english', ${searchQuery}))`,
      })
      .from(notesTable)
      .where(and(...conditions))
      .orderBy(sql`ts_rank(content_tsv, to_tsquery('english', ${searchQuery})) DESC`)
      .limit(limit || 20);

    res.json(rows);
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ error: 'Failed to search notes' });
  }
});

export default router;
