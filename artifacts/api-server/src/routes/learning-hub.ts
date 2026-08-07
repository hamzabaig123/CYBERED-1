import { Router, type IRouter } from "express";
import { db, usersTable, studySessionsTable, revisionSchedulesTable, dailyGoalsTable, questionsTable, sectionsTable, testsTable, testAttemptsTable } from "@workspace/db";
import { eq, and, inArray, desc, asc, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  ScheduleRevisionBody,
  CompleteRevisionParams,
  CompleteRevisionBody,
  ListGoalsQueryParams,
  SetTodayGoalBody,
  UpdateGoalParams,
  UpdateGoalBody,
  DeleteGoalParams,
  GetLearningCalendarQueryParams,
  GetLearningTimelineQueryParams,
  GetLearningHeatmapQueryParams,
  GetLearningReportQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logStudyActivity, getStudyStreak, getDailyAggregates, nextRevisionSchedule, todayISO, REVISION_INTERVALS } from "../lib/study";
import { getTopicStats } from "../lib/analytics";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

function getUser(req: unknown): { id: number } {
  return (req as { user: typeof usersTable.$inferSelect }).user;
}

// ── Revisions ────────────────────────────────────────────────────────────────
// GET /revisions/due
router.get("/revisions/due", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const schedules = await db
    .select()
    .from(revisionSchedulesTable)
    .where(and(eq(revisionSchedulesTable.userId, user.id), sql`${revisionSchedulesTable.dueAt} <= now()`))
    .orderBy(asc(revisionSchedulesTable.dueAt))
    .limit(100);

  const questionIds = Array.from(new Set(schedules.map((s) => s.questionId)));
  const questions =
    questionIds.length > 0
      ? await db
          .select({ id: questionsTable.id, sectionId: questionsTable.sectionId, questionType: questionsTable.questionType, questionText: questionsTable.questionText })
          .from(questionsTable)
          .where(inArray(questionsTable.id, questionIds))
      : [];

  const sectionIds = Array.from(new Set(questions.map((q) => q.sectionId)));
  const sections =
    sectionIds.length > 0
      ? await db
          .select({ id: sectionsTable.id, name: sectionsTable.name })
          .from(sectionsTable)
          .where(inArray(sectionsTable.id, sectionIds))
      : [];
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  res.json(
    schedules.map((s) => ({
      id: s.id,
      questionId: s.questionId,
      questionType: s.questionType,
      questionText: questionMap.get(s.questionId)?.questionText ?? null,
      sectionName: s.questionId != null ? sectionMap.get(questionMap.get(s.questionId)?.sectionId ?? -1) ?? null : null,
      dueAt: s.dueAt.toISOString(),
      intervalDays: s.intervalDays,
      repetitions: s.repetitions,
      easeFactor: s.easeFactor,
    }))
  );
});

// POST /revisions (schedule questions for revision)
router.post("/revisions", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const body = ScheduleRevisionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.questionIds.length === 0) {
    res.status(400).json({ error: "questionIds must not be empty" });
    return;
  }

  const now = new Date();
  const created: typeof revisionSchedulesTable.$inferSelect[] = [];

  for (const questionId of body.data.questionIds) {
    const [existing] = await db
      .select()
      .from(revisionSchedulesTable)
      .where(and(eq(revisionSchedulesTable.userId, user.id), eq(revisionSchedulesTable.questionId, questionId)));

    if (existing) {
      const [updated] = await db
        .update(revisionSchedulesTable)
        .set({ dueAt: now, intervalDays: 1, repetitions: 0, easeFactor: 250 })
        .where(eq(revisionSchedulesTable.id, existing.id))
        .returning();
      created.push(updated);
    } else {
      const [row] = await db
        .insert(revisionSchedulesTable)
        .values({ userId: user.id, questionId, dueAt: now, intervalDays: 1, repetitions: 0, easeFactor: 250 })
        .returning();
      created.push(row);
    }
  }

  res.status(201).json(created.map((r) => ({ id: r.id, questionId: r.questionId, dueAt: r.dueAt.toISOString(), intervalDays: r.intervalDays, repetitions: r.repetitions, easeFactor: r.easeFactor })));
});

