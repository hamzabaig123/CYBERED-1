import { Router, type IRouter } from "express";
import { db, questionsTable, sectionsTable, chaptersTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and, asc, desc, like, or, gte, lte, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  ListQuestionsQueryParams,
  CreateQuestionParams,
  CreateQuestionBody,
  BulkCreateQuestionsParams,
  BulkCreateQuestionsBody,
  SearchQuestionsQueryParams,
  GetQuestionParams,
  UpdateQuestionParams,
  UpdateQuestionBody,
  ArchiveQuestionParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /questions?sectionId=X&page=1&limit=20&search=...
router.get("/questions", requireAuth, async (req, res): Promise<void> => {
  const params = ListQuestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const {
    sectionId,
    page = 1,
    limit = 20,
    search,
    referenceYear,
    referenceType,
    includeArchived,
  } = params.data;

  const conditions: SQL[] = [eq(questionsTable.sectionId, sectionId)];
  if (!includeArchived) conditions.push(eq(questionsTable.isArchived, false));
  if (search) conditions.push(like(questionsTable.questionText, `%${search}%`));
  if (referenceYear != null) conditions.push(eq(questionsTable.referenceYear, referenceYear));
  if (referenceType) conditions.push(eq(questionsTable.referenceType, referenceType));

  const offset = (page - 1) * limit;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(questionsTable)
    .where(and(...conditions))
    .orderBy(desc(questionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ questions: rows, total: count ?? 0, page, limit });
});

// POST /sections/:sectionId/questions
router.post("/sections/:sectionId/questions", requireEditor, async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(questionsTable)
    .values({ ...body.data, sectionId: params.data.sectionId })
    .returning();

  res.status(201).json(row);
});

// POST /sections/:sectionId/questions/bulk
router.post("/sections/:sectionId/questions/bulk", requireEditor, async (req, res): Promise<void> => {
  const params = BulkCreateQuestionsParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = BulkCreateQuestionsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.questions.length === 0) {
    res.status(400).json({ error: "No questions provided" });
    return;
  }

  const values = body.data.questions.map((q) => ({
    ...q,
    sectionId: params.data.sectionId,
  }));

  const rows = await db.insert(questionsTable).values(values).returning();
  res.status(201).json(rows);
});

// GET /questions/search?q=...
router.get("/questions/search", requireAuth, async (req, res): Promise<void> => {
  const params = SearchQuestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const {
    q,
    classId,
    subjectId,
    questionType,
    referenceType,
    referenceYearFrom,
    referenceYearTo,
    page = 1,
    limit = 20,
  } = params.data;

  // Build conditions
  const conditions: SQL[] = [
    eq(questionsTable.isArchived, false),
    or(
      like(questionsTable.questionText, `%${q}%`),
      like(questionsTable.explanation, `%${q}%`),
      like(questionsTable.modelAnswer, `%${q}%`)
    ) as SQL,
  ];

  if (questionType) conditions.push(eq(questionsTable.questionType, questionType));
  if (referenceType) conditions.push(eq(questionsTable.referenceType, referenceType));
  if (referenceYearFrom != null) conditions.push(gte(questionsTable.referenceYear, referenceYearFrom));
  if (referenceYearTo != null) conditions.push(lte(questionsTable.referenceYear, referenceYearTo));

  const offset = (page - 1) * limit;

  let query = db
    .select({ question: questionsTable })
    .from(questionsTable)
    .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
    .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id));

  // Apply class/subject filters through joins
  if (subjectId != null) conditions.push(eq(subjectsTable.id, subjectId));
  if (classId != null) conditions.push(eq(classesTable.id, classId));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
    .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id))
    .where(and(...conditions));

  const rows = await query
    .where(and(...conditions))
    .orderBy(desc(questionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    questions: rows.map((r) => r.question),
    total: count ?? 0,
    page,
    limit,
  });
});

// GET /questions/:questionId
router.get("/questions/:questionId", requireAuth, async (req, res): Promise<void> => {
  const params = GetQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, params.data.questionId));

  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(row);
});

// PATCH /questions/:questionId
router.patch("/questions/:questionId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Archive old version, insert new version
  const [old] = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.id, params.data.questionId));

  if (!old) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  // Archive the old question
  await db
    .update(questionsTable)
    .set({ isArchived: true })
    .where(eq(questionsTable.id, old.id));

  // Insert new version
  const [newRow] = await db
    .insert(questionsTable)
    .values({
      sectionId: old.sectionId,
      questionType: old.questionType,
      questionText: body.data.questionText ?? old.questionText,
      optionA: body.data.optionA ?? old.optionA,
      optionB: body.data.optionB ?? old.optionB,
      optionC: body.data.optionC ?? old.optionC,
      optionD: body.data.optionD ?? old.optionD,
      correctOption: body.data.correctOption ?? old.correctOption,
      explanation: body.data.explanation ?? old.explanation,
      modelAnswer: body.data.modelAnswer ?? old.modelAnswer,
      marks: body.data.marks ?? old.marks,
      referenceSource: body.data.referenceSource ?? old.referenceSource,
      referenceYear: body.data.referenceYear ?? old.referenceYear,
      referenceType: body.data.referenceType ?? old.referenceType,
      referenceNote: body.data.referenceNote ?? old.referenceNote,
      isArchived: false,
    })
    .returning();

  res.json(newRow);
});

// PATCH /questions/:questionId/archive
router.patch("/questions/:questionId/archive", requireEditor, async (req, res): Promise<void> => {
  const params = ArchiveQuestionParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(questionsTable)
    .set({ isArchived: true })
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(row);
});

export default router;
