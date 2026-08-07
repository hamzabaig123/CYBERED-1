import { Router, type IRouter } from "express";
import { db, usersTable, userQuestionStateTable, testAttemptsTable, testsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getTopicStats, getOverallAccuracy, getWeakSectionIds } from "../lib/analytics";
import { getStudyStreak, getDailyAggregates, dueRevisionCount, todayISO } from "../lib/study";

const router: IRouter = Router();

function getUser(req: unknown): { id: number } {
  return (req as { user: typeof usersTable.$inferSelect }).user;
}

function weekStartISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

// GET /analytics/accuracy
router.get("/analytics/accuracy", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const overall = await getOverallAccuracy(user.id);
  res.json(overall);
});

// GET /analytics/topics
router.get("/analytics/topics", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const stats = await getTopicStats(user.id);
  res.json(stats);
});

// GET /analytics/mastery
router.get("/analytics/mastery", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const stats = await getTopicStats(user.id);
  stats.sort((a, b) => a.mastery - b.mastery);
  res.json(stats);
});

// GET /analytics/dashboard
router.get("/analytics/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const [accuracy, topics, streak, dueCount, aggregates, states, recentAttempts] = await Promise.all([
    getOverallAccuracy(user.id),
    getTopicStats(user.id),
    getStudyStreak(user.id),
    dueRevisionCount(user.id),
    getDailyAggregates(user.id, weekStartISO(), todayISO()),
    db.select({ status: userQuestionStateTable.status }).from(userQuestionStateTable).where(eq(userQuestionStateTable.userId, user.id)),
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
      .where(eq(testAttemptsTable.userId, user.id))
      .orderBy(sql`${testAttemptsTable.createdAt} desc`)
      .limit(5),
  ]);

  let questionsSolvedThisWeek = 0;
  for (const key of Object.keys(aggregates)) {
    questionsSolvedThisWeek += aggregates[key].questionsSolved;
  }

  const solvedCount = states.filter((s) => s.status === "solved").length;
  const wrongCount = states.filter((s) => s.status === "wrong").length;

  const weakTopics = topics.filter((t) => t.label === "weak").sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  res.json({
    accuracy,
    solvedCount,
    wrongCount,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    questionsSolvedThisWeek,
    dueRevisions: dueCount,
    weakTopics,
    masteryBySection: topics.slice().sort((a, b) => a.mastery - b.mastery),
    recentTests: recentAttempts.map((t) => ({
      testId: t.testId,
      title: t.title,
      score: t.score,
      totalMarks: t.totalMarks,
      submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
    })),
  });
});

export default router;
