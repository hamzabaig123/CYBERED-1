import { Router, type IRouter } from "express";
import { db, aiGeneratedQuestionsTable, chaptersTable, bookStoresTable, subjectsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  GenerateAIQuestionsBody,
  GenerateAIQuestionsParams,
  ListAIGeneratedQuestionsParams,
  ListAIGeneratedQuestionsQueryParams,
  ApproveAIGeneratedQuestionParams,
  DismissAIGeneratedQuestionParams,
  GetAIGeneratedQuestionParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { generateQuestions } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";
import { questionsTable, sectionsTable, attemptAnswersTable, testAttemptsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// Recent accuracy for a user on a subject (0..1), or null when no graded attempts.
async function subjectAccuracy(userId: number, subjectId: number): Promise<number | null> {
  const rows = await db
    .select({ isCorrect: attemptAnswersTable.isCorrect })
    .from(attemptAnswersTable)
    .innerJoin(testAttemptsTable, eq(attemptAnswersTable.attemptId, testAttemptsTable.id))
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
    .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
    .where(and(eq(testAttemptsTable.userId, userId), eq(chaptersTable.subjectId, subjectId), isNotNull(attemptAnswersTable.isCorrect)));

  if (rows.length === 0) return null;
  const correct = rows.filter((r) => r.isCorrect).length;
  return correct / rows.length;
}

// POST /chapters/:chapterId/ai-generate-questions - Generate AI questions from textbook
router.post("/chapters/:chapterId/ai-generate-questions", requireEditor, async (req, res): Promise<void> => {
  const params = GenerateAIQuestionsParams.safeParse({ chapterId: parseId(req.params.chapterId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = GenerateAIQuestionsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, params.data.chapterId));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  // Get book store for the chapter's subject
  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(and(eq(bookStoresTable.subjectId, chapter.subjectId), eq(bookStoresTable.status, "ready")));

  if (!store) {
    res.status(404).json({ error: "No ready book store found for this chapter's subject" });
    return;
  }

  try {
    // Adaptive difficulty: if "auto", compare against the editor's recent
    // accuracy on this subject to pick a target.
    let difficulty: "auto" | "easier" | "harder" = "auto";
    const rawDifficulty = (req.body as any)?.difficulty;
    if (rawDifficulty === "easier" || rawDifficulty === "harder") {
      difficulty = rawDifficulty;
    } else {
      const genUser = (req as typeof req & { user: { id: number } }).user;
      const accuracy = await subjectAccuracy(genUser.id, chapter.subjectId);
      if (accuracy != null) {
        if (accuracy < 0.5) difficulty = "easier";
        else if (accuracy >= 0.85) difficulty = "harder";
      }
    }

    const language = ["english", "urdu", "sindhi", "auto"].includes((req.body as any)?.language)
      ? (req.body as any).language
      : "auto";

    const drafts = await generateQuestions(
      store.geminiStoreName,
      body.data.pageRange,
      body.data.questionType,
      body.data.count,
      body.data.topicFocus ?? undefined,
      difficulty,
      language
    );

    // Save as drafts
    const savedDrafts = [];
    for (const draft of drafts) {
      const [saved] = await db
        .insert(aiGeneratedQuestionsTable)
        .values({
          chapterId: params.data.chapterId,
          questionType: body.data.questionType,
          payloadJson: draft as unknown as Record<string, unknown>,
          sourcePage: draft.sourcePage,
          topicFocus: body.data.topicFocus,
        })
        .returning();
      savedDrafts.push(saved);
    }

    await writeAudit(req, { 
      action: "AI_GENERATE_QUESTIONS", 
      entityType: "ai_generated_question", 
      entityId: null,
      detail: `Generated ${savedDrafts.length} draft questions for chapter ${chapter.name}` 
    });

    res.json({ drafts: savedDrafts });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// GET /chapters/:chapterId/ai-generated-questions - List AI-generated question drafts
router.get("/chapters/:chapterId/ai-generated-questions", requireAuth, async (req, res): Promise<void> => {
  const params = ListAIGeneratedQuestionsParams.safeParse({ 
    chapterId: parseId(req.params.chapterId) 
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const queryParams = ListAIGeneratedQuestionsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { status = "pending", limit = 50, offset = 0 } = queryParams.data;

  const conditions = [eq(aiGeneratedQuestionsTable.chapterId, params.data.chapterId)];
  if (status === "pending") {
    conditions.push(sql`${aiGeneratedQuestionsTable.approvedAt} IS NULL AND ${aiGeneratedQuestionsTable.dismissedAt} IS NULL`);
  } else if (status === "approved") {
    conditions.push(sql`${aiGeneratedQuestionsTable.approvedAt} IS NOT NULL`);
  } else if (status === "dismissed") {
    conditions.push(sql`${aiGeneratedQuestionsTable.dismissedAt} IS NOT NULL`);
  }

  const [drafts, total] = await Promise.all([
    db
      .select()
      .from(aiGeneratedQuestionsTable)
      .where(and(...conditions))
      .orderBy(desc(aiGeneratedQuestionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiGeneratedQuestionsTable)
      .where(and(...conditions)),
  ]);

  res.json({
    drafts,
    total: total[0]?.count ?? 0,
    limit,
    offset,
  });
});

// GET /ai-generated-questions/:questionId - Get a specific AI-generated question draft
router.get("/ai-generated-questions/:questionId", requireAuth, async (req, res): Promise<void> => {
  const params = GetAIGeneratedQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [draft] = await db
    .select()
    .from(aiGeneratedQuestionsTable)
    .where(eq(aiGeneratedQuestionsTable.id, params.data.questionId));

  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  res.json(draft);
});

// POST /ai-generated-questions/:questionId/approve - Approve and save as real question
router.post("/ai-generated-questions/:questionId/approve", requireEditor, async (req, res): Promise<void> => {
  const params = ApproveAIGeneratedQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [draft] = await db
    .select()
    .from(aiGeneratedQuestionsTable)
    .where(eq(aiGeneratedQuestionsTable.id, params.data.questionId));

  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  if (draft.approvedAt) {
    res.status(400).json({ error: "Draft already approved" });
    return;
  }

  if (draft.dismissedAt) {
    res.status(400).json({ error: "Draft was dismissed" });
    return;
  }

  // Get the chapter to find a suitable section
  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, draft.chapterId));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  // Find or create a section for this question type
  const sectionTypeMap: Record<string, string> = {
    mcq: "mcqs",
    short: "short_questions",
    long: "long_questions",
  };

  let [section] = await db
    .select()
    .from(sectionsTable)
    .where(and(eq(sectionsTable.chapterId, chapter.id), eq(sectionsTable.sectionType, sectionTypeMap[draft.questionType])))
    .limit(1);

  if (!section) {
    const [newSection] = await db
      .insert(sectionsTable)
      .values({
        chapterId: chapter.id,
        name: `${draft.questionType === "mcq" ? "MCQs" : draft.questionType === "short" ? "Short Questions" : "Long Questions"} (AI Generated)`,
        sectionType: sectionTypeMap[draft.questionType],
      })
      .returning();
    section = newSection;
  }

  const payload = draft.payloadJson as Record<string, unknown>;
  const options = (payload.options ?? {}) as Record<string, string>;
  
  // Create the real question
  const [question] = await db
    .insert(questionsTable)
    .values({
      sectionId: section.id,
      questionType: draft.questionType,
      questionText: payload.question as string,
      optionA: options.A,
      optionB: options.B,
      optionC: options.C,
      optionD: options.D,
      correctOption: payload.correctOption as string,
      modelAnswer: payload.modelAnswer as string,
      explanation: payload.explanation as string,
      bookPage: draft.sourcePage,
      bookExplanation: payload.explanation as string,
      referenceType: "ai_generated",
      referenceNote: `Generated from textbook page ${draft.sourcePage}`,
      tags: ["ai_generated", draft.topicFocus].filter(Boolean) as string[],
    })
    .returning();

  // Update draft as approved
  await db
    .update(aiGeneratedQuestionsTable)
    .set({ approvedAt: new Date() })
    .where(eq(aiGeneratedQuestionsTable.id, draft.id));

  await writeAudit(req, { 
    action: "AI_QUESTION_APPROVE", 
    entityType: "question", 
    entityId: question.id,
    detail: `Approved AI-generated question from draft ${draft.id}` 
  });

  res.status(201).json(question);
});

// POST /ai-generated-questions/:questionId/dismiss - Dismiss draft
router.post("/ai-generated-questions/:questionId/dismiss", requireEditor, async (req, res): Promise<void> => {
  const params = DismissAIGeneratedQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [draft] = await db
    .select()
    .from(aiGeneratedQuestionsTable)
    .where(eq(aiGeneratedQuestionsTable.id, params.data.questionId));

  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  if (draft.approvedAt) {
    res.status(400).json({ error: "Draft already approved" });
    return;
  }

  await db
    .update(aiGeneratedQuestionsTable)
    .set({ dismissedAt: new Date() })
    .where(eq(aiGeneratedQuestionsTable.id, draft.id));

  await writeAudit(req, { 
    action: "AI_QUESTION_DISMISS", 
    entityType: "ai_generated_question", 
    entityId: draft.id,
    detail: `Dismissed AI-generated question draft` 
  });

  res.json({ success: true });
});

export default router;