import { Router, type IRouter } from "express";
import { db, mcqOptionsTable, questionsTable, questionSourcesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireEditor } from "../middlewares/auth";

const router: IRouter = Router();

// Helper to parse numeric path param
function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// ═══════════════════════════════════════════════════════════════════════════
// MCQ Options - Normalized storage for multiple choice questions
// ═══════════════════════════════════════════════════════════════════════════

// GET /questions/:questionId/options - Get all options for a question
router.get("/questions/:questionId/options", requireAuth, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);

    const options = await db
      .select()
      .from(mcqOptionsTable)
      .where(eq(mcqOptionsTable.questionId, questionId))
      .orderBy(asc(mcqOptionsTable.optionKey));

    res.json(options);
  } catch (error) {
    console.error('Error fetching MCQ options:', error);
    res.status(500).json({ error: 'Failed to fetch MCQ options' });
  }
});

// POST /questions/:questionId/options - Add option to question
router.post("/questions/:questionId/options", requireEditor, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);
    const { optionKey, optionText, isCorrect } = req.body;

    if (!optionKey || !optionText) {
      res.status(400).json({ error: "optionKey and optionText are required" });
      return;
    }

    // Validate optionKey
    if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(optionKey)) {
      res.status(400).json({ error: "optionKey must be A, B, C, D, E, or F" });
      return;
    }

    const [row] = await db
      .insert(mcqOptionsTable)
      .values({
        questionId,
        optionKey,
        optionText,
        isCorrect: isCorrect || false,
      })
      .returning();

    res.status(201).json(row);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Option key already exists for this question' });
      return;
    }
    console.error('Error creating MCQ option:', error);
    res.status(500).json({ error: 'Failed to create MCQ option' });
  }
});

// PATCH /options/:optionId - Update an option
router.patch("/options/:optionId", requireEditor, async (req, res): Promise<void> => {
  try {
    const optionId = parseId(req.params.optionId);
    const { optionText, isCorrect } = req.body;

    const updates: any = {};
    if (optionText !== undefined) updates.optionText = optionText;
    if (isCorrect !== undefined) updates.isCorrect = isCorrect;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db
      .update(mcqOptionsTable)
      .set(updates)
      .where(eq(mcqOptionsTable.id, optionId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Option not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating MCQ option:', error);
    res.status(500).json({ error: 'Failed to update MCQ option' });
  }
});

// DELETE /options/:optionId
router.delete("/options/:optionId", requireEditor, async (req, res): Promise<void> => {
  try {
    const optionId = parseId(req.params.optionId);

    const [row] = await db
      .delete(mcqOptionsTable)
      .where(eq(mcqOptionsTable.id, optionId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Option not found" });
      return;
    }

    res.json({ message: "Option deleted successfully", option: row });
  } catch (error) {
    console.error('Error deleting MCQ option:', error);
    res.status(500).json({ error: 'Failed to delete MCQ option' });
  }
});

// POST /questions/:questionId/options/bulk - Create multiple options at once
router.post("/questions/:questionId/options/bulk", requireEditor, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);
    const { options } = req.body;

    if (!Array.isArray(options) || options.length === 0) {
      res.status(400).json({ error: "options array is required" });
      return;
    }

    // Validate all options
    for (const opt of options) {
      if (!opt.optionKey || !opt.optionText) {
        res.status(400).json({ error: "Each option must have optionKey and optionText" });
        return;
      }
      if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(opt.optionKey)) {
        res.status(400).json({ error: `Invalid optionKey: ${opt.optionKey}` });
        return;
      }
    }

    const rows = await db
      .insert(mcqOptionsTable)
      .values(options.map((opt: any) => ({
        questionId,
        optionKey: opt.optionKey,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect || false,
      })))
      .returning();

    res.status(201).json(rows);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'One or more option keys already exist for this question' });
      return;
    }
    console.error('Error creating MCQ options:', error);
    res.status(500).json({ error: 'Failed to create MCQ options' });
  }
});

// PATCH /questions/:questionId/options/:optionKey/correct - Mark option as correct
router.patch("/questions/:questionId/options/:optionKey/correct", requireEditor, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);
    const optionKey = req.params.optionKey.toUpperCase();

    // First, unmark all other options as correct
    await db
      .update(mcqOptionsTable)
      .set({ isCorrect: false })
      .where(eq(mcqOptionsTable.questionId, questionId));

    // Then mark this option as correct
    const [row] = await db
      .update(mcqOptionsTable)
      .set({ isCorrect: true })
      .where(and(
        eq(mcqOptionsTable.questionId, questionId),
        eq(mcqOptionsTable.optionKey, optionKey)
      ))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Option not found" });
      return;
    }

    res.json({ message: "Correct answer updated", option: row });
  } catch (error) {
    console.error('Error updating correct answer:', error);
    res.status(500).json({ error: 'Failed to update correct answer' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Question Sources - Track references for questions
// ═══════════════════════════════════════════════════════════════════════════

// GET /questions/:questionId/sources
router.get("/questions/:questionId/sources", requireAuth, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);

    const sources = await db
      .select()
      .from(questionSourcesTable)
      .where(eq(questionSourcesTable.questionId, questionId));

    res.json(sources);
  } catch (error) {
    console.error('Error fetching question sources:', error);
    res.status(500).json({ error: 'Failed to fetch question sources' });
  }
});

// POST /questions/:questionId/sources
router.post("/questions/:questionId/sources", requireEditor, async (req, res): Promise<void> => {
  try {
    const questionId = parseId(req.params.questionId);
    const { sourceType, sourceName, sourceYear, pageNumber, board, paperType, notes } = req.body;

    if (!sourceType) {
      res.status(400).json({ error: "sourceType is required" });
      return;
    }

    const validSourceTypes = ['textbook', 'board_paper', 'past_paper', 'coaching', 'teacher_created', 'ai_generated'];
    if (!validSourceTypes.includes(sourceType)) {
      res.status(400).json({ error: `Invalid sourceType. Must be one of: ${validSourceTypes.join(', ')}` });
      return;
    }

    const [row] = await db
      .insert(questionSourcesTable)
      .values({
        questionId,
        sourceType,
        sourceName: sourceName || null,
        sourceYear: sourceYear || null,
        pageNumber: pageNumber || null,
        board: board || null,
        paperType: paperType || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error('Error creating question source:', error);
    res.status(500).json({ error: 'Failed to create question source' });
  }
});

// DELETE /sources/:sourceId
router.delete("/sources/:sourceId", requireEditor, async (req, res): Promise<void> => {
  try {
    const sourceId = parseId(req.params.sourceId);

    const [row] = await db
      .delete(questionSourcesTable)
      .where(eq(questionSourcesTable.id, sourceId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Source not found" });
      return;
    }

    res.json({ message: "Source deleted successfully", source: row });
  } catch (error) {
    console.error('Error deleting question source:', error);
    res.status(500).json({ error: 'Failed to delete question source' });
  }
});

export default router;
