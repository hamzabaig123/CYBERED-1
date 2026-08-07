import { Router, type IRouter } from "express";
import { db, flashcardsTable } from "@workspace/db";
import { eq, and, desc, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  ListFlashcardsQueryParams,
  CreateFlashcardParams,
  CreateFlashcardBody,
  GetFlashcardParams,
  UpdateFlashcardParams,
  UpdateFlashcardBody,
  DeleteFlashcardParams,
  BulkCreateFlashcardsParams,
  BulkCreateFlashcardsBody,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /flashcards?sectionId=X&page=1&limit=50&search=...
router.get("/flashcards", requireAuth, async (req, res): Promise<void> => {
  const params = ListFlashcardsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sectionId, page = 1, limit = 50, search } = params.data;

  const conditions: SQL[] = [eq(flashcardsTable.sectionId, sectionId), eq(flashcardsTable.isArchived, false)];
  if (search) {
    conditions.push(sql`(${flashcardsTable.front} ILIKE ${`%${search}%`} OR ${flashcardsTable.back} ILIKE ${`%${search}%`})`);
  }

  const offset = (page - 1) * limit;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flashcardsTable)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(flashcardsTable)
    .where(and(...conditions))
    .orderBy(desc(flashcardsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ flashcards: rows, total: count ?? 0, page, limit });
});

// POST /sections/:sectionId/flashcards
router.post("/sections/:sectionId/flashcards", requireEditor, async (req, res): Promise<void> => {
  const params = CreateFlashcardParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateFlashcardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(flashcardsTable)
    .values({ ...body.data, sectionId: params.data.sectionId })
    .returning();

  await writeAudit(req, { action: "CREATE_FLASHCARD", entityType: "flashcard", entityId: row.id });
  res.status(201).json(row);
});

// POST /sections/:sectionId/flashcards/bulk
router.post("/sections/:sectionId/flashcards/bulk", requireEditor, async (req, res): Promise<void> => {
  const params = BulkCreateFlashcardsParams.safeParse({ sectionId: parseId(req.params.sectionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = BulkCreateFlashcardsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const values = body.data.flashcards.map((f: { front: string; back: string; referenceSource?: string | null; referenceYear?: number | null }) => ({
    ...f,
    sectionId: params.data.sectionId,
  }));

  const rows = await db.insert(flashcardsTable).values(values).returning();
  res.status(201).json(rows);
});

// GET /flashcards/:flashcardId
router.get("/flashcards/:flashcardId", requireAuth, async (req, res): Promise<void> => {
  const params = GetFlashcardParams.safeParse({ flashcardId: parseId(req.params.flashcardId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(flashcardsTable).where(eq(flashcardsTable.id, params.data.flashcardId));
  if (!row) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  res.json(row);
});

// PATCH /flashcards/:flashcardId
router.patch("/flashcards/:flashcardId", requireEditor, async (req, res): Promise<void> => {
  const params = UpdateFlashcardParams.safeParse({ flashcardId: parseId(req.params.flashcardId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateFlashcardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(flashcardsTable)
    .set(body.data)
    .where(eq(flashcardsTable.id, params.data.flashcardId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  await writeAudit(req, { action: "UPDATE_FLASHCARD", entityType: "flashcard", entityId: row.id });
  res.json(row);
});

// DELETE /flashcards/:flashcardId
router.delete("/flashcards/:flashcardId", requireEditor, async (req, res): Promise<void> => {
  const params = DeleteFlashcardParams.safeParse({ flashcardId: parseId(req.params.flashcardId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(flashcardsTable)
    .set({ isArchived: true })
    .where(eq(flashcardsTable.id, params.data.flashcardId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  await writeAudit(req, { action: "DELETE_FLASHCARD", entityType: "flashcard", entityId: row.id });
  res.sendStatus(204);
});

export default router;
