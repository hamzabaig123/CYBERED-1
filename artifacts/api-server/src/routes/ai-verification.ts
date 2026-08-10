import { Router, type IRouter } from "express";
import { db, aiVerificationsTable, questionsTable, bookStoresTable, chaptersTable, sectionsTable, subjectsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  VerifyQuestionBody,
  ListAIVerificationsQueryParams,
  AcceptAIVerificationParams,
  DismissAIVerificationParams,
  GetAIVerificationParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { verifyQuestion } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// POST /ai/verify - Queue a question for verification against textbook
router.post("/ai/verify", requireEditor, async (req, res): Promise<void> => {
  const body = VerifyQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [question] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, body.data.questionId));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  // Get book store for the question's subject
  const [store] = await db
    .select({
      id: bookStoresTable.id,
      geminiStoreName: bookStoresTable.geminiStoreName,
      status: bookStoresTable.status,
    })
    .from(bookStoresTable)
    .innerJoin(chaptersTable, eq(bookStoresTable.subjectId, chaptersTable.subjectId))
    .innerJoin(sectionsTable, eq(chaptersTable.id, sectionsTable.chapterId))
    .where(and(eq(sectionsTable.id, question.sectionId), eq(bookStoresTable.status, "ready")));

  if (!store) {
    res.status(404).json({ error: "No ready book store found for this question's subject" });
    return;
  }

  try {
    const result = await verifyQuestion(
      store.geminiStoreName,
      question.questionText,
      question.correctOption || question.modelAnswer || "",
      question.questionType
    );

    const agrees = fuzzyMatch(result.aiAnswer, question.correctOption || question.modelAnswer || "");

    const [verification] = await db
      .insert(aiVerificationsTable)
      .values({
        questionId: question.id,
        questionType: question.questionType as "mcq" | "short" | "long",
        aiAnswer: result.aiAnswer,
        sourcePage: result.sourcePage,
        sourceFilename: result.sourceFilename,
        confidence: result.confidence,
        agreesWithStored: agrees,
        status: "pending",
      })
      .returning();

    await writeAudit(req, { 
      action: "AI_VERIFY_QUESTION", 
      entityType: "ai_verification", 
      entityId: verification.id,
      detail: `Verification queued for question ${question.id}` 
    });

    res.status(201).json(verification);
  } catch (error) {
    console.error("Error verifying question:", error);
    res.status(500).json({ error: "Failed to verify question" });
  }
});

// GET /ai/verifications - List verification queue
router.get("/ai/verifications", requireAuth, async (req, res): Promise<void> => {
  const params = ListAIVerificationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, limit = 50, offset = 0 } = params.data;

  const conditions = [];
  if (status) {
    conditions.push(eq(aiVerificationsTable.status, status));
  }

  const [verifications, total] = await Promise.all([
    db
      .select({
        id: aiVerificationsTable.id,
        questionId: aiVerificationsTable.questionId,
        questionType: aiVerificationsTable.questionType,
        aiAnswer: aiVerificationsTable.aiAnswer,
        sourcePage: aiVerificationsTable.sourcePage,
        sourceFilename: aiVerificationsTable.sourceFilename,
        confidence: aiVerificationsTable.confidence,
        agreesWithStored: aiVerificationsTable.agreesWithStored,
        status: aiVerificationsTable.status,
        createdAt: aiVerificationsTable.createdAt,
        resolvedAt: aiVerificationsTable.resolvedAt,
        questionText: questionsTable.questionText,
        storedAnswer: sql<string>`COALESCE(${questionsTable.correctOption}, ${questionsTable.modelAnswer}, '')`.as("stored_answer"),
        subjectName: subjectsTable.name,
        chapterName: chaptersTable.name,
      })
      .from(aiVerificationsTable)
      .innerJoin(questionsTable, eq(aiVerificationsTable.questionId, questionsTable.id))
      .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
      .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
      .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
      .where(and(...conditions))
      .orderBy(desc(aiVerificationsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiVerificationsTable)
      .where(and(...conditions)),
  ]);

  res.json({
    verifications,
    total: total[0]?.count ?? 0,
    limit,
    offset,
  });
});

