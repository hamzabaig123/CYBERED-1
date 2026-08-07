import { Router, type IRouter } from "express";
import { db, questionsTable, testsTable, testQuestionsTable, testAttemptsTable } from "@workspace/db";
import { eq, and, inArray, gte, lte, SQL, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  GetTestParams,
  SubmitTestParams,
  SubmitTestBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { QuestionRow } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /tests
router.get("/tests", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(testsTable)
    .orderBy(desc(testsTable.createdAt));

  res.json(rows);
});

// POST /tests (generate a test)
router.post("/tests", requireAuth, async (req, res): Promise<void> => {
  const { title, scope, mcqCount = 0, shortQuestionCount = 0, longQuestionCount = 0,
    shortQuestionMarks, longQuestionMarks, referenceYearFrom, referenceYearTo, referenceType } = req.body;

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  // Build base conditions
  const baseConditions: SQL[] = [eq(questionsTable.isArchived, false)];
  if (referenceType) baseConditions.push(eq(questionsTable.referenceType, referenceType));
  if (referenceYearFrom != null) baseConditions.push(gte(questionsTable.referenceYear, referenceYearFrom));
  if (referenceYearTo != null) baseConditions.push(lte(questionsTable.referenceYear, referenceYearTo));

  // Scope: section-level filtering
  let sectionIds: number[] | null = null;
  if (scope?.sectionIds?.length > 0) {
    sectionIds = scope.sectionIds;
  } else if (scope?.chapterId != null) {
    const sections = await db
      .select({ id: sql<number>`sections.id` })
      .from(sql`sections`)
      .where(sql`sections.chapter_id = ${scope.chapterId} AND sections.is_archived = false`);
    sectionIds = sections.map((s) => s.id);
  } else if (scope?.subjectId != null) {
    const sections = await db
      .select({ id: sql<number>`sections.id` })
      .from(sql`sections`)
      .innerJoin(sql`chapters`, sql`chapters.id = sections.chapter_id`)
      .where(sql`chapters.subject_id = ${scope.subjectId} AND sections.is_archived = false`);
    sectionIds = sections.map((s) => s.id);
  } else if (scope?.classId != null) {
    const sections = await db
      .select({ id: sql<number>`sections.id` })
      .from(sql`sections`)
      .innerJoin(sql`chapters`, sql`chapters.id = sections.chapter_id`)
      .innerJoin(sql`subjects`, sql`subjects.id = chapters.subject_id`)
      .where(sql`subjects.class_id = ${scope.classId} AND sections.is_archived = false`);
    sectionIds = sections.map((s) => s.id);
  }

  if (sectionIds != null) {
    baseConditions.push(inArray(questionsTable.sectionId, sectionIds.length > 0 ? sectionIds : [-1]));
  }

  // Sample questions by type
  async function sampleQuestions(type: string, count: number): Promise<QuestionRow[]> {
    if (count <= 0) return [];
    const rows = await db
      .select()
      .from(questionsTable)
      .where(and(...baseConditions, eq(questionsTable.questionType, type)))
      .orderBy(sql`RANDOM()`)
      .limit(count);
    return rows;
  }

  const [mcqs, shorts, longs] = await Promise.all([
    sampleQuestions("mcq", mcqCount),
    sampleQuestions("short", shortQuestionCount),
    sampleQuestions("long", longQuestionCount),
  ]);

  const allQuestions = [...mcqs, ...shorts, ...longs];
  const mcqMarksEach = 1;
  const shortMarksEach = shortQuestionMarks ?? 3;
  const longMarksEach = longQuestionMarks ?? 8;

  const totalMarks =
    mcqs.length * mcqMarksEach +
    shorts.length * shortMarksEach +
    longs.length * longMarksEach;

  const [test] = await db
    .insert(testsTable)
    .values({
      title,
      totalMarks,
      questionCount: allQuestions.length,
      mcqCount: mcqs.length,
      shortCount: shorts.length,
      longCount: longs.length,
      configJson: JSON.stringify(req.body),
    })
    .returning();

  // Insert test-question join rows
  if (allQuestions.length > 0) {
    await db.insert(testQuestionsTable).values(
      allQuestions.map((q, idx) => ({
        testId: test.id,
        questionId: q.id,
        orderIndex: idx,
      }))
    );
  }

  res.status(201).json({ ...test, questions: allQuestions });
});

// GET /tests/:testId
router.get("/tests/:testId", requireAuth, async (req, res): Promise<void> => {
  const params = GetTestParams.safeParse({ testId: parseId(req.params.testId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, params.data.testId));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  // Get questions via join table
  const questionJoins = await db
    .select({ questionId: testQuestionsTable.questionId, orderIndex: testQuestionsTable.orderIndex })
    .from(testQuestionsTable)
    .where(eq(testQuestionsTable.testId, test.id))
    .orderBy(testQuestionsTable.orderIndex);

  const questionIds = questionJoins.map((j) => j.questionId);
  const questions =
    questionIds.length > 0
      ? await db.select().from(questionsTable).where(inArray(questionsTable.id, questionIds))
      : [];

  // Reorder to match test order
  const ordered = questionJoins.map((j) => questions.find((q) => q.id === j.questionId)).filter(Boolean);

  res.json({ ...test, questions: ordered });
});

// POST /tests/:testId/submit
router.post("/tests/:testId/submit", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitTestParams.safeParse({ testId: parseId(req.params.testId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitTestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, params.data.testId));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  // Fetch all questions in test
  const questionJoins = await db
    .select({ questionId: testQuestionsTable.questionId })
    .from(testQuestionsTable)
    .where(eq(testQuestionsTable.testId, test.id));

  const questionIds = questionJoins.map((j) => j.questionId);
  const questions =
    questionIds.length > 0
      ? await db.select().from(questionsTable).where(inArray(questionsTable.id, questionIds))
      : [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let mcqScore = 0;
  const results = body.data.answers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      return { questionId: answer.questionId, isCorrect: false, correctOption: null, modelAnswer: null, explanation: null };
    }

    let isCorrect = false;
    if (question.questionType === "mcq" && answer.selectedOption) {
      isCorrect = answer.selectedOption === question.correctOption;
      if (isCorrect) mcqScore += 1;
    }

    return {
      questionId: answer.questionId,
      isCorrect,
      correctOption: question.correctOption,
      modelAnswer: question.modelAnswer,
      explanation: question.explanation,
    };
  });

  const score = mcqScore; // written answers are manually graded

  await db.insert(testAttemptsTable).values({
    testId: test.id,
    score,
    totalMarks: test.totalMarks,
    mcqScore,
    answersJson: JSON.stringify(body.data.answers),
    resultsJson: JSON.stringify(results),
  });

  res.json({ testId: test.id, score, totalMarks: test.totalMarks, mcqScore, results });
});

export default router;
