import { Router, type IRouter } from "express";
import { db, questionsTable, testsTable, testQuestionsTable, testAttemptsTable, attemptAnswersTable, usersTable, sectionsTable, chaptersTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and, inArray, gte, lte, desc, isNull, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  GetTestParams,
  SubmitTestParams,
  SubmitTestBody,
  SaveTestDraftParams,
  SaveTestDraftBody,
  SelfGradeTestParams,
  SelfGradeTestBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
import { logStudyActivity } from "../lib/study";
import { getWeakSectionIds } from "../lib/analytics";
import type { QuestionRow } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

const MCQ_MARKS = 1;

function significantKeywords(text: string): string[] {
  if (!text) return [];
  const stopwords = new Set([
    "the", "and", "that", "this", "with", "from", "have", "will", "what", "when", "where", "which",
    "into", "than", "then", "there", "these", "those", "their", "your", "are", "was", "were", "been",
    "being", "for", "but", "not", "you", "they", "she", "him", "his", "her", "its", "also", "because",
    "about", "between", "through", "during", "before", "after", "above", "below", "again", "further",
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !stopwords.has(w));
  return Array.from(new Set(words)).slice(0, 12);
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
  const {
    title, scope, mode = "practice", timeLimitMinutes = null, weakTopicsOnly = false,
    mcqCount = 0, shortQuestionCount = 0, longQuestionCount = 0,
    shortQuestionMarks, longQuestionMarks, referenceYearFrom, referenceYearTo, referenceType,
  } = req.body;

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  if (mode !== "practice" && mode !== "exam") {
    res.status(400).json({ error: "mode must be 'practice' or 'exam'" });
    return;
  }

  if (mode === "exam" && (!timeLimitMinutes || timeLimitMinutes < 1)) {
    res.status(400).json({ error: "exam mode requires a positive timeLimitMinutes" });
    return;
  }

  if (mcqCount < 0 || shortQuestionCount < 0 || longQuestionCount < 0) {
    res.status(400).json({ error: "question counts must be non-negative" });
    return;
  }

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

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

  // Weak-topic mode: restrict pool to the user's weakest sections.
  if (weakTopicsOnly) {
    const weakIds = await getWeakSectionIds(user.id);
    if (weakIds.length === 0) {
      res.status(400).json({ error: "No weak topics identified yet. Attempt at least 5 questions in a topic first." });
      return;
    }
    const allowed = sectionIds ? sectionIds.filter((id) => weakIds.includes(id)) : weakIds;
    if (allowed.length === 0) {
      res.status(400).json({ error: "No weak topics found within the selected scope." });
      return;
    }
    sectionIds = allowed;
  }

  if (sectionIds != null) {
    baseConditions.push(inArray(questionsTable.sectionId, sectionIds.length > 0 ? sectionIds : [-1]));
  }

  // Verify pool sizes before sampling so we can give a clear error.
  async function poolSize(type: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questionsTable)
      .where(and(...baseConditions, eq(questionsTable.questionType, type)));
    return rows[0]?.count ?? 0;
  }

  const [mcqPool, shortPool, longPool] = await Promise.all([
    poolSize("mcq"),
    poolSize("short"),
    poolSize("long"),
  ]);

  const shortfall: { type: string; requested: number; available: number }[] = [];
  if (mcqCount > 0 && mcqPool < mcqCount) shortfall.push({ type: "mcq", requested: mcqCount, available: mcqPool });
  if (shortQuestionCount > 0 && shortPool < shortQuestionCount) shortfall.push({ type: "short", requested: shortQuestionCount, available: shortPool });
  if (longQuestionCount > 0 && longPool < longQuestionCount) shortfall.push({ type: "long", requested: longQuestionCount, available: longPool });

  if (shortfall.length > 0) {
    res.status(400).json({
      error: "Insufficient question pool for the requested criteria",
      details: shortfall,
    });
    return;
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
  const shortMarksEach = shortQuestionMarks ?? 3;
  const longMarksEach = longQuestionMarks ?? 8;

  const totalMarks = allQuestions.reduce((sum, q) => {
    if (q.questionType === "mcq") return sum + (q.marks ?? MCQ_MARKS);
    if (q.questionType === "short") return sum + (q.marks ?? shortMarksEach);
    return sum + (q.marks ?? longMarksEach);
  }, 0);

  const [test] = await db
    .insert(testsTable)
    .values({
      title,
      mode,
      timeLimitMinutes: timeLimitMinutes ?? null,
      totalMarks,
      questionCount: allQuestions.length,
      mcqCount: mcqs.length,
      shortCount: shorts.length,
      longCount: longs.length,
      configJson: JSON.stringify(req.body),
    })
    .returning();

  // Insert test-question join rows with a denormalized snapshot of the question.
  if (allQuestions.length > 0) {
    await db.insert(testQuestionsTable).values(
      allQuestions.map((q, idx) => ({
        testId: test.id,
        questionId: q.id,
        orderIndex: idx,
        questionType: q.questionType,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        modelAnswer: q.modelAnswer,
        marks: q.marks,
        tags: q.tags ?? [],
        difficulty: q.difficulty,
      }))
    );
  }

  await writeAudit(req, { action: "GENERATE_TEST", entityType: "test", entityId: test.id, detail: `${mode} ${allQuestions.length}q` });

  const questions = allQuestions.map((q) => ({
    questionId: q.id,
    questionType: q.questionType,
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
    explanation: q.explanation,
    modelAnswer: q.modelAnswer,
    marks: q.marks,
    tags: q.tags ?? [],
    difficulty: q.difficulty,
  }));

  res.status(201).json({ ...test, questions });
});

// GET /tests/:testId
router.get("/tests/:testId", requireAuth, async (req, res): Promise<void> => {
  const params = GetTestParams.safeParse({ testId: parseId(req.params.testId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, params.data.testId));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  // Get questions via join table (snapshot rows carry the question content).
  const questionJoins = await db
    .select()
    .from(testQuestionsTable)
    .where(eq(testQuestionsTable.testId, test.id))
    .orderBy(testQuestionsTable.orderIndex);

  const questions = questionJoins.map((j) => ({
    questionId: j.questionId,
    questionType: j.questionType,
    questionText: j.questionText,
    optionA: j.optionA,
    optionB: j.optionB,
    optionC: j.optionC,
    optionD: j.optionD,
    correctOption: j.correctOption,
    explanation: j.explanation,
    modelAnswer: j.modelAnswer,
    marks: j.marks,
    tags: j.tags ?? [],
    difficulty: j.difficulty,
  }));

  // My attempts on this test
  const attempts = await db
    .select({
      id: testAttemptsTable.id,
      score: testAttemptsTable.score,
      totalMarks: testAttemptsTable.totalMarks,
      mcqScore: testAttemptsTable.mcqScore,
      shortScore: testAttemptsTable.shortScore,
      longScore: testAttemptsTable.longScore,
      status: testAttemptsTable.status,
      autoSubmitted: testAttemptsTable.autoSubmitted,
      startedAt: testAttemptsTable.startedAt,
      submittedAt: testAttemptsTable.submittedAt,
      createdAt: testAttemptsTable.createdAt,
    })
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.testId, test.id), eq(testAttemptsTable.userId, user.id)))
    .orderBy(desc(testAttemptsTable.createdAt));

  res.json({ ...test, questions, attempts });
});

