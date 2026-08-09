import { Router, type IRouter } from "express";
import { db, studySessionsTable, attemptAnswersTable, testAttemptsTable, questionsTable, sectionsTable, chaptersTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateDailySummary } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";
import { getTopicStats } from "../lib/analytics";
import { todayISO } from "../lib/study";

const router: IRouter = Router();

interface CachedSummary {
  summary: string;
  day: string;
  language: string;
}

// In-memory one-per-day cache: { userId -> CachedSummary }
const dailyCache = new Map<number, CachedSummary>();

// GET /ai/summary/daily - Daily AI study summary (generated once per day, cached)
router.get("/ai/summary/daily", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const language = ["english", "urdu", "sindhi"].includes((req.query as any)?.language)
    ? (req.query as any).language
    : "english";

  const today = todayISO();

  const cached = dailyCache.get(user.id);
  if (cached && cached.day === today && cached.language === language) {
    res.json({ summary: cached.summary, cached: true, day: today });
    return;
  }

  try {
    // Today's study activity aggregate
    const [aggregate] = await db
      .select({
        minutes: sql<number>`coalesce(sum(${studySessionsTable.minutes}), 0)::int`,
        events: sql<number>`count(*)::int`,
      })
      .from(studySessionsTable)
      .where(and(eq(studySessionsTable.userId, user.id), sql`${studySessionsTable.activityDate} = ${today}`));

    const dayRows = await db
      .select({ type: studySessionsTable.type, count: studySessionsTable.count, minutes: studySessionsTable.minutes })
      .from(studySessionsTable)
      .where(and(eq(studySessionsTable.userId, user.id), sql`${studySessionsTable.activityDate} = ${today}`));

    let minutes = 0;
    let questionsSolved = 0;
    let questionsAdded = 0;
    let testsTaken = 0;
    let flashcardsReviewed = 0;
    let revisionsCompleted = 0;
    for (const row of dayRows) {
      minutes += row.minutes ?? 0;
      switch (row.type) {
        case "questions_solved": questionsSolved += row.count ?? 1; break;
        case "questions_added": questionsAdded += row.count ?? 1; break;
        case "test_taken": testsTaken += row.count ?? 1; break;
        case "flashcards_reviewed": flashcardsReviewed += row.count ?? 1; break;
        case "revision_completed": revisionsCompleted += row.count ?? 1; break;
      }
    }

    // Today's accuracy from graded attempts
    const attempts = await db
      .select({ isCorrect: attemptAnswersTable.isCorrect })
      .from(attemptAnswersTable)
      .innerJoin(testAttemptsTable, eq(attemptAnswersTable.attemptId, testAttemptsTable.id))
      .where(and(
        eq(testAttemptsTable.userId, user.id),
        isNotNull(attemptAnswersTable.isCorrect),
        sql`${testAttemptsTable.submittedAt}::date = ${today}`
      ));

    const accuracy = attempts.length > 0
      ? attempts.filter((a) => a.isCorrect).length / attempts.length
      : null;

    // Weakest topic (any subject) based on stored stats
    const stats = await getTopicStats(user.id);
    const weak = stats
      .filter((s) => s.attempts >= 3 && s.accuracy < 0.6)
      .sort((a, b) => b.mastery - a.mastery)
      .pop();
    const weakTopic = weak ? `${weak.chapterName} (${Math.round(weak.accuracy * 100)}% accuracy)` : null;

    const hasData = (aggregate?.events ?? 0) > 0 || attempts.length > 0;
    if (!hasData) {
      res.json({ summary: null, day: today, message: "No study activity recorded today yet." });
      return;
    }

    const summary = await generateDailySummary(
      {
        minutes,
        questionsSolved,
        questionsAdded,
        testsTaken,
        flashcardsReviewed,
        revisionsCompleted,
        accuracy,
        weakTopic,
      },
      { language }
    );

    dailyCache.set(user.id, { summary, day: today, language });

    await writeAudit(req, {
      action: "AI_DAILY_SUMMARY",
      entityType: "ai_summary",
      entityId: null,
      detail: `Generated daily study summary`,
    });

    res.json({ summary, cached: false, day: today });
  } catch (error) {
    console.error("Error generating daily summary:", error);
    res.status(500).json({ error: "Failed to generate daily summary" });
  }
});

// GET /ai/weak-topics?subjectName= - Weakest topics for a subject (AI engine header panel)
router.get("/ai/weak-topics", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const subjectName = String(req.query.subjectName ?? "").trim();

  try {
    const stats = await getTopicStats(user.id);
    const filtered = subjectName
      ? stats.filter((s) => s.subjectName === subjectName)
      : stats;

    const weakies = filtered
      .filter((s) => s.attempts >= 3 && s.accuracy < 0.6)
      .sort((a, b) => b.mastery - a.mastery);

    const strongest = filtered
      .filter((s) => s.attempts >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)[0] ?? null;

    res.json({
      weakest: weakies.length > 0 ? weakies : null,
      strongest,
      hasData: filtered.some((s) => s.attempts >= 3),
    });
  } catch (error) {
    console.error("Error computing weak topics:", error);
    res.status(500).json({ error: "Failed to compute weak topics" });
  }
});

export default router;