// POST /revisions/:revisionId/complete
router.post("/revisions/:revisionId/complete", requireAuth, async (req, res): Promise<void> => {
  const params = CompleteRevisionParams.safeParse({ revisionId: parseId(req.params.revisionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteRevisionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = getUser(req);

  const [schedule] = await db
    .select()
    .from(revisionSchedulesTable)
    .where(and(eq(revisionSchedulesTable.id, params.data.revisionId), eq(revisionSchedulesTable.userId, user.id)));

  if (!schedule) {
    res.status(404).json({ error: "Revision schedule not found" });
    return;
  }

  const next = nextRevisionSchedule(
    { intervalDays: schedule.intervalDays, repetitions: schedule.repetitions, easeFactor: schedule.easeFactor },
    body.data.grade
  );

  const dueAt = new Date(Date.now() + next.intervalDays * 86400000);

  const [updated] = await db
    .update(revisionSchedulesTable)
    .set({ intervalDays: next.intervalDays, repetitions: next.repetitions, easeFactor: next.easeFactor, dueAt, lastReviewedAt: new Date() })
    .where(eq(revisionSchedulesTable.id, schedule.id))
    .returning();

  await logStudyActivity(user.id, { type: "revision_completed", count: 1, meta: { questionId: schedule.questionId } });

  res.json({ id: updated.id, questionId: updated.questionId, dueAt: updated.dueAt.toISOString(), intervalDays: updated.intervalDays, repetitions: updated.repetitions, easeFactor: updated.easeFactor });
});

// ── Daily goals ──────────────────────────────────────────────────────────────
// GET /goals?year=&month=
router.get("/goals", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = ListGoalsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { year, month } = params.data;
  let rows;
  if (year != null && month != null) {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const to = `${year}-${String(month).padStart(2, "0")}-31`;
    rows = await db
      .select()
      .from(dailyGoalsTable)
      .where(and(eq(dailyGoalsTable.userId, user.id), gte(dailyGoalsTable.goalDate, from), lte(dailyGoalsTable.goalDate, to)))
      .orderBy(asc(dailyGoalsTable.goalDate));
  } else {
    rows = await db
      .select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.userId, user.id))
      .orderBy(desc(dailyGoalsTable.goalDate))
      .limit(60);
  }

  res.json(rows);
});

// PUT /goals/today
router.put("/goals/today", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const body = SetTodayGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const goalDate = todayISO();
  const [existing] = await db
    .select()
    .from(dailyGoalsTable)
    .where(and(eq(dailyGoalsTable.userId, user.id), eq(dailyGoalsTable.goalDate, goalDate)));

  if (existing) {
    const [updated] = await db
      .update(dailyGoalsTable)
      .set({
        questionsTarget: body.data.questionsTarget ?? existing.questionsTarget,
        minutesTarget: body.data.minutesTarget ?? existing.minutesTarget,
        testsTarget: body.data.testsTarget ?? existing.testsTarget,
      })
      .where(eq(dailyGoalsTable.id, existing.id))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db
    .insert(dailyGoalsTable)
    .values({
      userId: user.id,
      goalDate,
      questionsTarget: body.data.questionsTarget ?? 0,
      minutesTarget: body.data.minutesTarget ?? 0,
      testsTarget: body.data.testsTarget ?? 0,
    })
    .returning();

  res.status(201).json(created);
});