// POST /tests/:testId/draft (autosave an in-progress attempt)
router.post("/tests/:testId/draft", requireAuth, async (req, res): Promise<void> => {
  const params = SaveTestDraftParams.safeParse({ testId: parseId(req.params.testId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SaveTestDraftBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, params.data.testId));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  let attemptId = body.data.attemptId ?? null;

  if (attemptId != null) {
    const [existing] = await db
      .select()
      .from(testAttemptsTable)
      .where(and(eq(testAttemptsTable.id, attemptId), eq(testAttemptsTable.userId, user.id), eq(testAttemptsTable.testId, test.id)));

    if (existing && existing.status === "in_progress") {
      await db
        .update(testAttemptsTable)
        .set({ answersJson: JSON.stringify(body.data.answers) })
        .where(eq(testAttemptsTable.id, existing.id));
      res.json({ attemptId: existing.id, startedAt: existing.startedAt.toISOString() });
      return;
    }
  }

  // Reuse the latest in-progress attempt or create a new one.
  const [latest] = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.testId, test.id), eq(testAttemptsTable.userId, user.id), eq(testAttemptsTable.status, "in_progress")))
    .orderBy(desc(testAttemptsTable.startedAt))
    .limit(1);

  if (latest) {
    await db
      .update(testAttemptsTable)
      .set({ answersJson: JSON.stringify(body.data.answers) })
      .where(eq(testAttemptsTable.id, latest.id));
    res.json({ attemptId: latest.id, startedAt: latest.startedAt.toISOString() });
    return;
  }

  const [created] = await db
    .insert(testAttemptsTable)
    .values({
      testId: test.id,
      userId: user.id,
      mode: test.mode,
      status: "in_progress",
      totalMarks: test.totalMarks,
      startedAt: new Date(),
      timeLimitMinutes: test.timeLimitMinutes,
      answersJson: JSON.stringify(body.data.answers),
    })
    .returning();

  res.status(201).json({ attemptId: created.id, startedAt: created.startedAt.toISOString() });
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

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const [test] = await db
    .select()
    .from(testsTable)
    .where(eq(testsTable.id, params.data.testId));

  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }

  // Fetch all snapshot questions in test
  const questionJoins = await db
    .select()
    .from(testQuestionsTable)
    .where(eq(testQuestionsTable.testId, test.id))
    .orderBy(testQuestionsTable.orderIndex);

  const questionMap = new Map(questionJoins.map((j) => [j.questionId, j]));

  // Determine source answers + start time (from an in-progress draft if provided).
  let startedAt = new Date();
  let autoSubmitted = false;
  let sourceAnswers = body.data.answers;

  if (body.data.draftId != null) {
    const [attempt] = await db
      .select()
      .from(testAttemptsTable)
      .where(and(eq(testAttemptsTable.id, body.data.draftId), eq(testAttemptsTable.userId, user.id), eq(testAttemptsTable.testId, test.id)));

    if (attempt) {
      startedAt = attempt.startedAt;
      if (attempt.answersJson) {
        const draftAnswers = JSON.parse(attempt.answersJson);
        if (sourceAnswers.length === 0) sourceAnswers = draftAnswers;
      }
    }
  }

  // Server-side exam deadline enforcement.
  if (test.mode === "exam" && test.timeLimitMinutes != null) {
    const deadline = new Date(startedAt.getTime() + test.timeLimitMinutes * 60000);
    if (new Date() > deadline) {
      autoSubmitted = true;
    }
  }

  // Grade answers (tier 1: MCQ auto, short/long self-graded pending).
  const now = new Date();
  let mcqScore = 0;
  const answersByQuestion = new Map(sourceAnswers.map((a) => [a.questionId, a]));
  const results = questionJoins.map((q) => {
    const answer = answersByQuestion.get(q.questionId);

    if (q.questionType === "mcq") {
      const selected = answer?.selectedOption ?? null;
      const isCorrect = selected != null && selected === q.correctOption;
      if (isCorrect) mcqScore += 1;
      return {
        questionId: q.questionId,
        questionType: q.questionType,
        isCorrect,
        marksAwarded: isCorrect ? (q.marks ?? MCQ_MARKS) : 0,
        marksPossible: q.marks ?? MCQ_MARKS,
        gradedBy: "auto",
        needsGrading: false,
        correctOption: q.correctOption,
        modelAnswer: q.modelAnswer,
        explanation: q.explanation,
        keywordMatch: 0,
        keywordTotal: 0,
        selectedOption: selected,
        writtenAnswer: null,
      };
    }

    // Short / long — self-graded (student reviews against model answer).
    const written = answer?.writtenAnswer ?? null;
    const keywords = significantKeywords(q.modelAnswer ?? "");
    let keywordMatch = 0;
    if (written && keywords.length > 0) {
      const lower = written.toLowerCase();
      keywordMatch = keywords.filter((k) => lower.includes(k)).length;
    }
    return {
      questionId: q.questionId,
      questionType: q.questionType,
      isCorrect: null,
      marksAwarded: 0,
      marksPossible: q.marks ?? (q.questionType === "short" ? 3 : 8),
      gradedBy: "self",
      needsGrading: true,
      correctOption: null,
      modelAnswer: q.modelAnswer,
      explanation: q.explanation,
      keywordMatch,
      keywordTotal: keywords.length,
      selectedOption: null,
      writtenAnswer: written,
    };
  });

  const score = mcqScore;
  const status = autoSubmitted ? "auto_submitted" : "submitted";

  const [attempt] = await db
    .insert(testAttemptsTable)
    .values({
      testId: test.id,
      userId: user.id,
      mode: test.mode,
      status,
      score,
      totalMarks: test.totalMarks,
      mcqScore,
      shortScore: 0,
      longScore: 0,
      startedAt,
      submittedAt: now,
      timeLimitMinutes: test.timeLimitMinutes,
      autoSubmitted,
      answersJson: JSON.stringify(sourceAnswers),
      resultsJson: JSON.stringify(results),
    })
    .returning();

  await db.insert(attemptAnswersTable).values(
    results.map((r) => ({
      attemptId: attempt.id,
      questionId: r.questionId,
      questionType: r.questionType,
      selectedOption: r.selectedOption,
      writtenAnswer: r.writtenAnswer,
      isCorrect: r.isCorrect,
      marksAwarded: r.marksAwarded,
      marksPossible: r.marksPossible,
      gradedBy: r.gradedBy,
      needsGrading: r.needsGrading,
      keywordMatch: r.keywordMatch,
      keywordTotal: r.keywordTotal,
    }))
  );

  await logStudyActivity(user.id, { type: "test_taken", count: 1, meta: { testId: test.id } });

  res.json({
    testId: test.id,
    attemptId: attempt.id,
    mode: test.mode,
    score,
    totalMarks: test.totalMarks,
    mcqScore,
    shortScore: 0,
    longScore: 0,
    writtenScore: 0,
    autoSubmitted,
    results,
  });
});

