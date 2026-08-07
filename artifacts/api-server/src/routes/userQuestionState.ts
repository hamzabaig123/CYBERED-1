import { Router, type IRouter } from "express";
import { db, userQuestionStateTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  SetQuestionStateBody,
  GetQuestionStateParams,
  ListMyQuestionStatesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logStudyActivity } from "../lib/study";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /questions/:questionId/state
router.get("/questions/:questionId/state", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const params = GetQuestionStateParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(userQuestionStateTable)
    .where(
      and(
        eq(userQuestionStateTable.userId, user.id),
        eq(userQuestionStateTable.questionId, params.data.questionId)
      )
    );

  res.json({
    status: row?.status ?? null,
    lastAttemptedAt: row?.lastAttemptedAt ? row.lastAttemptedAt.toISOString() : null,
  });
});

// PUT /questions/:questionId/state
router.put("/questions/:questionId/state", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const params = GetQuestionStateParams.safeParse({ questionId: parseId(req.params.questionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SetQuestionStateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(userQuestionStateTable)
    .where(
      and(
        eq(userQuestionStateTable.userId, user.id),
        eq(userQuestionStateTable.questionId, params.data.questionId)
      )
    );

  if (existing.length === 0) {
    await db.insert(userQuestionStateTable).values({
      userId: user.id,
      questionId: params.data.questionId,
      questionType: body.data.questionType ?? "mcq",
      status: body.data.status,
      lastAttemptedAt: body.data.status === "solved" || body.data.status === "wrong" ? new Date() : null,
    });
  } else {
    await db
      .update(userQuestionStateTable)
      .set({
        status: body.data.status,
        lastAttemptedAt:
          body.data.status === "solved" || body.data.status === "wrong" ? new Date() : existing[0].lastAttemptedAt,
      })
      .where(eq(userQuestionStateTable.id, existing[0].id));
  }

  if (body.data.status === "solved") {
    await logStudyActivity(user.id, { type: "questions_solved", count: 1, meta: { questionId: params.data.questionId } });
  }

  const [row] = await db
    .select()
    .from(userQuestionStateTable)
    .where(
      and(
        eq(userQuestionStateTable.userId, user.id),
        eq(userQuestionStateTable.questionId, params.data.questionId)
      )
    );

  res.json({
    status: row.status,
    lastAttemptedAt: row.lastAttemptedAt ? row.lastAttemptedAt.toISOString() : null,
  });
});

// GET /my/question-states?status=bookmarked&limit=50
router.get("/my/question-states", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const params = ListMyQuestionStatesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, limit = 50 } = params.data;
  const conditions = [eq(userQuestionStateTable.userId, user.id)];
  if (status) conditions.push(eq(userQuestionStateTable.status, status));

  const rows = await db
    .select()
    .from(userQuestionStateTable)
    .where(and(...conditions))
    .orderBy(sql`${userQuestionStateTable.updatedAt} desc`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      id: r.id,
      questionId: r.questionId,
      questionType: r.questionType,
      status: r.status,
      lastAttemptedAt: r.lastAttemptedAt ? r.lastAttemptedAt.toISOString() : null,
    }))
  );
});

export default router;
