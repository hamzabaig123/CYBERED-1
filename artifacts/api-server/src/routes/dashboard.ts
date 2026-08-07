import { Router, type IRouter } from "express";
import { db, classesTable, subjectsTable, chaptersTable, sectionsTable, questionsTable, testsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetRecentQuestionsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [classCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(classesTable)
    .where(eq(classesTable.isArchived, false));

  const [subjectCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subjectsTable)
    .where(eq(subjectsTable.isArchived, false));

  const [chapterCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chaptersTable)
    .where(eq(chaptersTable.isArchived, false));

  const [sectionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sectionsTable)
    .where(eq(sectionsTable.isArchived, false));

  const [questionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(eq(questionsTable.isArchived, false));

  const [mcqCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(and(eq(questionsTable.isArchived, false), eq(questionsTable.questionType, "mcq")));

  const [shortCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(and(eq(questionsTable.isArchived, false), eq(questionsTable.questionType, "short")));

  const [longCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(and(eq(questionsTable.isArchived, false), eq(questionsTable.questionType, "long")));

  const [testCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testsTable);

  res.json(
    GetDashboardStatsResponse.parse({
      totalClasses: classCount?.count ?? 0,
      totalSubjects: subjectCount?.count ?? 0,
      totalChapters: chapterCount?.count ?? 0,
      totalSections: sectionCount?.count ?? 0,
      totalQuestions: questionCount?.count ?? 0,
      totalMcqs: mcqCount?.count ?? 0,
      totalShortQuestions: shortCount?.count ?? 0,
      totalLongQuestions: longCount?.count ?? 0,
      totalTests: testCount?.count ?? 0,
    })
  );
});

// GET /dashboard/recent-questions
router.get("/dashboard/recent-questions", requireAuth, async (_req, res): Promise<void> => {
  const recentQuestions = await db
    .select({
      id: questionsTable.id,
      questionText: questionsTable.questionText,
      questionType: questionsTable.questionType,
      chapterName: chaptersTable.name,
      subjectName: subjectsTable.name,
      className: classesTable.name,
      createdAt: questionsTable.createdAt,
    })
    .from(questionsTable)
    .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
    .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id))
    .where(eq(questionsTable.isArchived, false))
    .orderBy(desc(questionsTable.createdAt))
    .limit(10);

  res.json(GetRecentQuestionsResponse.parse(recentQuestions));
});

export default router;