// POST /tests/:testId/attempts/:attemptId/self-grade
router.post("/tests/:testId/attempts/:attemptId/self-grade", requireAuth, async (req, res): Promise<void> => {
  const params = SelfGradeTestParams.safeParse({
    testId: parseId(req.params.testId),
    attemptId: parseId(req.params.attemptId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SelfGradeTestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const [attempt] = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.id, params.data.attemptId), eq(testAttemptsTable.userId, user.id), eq(testAttemptsTable.testId, params.data.testId)));

  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }

  const gradeMap = new Map(body.data.answers.map((a) => [a.questionId, a.marksAwarded]));

  const rows = await db
    .select()
    .from(attemptAnswersTable)
    .where(eq(attemptAnswersTable.attemptId, attempt.id));

  let shortScore = 0;
  let longScore = 0;

  for (const row of rows) {
    const awarded = gradeMap.get(row.questionId);
    if (awarded == null || !row.needsGrading) continue;
    const clamped = Math.max(0, Math.min(row.marksPossible, awarded));
    await db
      .update(attemptAnswersTable)
      .set({ marksAwarded: clamped, gradedBy: "self", needsGrading: false })
      .where(eq(attemptAnswersTable.id, row.id));
    if (row.questionType === "short") shortScore += clamped;
    else longScore += clamped;
  }

  const totalScore = attempt.mcqScore + shortScore + longScore;

  const [updated] = await db
    .update(testAttemptsTable)
    .set({ score: totalScore, shortScore, longScore })
    .where(eq(testAttemptsTable.id, attempt.id))
    .returning();

  const finalRows = await db
    .select()
    .from(attemptAnswersTable)
    .where(eq(attemptAnswersTable.attemptId, attempt.id));

  res.json({
    attemptId: attempt.id,
    score: updated.score,
    totalMarks: updated.totalMarks,
    mcqScore: updated.mcqScore,
    shortScore: updated.shortScore,
    longScore: updated.longScore,
    writtenScore: shortScore + longScore,
    results: finalRows.map((r) => ({
      questionId: r.questionId,
      questionType: r.questionType,
      isCorrect: r.isCorrect,
      marksAwarded: r.marksAwarded,
      marksPossible: r.marksPossible,
      gradedBy: r.gradedBy,
      needsGrading: r.needsGrading,
      correctOption: null,
      modelAnswer: null,
      explanation: null,
      keywordMatch: r.keywordMatch,
      keywordTotal: r.keywordTotal,
      selectedOption: r.selectedOption,
      writtenAnswer: r.writtenAnswer,
    })),
  });
});

export default router;