// PATCH /goals/:goalId
router.patch("/goals/:goalId", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = UpdateGoalParams.safeParse({ goalId: parseId(req.params.goalId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .update(dailyGoalsTable)
    .set(body.data)
    .where(and(eq(dailyGoalsTable.id, params.data.goalId), eq(dailyGoalsTable.userId, user.id)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  res.json(row);
});

// DELETE /goals/:goalId
router.delete("/goals/:goalId", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = DeleteGoalParams.safeParse({ goalId: parseId(req.params.goalId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(dailyGoalsTable)
    .where(and(eq(dailyGoalsTable.id, params.data.goalId), eq(dailyGoalsTable.userId, user.id)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  res.json({ id: row.id });
});

// ── Calendar ─────────────────────────────────────────────────────────────────
// GET /learning-hub/calendar?year=&month=
router.get("/learning-hub/calendar", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetLearningCalendarQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const year = params.data.year ?? new Date().getFullYear();
  const month = params.data.month ?? new Date().getMonth() + 1;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [aggregates, goals, streak] = await Promise.all([
    getDailyAggregates(user.id, from, to),
    db.select().from(dailyGoalsTable).where(and(eq(dailyGoalsTable.userId, user.id), gte(dailyGoalsTable.goalDate, from), lte(dailyGoalsTable.goalDate, to))),
    getStudyStreak(user.id),
  ]);

  const goalByDate = new Map(goals.map((g) => [g.goalDate, g]));

  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${from.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const agg = aggregates[date] ?? { minutes: 0, questionsSolved: 0, questionsAdded: 0, testsTaken: 0, flashcardsReviewed: 0, revisionsCompleted: 0, events: 0 };
    const goal = goalByDate.get(date);
    days.push({
      date,
      ...agg,
      goal: goal ?? null,
      goalMet:
        goal != null
          ? agg.questionsSolved >= goal.questionsTarget && agg.minutes >= goal.minutesTarget && agg.testsTaken >= goal.testsTarget
          : null,
    });
  }

  res.json({ year, month, days, currentStreak: streak.currentStreak, bestStreak: streak.bestStreak });
});

// ── Timeline ─────────────────────────────────────────────────────────────────
// GET /learning-hub/timeline?limit=
router.get("/learning-hub/timeline", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetLearningTimelineQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = Math.min(params.data.limit ?? 50, 200);

  const rows = await db
    .select()
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, user.id))
    .orderBy(desc(studySessionsTable.createdAt))
    .limit(limit);

  // Enrich with question text / test title from meta.
  const questionIds = Array.from(new Set(rows.filter((r) => r.meta?.questionId != null).map((r) => r.meta!.questionId as number)));
  const testIds = Array.from(new Set(rows.filter((r) => r.meta?.testId != null).map((r) => r.meta!.testId as number)));

  const [questions, tests] = await Promise.all([
    questionIds.length > 0
      ? db.select({ id: questionsTable.id, questionText: questionsTable.questionText }).from(questionsTable).where(inArray(questionsTable.id, questionIds))
      : Promise.resolve([]),
    testIds.length > 0
      ? db.select({ id: testsTable.id, title: testsTable.title }).from(testsTable).where(inArray(testsTable.id, testIds))
      : Promise.resolve([]),
  ]);

  const questionMap = new Map(questions.map((q) => [q.id, q.questionText]));
  const testMap = new Map(tests.map((t) => [t.id, t.title]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      count: r.count,
      minutes: r.minutes,
      activityDate: r.activityDate,
      createdAt: r.createdAt.toISOString(),
      questionText: r.meta?.questionId != null ? questionMap.get(r.meta.questionId as number) ?? null : null,
      testTitle: r.meta?.testId != null ? testMap.get(r.meta.testId as number) ?? null : null,
    }))
  );
});

// ── Heatmap ──────────────────────────────────────────────────────────────────
// GET /learning-hub/heatmap?year=
router.get("/learning-hub/heatmap", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetLearningHeatmapQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const year = params.data.year ?? new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const aggregates = await getDailyAggregates(user.id, from, to);

  const days = [];
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const agg = aggregates[date];
      days.push({
        date,
        events: agg?.events ?? 0,
        minutes: agg?.minutes ?? 0,
        questionsSolved: agg?.questionsSolved ?? 0,
      });
    }
  }

  res.json({ year, days });
});

// ── Streak ───────────────────────────────────────────────────────────────────
// GET /learning-hub/streak
router.get("/learning-hub/streak", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const streak = await getStudyStreak(user.id);
  res.json(streak);
});

// ── Reports ──────────────────────────────────────────────────────────────────
// GET /learning-hub/reports?period=week|month
router.get("/learning-hub/reports", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const params = GetLearningReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "week";
  const days = period === "week" ? 7 : 30;

  const now = new Date();
  const fromDate = new Date(now.getTime() - (days - 1) * 86400000);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [aggregates, topicStats, attempts, streak] = await Promise.all([
    getDailyAggregates(user.id, from, to),
    getTopicStats(user.id),
    db
      .select({
        id: testAttemptsTable.id,
        testId: testsTable.id,
        title: testsTable.title,
        score: testAttemptsTable.score,
        totalMarks: testAttemptsTable.totalMarks,
        submittedAt: testAttemptsTable.submittedAt,
      })
      .from(testAttemptsTable)
      .innerJoin(testsTable, eq(testAttemptsTable.testId, testsTable.id))
      .where(and(eq(testAttemptsTable.userId, user.id), gte(testAttemptsTable.submittedAt, fromDate))),
    getStudyStreak(user.id),
  ]);

  let totals = { minutes: 0, questionsSolved: 0, questionsAdded: 0, testsTaken: 0, flashcardsReviewed: 0, revisionsCompleted: 0, events: 0 };
  for (const key of Object.keys(aggregates)) {
    const a = aggregates[key];
    totals = {
      minutes: totals.minutes + a.minutes,
      questionsSolved: totals.questionsSolved + a.questionsSolved,
      questionsAdded: totals.questionsAdded + a.questionsAdded,
      testsTaken: totals.testsTaken + a.testsTaken,
      flashcardsReviewed: totals.flashcardsReviewed + a.flashcardsReviewed,
      revisionsCompleted: totals.revisionsCompleted + a.revisionsCompleted,
      events: totals.events + a.events,
    };
  }

  res.json({
    period,
    from,
    to,
    totals,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    topicStats,
    tests: attempts.map((t) => ({
      testId: t.testId,
      title: t.title,
      score: t.score,
      totalMarks: t.totalMarks,
      submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
    })),
  });
});

export default router;
