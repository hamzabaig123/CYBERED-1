import { Router, type IRouter } from "express";
import { db, classesTable, subjectsTable, chaptersTable, sectionsTable, questionsTable } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import {
  ListClassesQueryParams,
  CreateClassBody,
  GetClassParams,
  UpdateClassParams,
  UpdateClassBody,
  ArchiveClassParams,
  ListSubjectsQueryParams,
  CreateSubjectParams,
  CreateSubjectBody,
  GetSubjectParams,
  UpdateSubjectParams,
  UpdateSubjectBody,
  ArchiveSubjectParams,
  ListChaptersQueryParams,
  CreateChapterParams,
  CreateChapterBody,
  GetChapterParams,
  UpdateChapterParams,
  UpdateChapterBody,
  ArchiveChapterParams,
  ListSectionsQueryParams,
  CreateSectionParams,
  CreateSectionBody,
  GetSectionParams,
  UpdateSectionParams,
  UpdateSectionBody,
  ArchiveSectionParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";

const router: IRouter = Router();

// ── Helper to parse numeric path param ─────────────────────────────────────
function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// ═══════════════════════════════════════════════════════════════════════════
// Classes
// ═══════════════════════════════════════════════════════════════════════════

// GET /classes
router.get("/classes", requireAuth, async (req, res): Promise<void> => {
  const params = ListClassesQueryParams.safeParse(req.query);
  const includeArchived = params.success ? params.data.includeArchived : false;

  const rows = await db
    .select()
    .from(classesTable)
    .where(includeArchived ? undefined : eq(classesTable.isArchived, false))
    .orderBy(asc(classesTable.orderIndex), asc(classesTable.name));

  res.json(rows);
});

// POST /classes
router.post("/classes", requireEditor, async (req, res): Promise<void> => {
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.insert(classesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// GET /classes/:classId
router.get("/classes/:classId", requireAuth, async (req, res): Promise<void> => {
  const params = GetClassParams.safeParse({ classId: parseId(req.params.classId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(classesTable).where(eq(classesTable.id, params.data.classId));
  if (!row) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json(row);
});

// PATCH /classes/:classId
router.patch("/classes/:classId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateClassParams.safeParse({ classId: parseId(req.params.classId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateClassBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(classesTable)
    .set(body.data)
    .where(eq(classesTable.id, params.data.classId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json(row);
});

// PATCH /classes/:classId/archive
router.patch("/classes/:classId/archive", requireEditor, async (req, res): Promise<void> => {
  const params = ArchiveClassParams.safeParse({ classId: parseId(req.params.classId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(classesTable)
    .set({ isArchived: true })
    .where(eq(classesTable.id, params.data.classId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json(row);
});

// ═══════════════════════════════════════════════════════════════════════════
// Subjects
// ═══════════════════════════════════════════════════════════════════════════

// GET /subjects?classId=X
router.get("/subjects", requireAuth, async (req, res): Promise<void> => {
  const params = ListSubjectsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { classId, includeArchived } = params.data;

  const rows = await db
    .select()
    .from(subjectsTable)
    .where(
      includeArchived
        ? eq(subjectsTable.classId, classId)
        : and(eq(subjectsTable.classId, classId), eq(subjectsTable.isArchived, false))
    )
    .orderBy(asc(subjectsTable.orderIndex), asc(subjectsTable.name));

  res.json(rows);
});

// POST /classes/:classId/subjects
router.post("/classes/:classId/subjects", requireEditor, async (req, res): Promise<void> => {
  const params = CreateSubjectParams.safeParse({ classId: parseId(req.params.classId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateSubjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(subjectsTable)
    .values({ ...body.data, classId: params.data.classId })
    .returning();

  res.status(201).json(row);
});

// GET /subjects/:subjectId
router.get("/subjects/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, params.data.subjectId));
  if (!row) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(row);
});

// PATCH /subjects/:subjectId
router.patch("/subjects/:subjectId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSubjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(subjectsTable)
    .set(body.data)
    .where(eq(subjectsTable.id, params.data.subjectId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(row);
});

// PATCH /subjects/:subjectId/archive
router.patch("/subjects/:subjectId/archive", requireEditor, async (req, res): Promise<void> => {
  const params = ArchiveSubjectParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(subjectsTable)
    .set({ isArchived: true })
    .where(eq(subjectsTable.id, params.data.subjectId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(row);
});

// ═══════════════════════════════════════════════════════════════════════════
// Chapters
// ═══════════════════════════════════════════════════════════════════════════

// GET /chapters?subjectId=X
router.get("/chapters", requireAuth, async (req, res): Promise<void> => {
  const params = ListChaptersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { subjectId, includeArchived } = params.data;

  const rows = await db
    .select()
    .from(chaptersTable)
    .where(
      includeArchived
        ? eq(chaptersTable.subjectId, subjectId)
        : and(eq(chaptersTable.subjectId, subjectId), eq(chaptersTable.isArchived, false))
    )
    .orderBy(asc(chaptersTable.orderIndex), asc(chaptersTable.name));

  res.json(rows);
});

// POST /subjects/:subjectId/chapters
router.post("/subjects/:subjectId/chapters", requireEditor, async (req, res): Promise<void> => {
  const params = CreateChapterParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateChapterBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(chaptersTable)
    .values({ ...body.data, subjectId: params.data.subjectId })
    .returning();

  res.status(201).json(row);
});

// GET /chapters/:chapterId
router.get("/chapters/:chapterId", requireAuth, async (req, res): Promise<void> => {
  const params = GetChapterParams.safeParse({ chapterId: parseId(req.params.chapterId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, params.data.chapterId));
  if (!row) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  res.json(row);
});

// PATCH /chapters/:chapterId
router.patch("/chapters/:chapterId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateChapterParams.safeParse({ chapterId: parseId(req.params.chapterId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateChapterBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(chaptersTable)
    .set(body.data)
    .where(eq(chaptersTable.id, params.data.chapterId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  res.json(row);
});

// PATCH /chapters/:chapterId/archive
router.patch("/chapters/:chapterId/archive", requireEditor, async (req, res): Promise<void> => {
  const params = ArchiveChapterParams.safeParse({ chapterId: parseId(req.params.chapterId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(chaptersTable)
    .set({ isArchived: true })
    .where(eq(chaptersTable.id, params.data.chapterId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  res.json(row);
});

// ═══════════════════════════════════════════════════════════════════════════
// Sections
// ═══════════════════════════════════════════════════════════════════════════

// GET /sections?chapterId=X
router.get("/sections", requireAuth, async (req, res): Promise<void> => {
  const params = ListSectionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { chapterId, includeArchived } = params.data;

  const rows = await db
    .select({
      id: sectionsTable.id,
      chapterId: sectionsTable.chapterId,
      name: sectionsTable.name,
      sectionType: sectionsTable.sectionType,
      orderIndex: sectionsTable.orderIndex,
      isArchived: sectionsTable.isArchived,
      createdAt: sectionsTable.createdAt,
      questionCount: sql<number>`(
        SELECT count(*)::int FROM questions
        WHERE questions.section_id = sections.id
        AND questions.is_archived = false
      )`,
    })
    .from(sectionsTable)
    .where(
      includeArchived
        ? eq(sectionsTable.chapterId, chapterId)
        : and(eq(sectionsTable.chapterId, chapterId), eq(sectionsTable.isArchived, false))
    )
    .orderBy(asc(sectionsTable.orderIndex), asc(sectionsTable.name));

  res.json(rows);
});

// POST /chapters/:chapterId/sections
router.post("/chapters/:chapterId/sections", requireEditor, async (req, res): Promise<void> => {
  const params = CreateSectionParams.safeParse({ chapterId: parseId(req.params.chapterId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateSectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(sectionsTable)
    .values({ ...body.data, chapterId: params.data.chapterId })
    .returning();

  res.status(201).json({ ...row, questionCount: 0 });
});

// GET /sections/:sectionId
router.get("/sections/:sectionId", requireAuth, async (req, res): Promise<void> => {
  const params = GetSectionParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: sectionsTable.id,
      chapterId: sectionsTable.chapterId,
      name: sectionsTable.name,
      sectionType: sectionsTable.sectionType,
      orderIndex: sectionsTable.orderIndex,
      isArchived: sectionsTable.isArchived,
      createdAt: sectionsTable.createdAt,
      questionCount: sql<number>`(
        SELECT count(*)::int FROM questions
        WHERE questions.section_id = sections.id
        AND questions.is_archived = false
      )`,
    })
    .from(sectionsTable)
    .where(eq(sectionsTable.id, params.data.sectionId));

  if (!row) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(row);
});

// PATCH /sections/:sectionId
router.patch("/sections/:sectionId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateSectionParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(sectionsTable)
    .set(body.data)
    .where(eq(sectionsTable.id, params.data.sectionId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json({ ...row, questionCount: null });
});

// PATCH /sections/:sectionId/archive
router.patch("/sections/:sectionId/archive", requireEditor, async (req, res): Promise<void> => {
  const params = ArchiveSectionParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(sectionsTable)
    .set({ isArchived: true })
    .where(eq(sectionsTable.id, params.data.sectionId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json({ ...row, questionCount: null });
});

export default router;