// GET /ai/verifications/:verificationId - Get a specific verification
router.get("/ai/verifications/:verificationId", requireAuth, async (req, res): Promise<void> => {
  const params = GetAIVerificationParams.safeParse({ verificationId: parseId(req.params.verificationId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [verification] = await db
    .select({
      id: aiVerificationsTable.id,
      questionId: aiVerificationsTable.questionId,
      questionType: aiVerificationsTable.questionType,
      aiAnswer: aiVerificationsTable.aiAnswer,
      sourcePage: aiVerificationsTable.sourcePage,
      sourceFilename: aiVerificationsTable.sourceFilename,
      confidence: aiVerificationsTable.confidence,
      agreesWithStored: aiVerificationsTable.agreesWithStored,
      status: aiVerificationsTable.status,
      createdAt: aiVerificationsTable.createdAt,
      resolvedAt: aiVerificationsTable.resolvedAt,
      questionText: questionsTable.questionText,
      storedAnswer: sql<string>`COALESCE(${questionsTable.correctOption}, ${questionsTable.modelAnswer}, '')`.as("stored_answer"),
      question: questionsTable,
    })
    .from(aiVerificationsTable)
    .innerJoin(questionsTable, eq(aiVerificationsTable.questionId, questionsTable.id))
    .where(eq(aiVerificationsTable.id, params.data.verificationId));

  if (!verification) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  res.json(verification);
});

// POST /ai/verifications/:verificationId/accept - Accept AI suggestion
router.post("/ai/verifications/:verificationId/accept", requireEditor, async (req, res): Promise<void> => {
  const params = AcceptAIVerificationParams.safeParse({ verificationId: parseId(req.params.verificationId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [verification] = await db
    .select()
    .from(aiVerificationsTable)
    .where(eq(aiVerificationsTable.id, params.data.verificationId));

  if (!verification) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  if (verification.status !== "pending") {
    res.status(400).json({ error: "Verification already resolved" });
    return;
  }

  // Update the question with AI-suggested answer and page
  await db
    .update(questionsTable)
    .set({
      bookExplanation: verification.aiAnswer,
      bookPage: verification.sourcePage,
    })
    .where(eq(questionsTable.id, verification.questionId));

  // Update verification status
  await db
    .update(aiVerificationsTable)
    .set({
      status: "accepted",
      resolvedAt: new Date(),
    })
    .where(eq(aiVerificationsTable.id, verification.id));

  await writeAudit(req, { 
    action: "AI_VERIFICATION_ACCEPT", 
    entityType: "ai_verification", 
    entityId: verification.id,
    detail: `Accepted AI verification for question ${verification.questionId}` 
  });

  res.json({ success: true });
});

// POST /ai/verifications/:verificationId/dismiss - Dismiss AI suggestion (keep mine)
router.post("/ai/verifications/:verificationId/dismiss", requireEditor, async (req, res): Promise<void> => {
  const params = DismissAIVerificationParams.safeParse({ verificationId: parseId(req.params.verificationId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [verification] = await db
    .select()
    .from(aiVerificationsTable)
    .where(eq(aiVerificationsTable.id, params.data.verificationId));

  if (!verification) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  if (verification.status !== "pending") {
    res.status(400).json({ error: "Verification already resolved" });
    return;
  }

  await db
    .update(aiVerificationsTable)
    .set({
      status: "kept_mine",
      resolvedAt: new Date(),
    })
    .where(eq(aiVerificationsTable.id, verification.id));

  await writeAudit(req, { 
    action: "AI_VERIFICATION_DISMISS", 
    entityType: "ai_verification", 
    entityId: verification.id,
    detail: `Dismissed AI verification for question ${verification.questionId}` 
  });

  res.json({ success: true });
});

function fuzzyMatch(aiAnswer: string, storedAnswer: string): boolean {
  if (!storedAnswer) return false;
  
  const normalizedAI = aiAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedStored = storedAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Simple containment check
  if (normalizedAI.includes(normalizedStored) || normalizedStored.includes(normalizedAI)) {
    return true;
  }
  
  // Check for significant word overlap
  const aiWords = new Set(normalizedAI.split(/\s+/).filter(w => w.length > 3));
  const storedWords = new Set(normalizedStored.split(/\s+/).filter(w => w.length > 3));
  
  let overlap = 0;
  for (const w of aiWords) {
    if (storedWords.has(w)) overlap++;
  }
  
  const maxWords = Math.max(aiWords.size, storedWords.size);
  return maxWords > 0 && overlap / maxWords > 0.6;
}

export default router;