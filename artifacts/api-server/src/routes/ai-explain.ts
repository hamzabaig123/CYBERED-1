import { Router, type IRouter } from "express";
import { db, bookStoresTable, subjectsTable, questionsTable, sectionsTable, chaptersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ExplainRequestBody,
  GetSubjectParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { explainFromBook } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// POST /ai/explain - Explain a question/concept from the textbook
router.post("/ai/explain", requireAuth, async (req, res): Promise<void> => {
  const body = ExplainRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = (req as typeof req & { user: { id: number } }).user;

  // Get the book store for the subject
  let subjectId = body.data.subjectId;
  
  // If questionId provided, get subject from question
  if (!subjectId && body.data.questionId) {
    const [question] = await db
      .select({
        subjectId: chaptersTable.subjectId,
      })
      .from(questionsTable)
      .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
      .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
      .where(eq(questionsTable.id, body.data.questionId));

    if (question) {
      subjectId = question.subjectId;
    }
  }

  if (!subjectId) {
    res.status(400).json({ error: "subjectId or questionId required" });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, subjectId));

  if (!store) {
    res.status(404).json({ error: "Book store not found for this subject" });
    return;
  }

  if (store.status !== "ready") {
    res.status(400).json({ error: "Book store not ready for queries" });
    return;
  }

  try {
    const result = await explainFromBook(store.geminiStoreName, body.data.questionText);
    
    await writeAudit(req, { 
      action: "AI_EXPLAIN", 
      entityType: "ai_explanation", 
      entityId: body.data.questionId,
      detail: `Generated explanation for question` 
    });

    res.json({
      explanation: result.explanation,
      citations: result.citations,
      subjectId,
    });
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

export default router;