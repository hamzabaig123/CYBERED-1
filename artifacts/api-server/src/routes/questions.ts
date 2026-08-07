import { Router, type IRouter } from "express";
import { db, questionsTable, sectionsTable, chaptersTable, subjectsTable, classesTable, userQuestionStateTable, usersTable } from "@workspace/db";
import { eq, and, asc, desc, like, or, gte, lte, gt, SQL } from "drizzle-orm";
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
  ExploreQuestionsQueryParams,
  CountExploredQuestionsQueryParams,
  ListSectionTagsParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
import { logStudyActivity } from "../lib/study";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// ── Question Explorer ─────────────────────────────────────────────────────────
// GET /questions/explorer?sectionId=X&limit=50&cursor=<id>&filters...
// Keyset (cursor) pagination, stable ordering by id.
router.get("/questions/explorer", requireAuth, async (req, res): Promise<void> => {
  const query = ExploreQuestionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const {
    sectionId,
    limit = 50,
    cursor,
    search,
    difficulty,
    referenceYear,
    referenceType,
    tag,
    status,
    questionType,
  } = query.data;

  const conditions: SQL[] = [
    eq(questionsTable.sectionId, sectionId),
    eq(questionsTable.isArchived, false),
  ];
  if (cursor != null) conditions.push(gt(questionsTable.id, cursor));
  if (search) {
    conditions.push(sql`(${questionsTable.questionText} ILIKE ${`%${search}%`} OR ${questionsTable.explanation} ILIKE ${`%${search}%`} OR ${questionsTable.modelAnswer} ILIKE ${`%${search}%`})`);
  }
  if (difficulty) conditions.push(eq(questionsTable.difficulty, difficulty));
  if (referenceYear != null) conditions.push(eq(questionsTable.referenceYear, referenceYear));
  if (referenceType) conditions.push(eq(questionsTable.referenceType, referenceType));
  if (questionType) conditions.push(eq(questionsTable.questionType, questionType));
  if (tag) {
    conditions.push(sql`${questionsTable.tags} ? ${tag}`);
  }
  if (status) conditions.push(eq(userQuestionStateTable.status, status));

  // Left-join current user's per-question state
  const rows = await db
    .select({
      id: questionsTable.id,
      sectionId: questionsTable.sectionId,
      questionType: questionsTable.questionType,
      questionText: questionsTable.questionText,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      modelAnswer: questionsTable.modelAnswer,
      marks: questionsTable.marks,
      referenceSource: questionsTable.referenceSource,
      referenceYear: questionsTable.referenceYear,
      referenceType: questionsTable.referenceType,
      referenceNote: questionsTable.referenceNote,
      tags: questionsTable.tags,
      difficulty: questionsTable.difficulty,
      bookPage: questionsTable.bookPage,
      bookExplanation: questionsTable.bookExplanation,
      aiExplanation: questionsTable.aiExplanation,
      imageUrl: questionsTable.imageUrl,
      createdAt: questionsTable.createdAt,
      updatedAt: questionsTable.updatedAt,
      userStatus: userQuestionStateTable.status,
    })
    .from(questionsTable)
    .leftJoin(
      userQuestionStateTable,
      and(
        eq(userQuestionStateTable.questionId, questionsTable.id),
        eq(userQuestionStateTable.userId, user.id)
      )
    )
    .where(and(...conditions))
    .orderBy(asc(questionsTable.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ questions: items, nextCursor, hasMore });
});

// GET /questions/explorer/count?sectionId=X&filters...
router.get("/questions/explorer/count", requireAuth, async (req, res): Promise<void> => {
  const query = CountExploredQuestionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { sectionId, search, difficulty, referenceYear, referenceType, tag, status, questionType } = query.data;

  const conditions: SQL[] = [
    eq(questionsTable.sectionId, sectionId),
    eq(questionsTable.isArchived, false),
  ];
  if (search) {
    conditions.push(sql`(${questionsTable.questionText} ILIKE ${`%${search}%`} OR ${questionsTable.explanation} ILIKE ${`%${search}%`} OR ${questionsTable.modelAnswer} ILIKE ${`%${search}%`})`);
  }
  if (difficulty) conditions.push(eq(questionsTable.difficulty, difficulty));
  if (referenceYear != null) conditions.push(eq(questionsTable.referenceYear, referenceYear));
  if (referenceType) conditions.push(eq(questionsTable.referenceType, referenceType));
  if (questionType) conditions.push(eq(questionsTable.questionType, questionType));
  if (tag) conditions.push(sql`${questionsTable.tags} ? ${tag}`);
  if (status) conditions.push(eq(userQuestionStateTable.status, status));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .leftJoin(userQuestionStateTable, eq(userQuestionStateTable.questionId, questionsTable.id))
    .where(and(...conditions));

  res.json({ total: count ?? 0 });
});

// GET /sections/:sectionId/tags
router.get("/sections/:sectionId/tags", requireAuth, async (req, res): Promise<void> => {
  const params = ListSectionTagsParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({ tags: questionsTable.tags })
    .from(questionsTable)
    .where(and(eq(questionsTable.sectionId, params.data.sectionId), eq(questionsTable.isArchived, false)));

  const tagSet = new Set<string>();
  for (const r of rows) {
    if (Array.isArray(r.tags)) {
      for (const t of r.tags) if (t) tagSet.add(t);
    }
  }

  res.json({ tags: Array.from(tagSet).sort() });
});

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

  await writeAudit(req, { action: "CREATE_QUESTION", entityType: "question", entityId: row.id });
  await logStudyActivity((req as typeof req & { user: typeof usersTable.$inferSelect }).user.id, { type: "questions_added", count: 1, meta: { questionId: row.id } });
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
  await writeAudit(req, { action: "BULK_CREATE_QUESTIONS", entityType: "question", entityId: null, detail: `${rows.length} questions` });
  await logStudyActivity((req as typeof req & { user: typeof usersTable.$inferSelect }).user.id, { type: "questions_added", count: rows.length });
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
      tags: body.data.tags ?? old.tags,
      difficulty: body.data.difficulty ?? old.difficulty,
      bookPage: body.data.bookPage ?? old.bookPage,
      bookExplanation: body.data.bookExplanation ?? old.bookExplanation,
      aiExplanation: body.data.aiExplanation ?? old.aiExplanation,
      imageUrl: body.data.imageUrl ?? old.imageUrl,
      isArchived: false,
    })
    .returning();

  await writeAudit(req, { action: "UPDATE_QUESTION", entityType: "question", entityId: newRow.id });
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
