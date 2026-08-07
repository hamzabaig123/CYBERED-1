import { Router, type IRouter } from "express";
import { db, attemptAnswersTable, testQuestionsTable, testAttemptsTable, testsTable, bookStoresTable, chaptersTable, sectionsTable, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  AIGradeAnswerParams,
  AIGradeAnswerBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { gradeAnswer } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// POST /attempts/:attemptId/answers/:answerId/ai-grade - Get AI grading suggestion
router.post("/attempts/:attemptId/answers/:answerId/ai-grade", requireAuth, async (req, res): Promise<void> => {
  const params = AIGradeAnswerParams.safeParse({ 
    attemptId: parseId(req.params.attemptId),
    answerId: parseId(req.params.answerId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AIGradeAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = (req as typeof req & { user: { id: number } }).user;

  // Get the answer and verify ownership
  const [answer] = await db
    .select({
      id: attemptAnswersTable.id,
      attemptId: attemptAnswersTable.attemptId,
      questionId: attemptAnswersTable.questionId,
      questionType: attemptAnswersTable.questionType,
      writtenAnswer: attemptAnswersTable.writtenAnswer,
      marksPossible: attemptAnswersTable.marksPossible,
      testQuestion: testQuestionsTable,
    })
    .from(attemptAnswersTable)
    .innerJoin(testAttemptsTable, eq(attemptAnswersTable.attemptId, testAttemptsTable.id))
    .innerJoin(testQuestionsTable, eq(attemptAnswersTable.questionId, testQuestionsTable.id))
    .where(and(
      eq(attemptAnswersTable.id, params.data.answerId),
      eq(testAttemptsTable.userId, user.id)
    ));

  if (!answer) {
    res.status(404).json({ error: "Answer not found or access denied" });
    return;
  }

  if (!answer.writtenAnswer) {
    res.status(400).json({ error: "No written answer to grade" });
    return;
  }

  // Get book store for the test's subject
  // We need to trace back from test question to subject
  // For now, we'll use the test's scope to find the subject
  // This is a simplified version - in reality you'd need to track subject per question
  
  // Try to find a book store from the test's scope
  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, answer.testQuestion.testId ?? 0));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  // Since tests can have mixed subjects, we'd need to track subject per question
  // For now, return an error suggesting manual grading
  // A full implementation would store subjectId on test_questions or questions
  
  // Try to find any book store for the user's subjects
  // This is a fallback - ideally you'd have subject per question
  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.status, "ready"))
    .limit(1);

  if (!store) {
    res.status(404).json({ error: "No ready book store found. Please index a textbook first." });
    return;
  }

  try {
    const result = await gradeAnswer(
      store.geminiStoreName,
      answer.testQuestion.questionText,
      answer.writtenAnswer,
      answer.testQuestion.modelAnswer,
      answer.marksPossible
    );

    await writeAudit(req, { 
      action: "AI_GRADE_ANSWER", 
      entityType: "attempt_answer", 
      entityId: answer.id,
      detail: `AI grading suggestion for answer ${answer.id}` 
    });

    res.json({
      suggestion: result,
      answerId: answer.id,
      note: "This is a suggestion. You must confirm the marks in the UI.",
    });
  } catch (error) {
    console.error("Error grading answer:", error);
    res.status(500).json({ error: "Failed to grade answer" });
  }
});

export default router;