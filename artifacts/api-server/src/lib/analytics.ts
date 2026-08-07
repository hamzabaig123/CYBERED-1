import { db, attemptAnswersTable, testAttemptsTable, questionsTable, sectionsTable, chaptersTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";

export const MIN_ATTEMPTS_FOR_SIGNAL = 5;

export interface TopicStat {
  sectionId: number;
  sectionName: string;
  chapterName: string;
  subjectName: string;
  className: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0..1
  lastAttemptDaysAgo: number | null;
  mastery: number; // 0..100
  label: "weak" | "strong" | "neutral";
}

function daysAgo(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function computeMastery(accuracy: number, attempts: number, lastDays: number | null): number {
  const accuracyScore = accuracy * 100;
  const volumeScore = Math.min(100, attempts * 10);
  let recencyScore = 0;
  if (lastDays != null) {
    if (lastDays <= 7) recencyScore = 100;
    else if (lastDays <= 30) recencyScore = 60;
    else recencyScore = 20;
  }
  return Math.round(0.5 * accuracyScore + 0.3 * volumeScore + 0.2 * recencyScore);
}

export async function getTopicStats(userId: number): Promise<TopicStat[]> {
  const rows = await db
    .select({
      sectionId: questionsTable.sectionId,
      sectionName: sectionsTable.name,
      chapterName: chaptersTable.name,
      subjectName: subjectsTable.name,
      className: classesTable.name,
      isCorrect: attemptAnswersTable.isCorrect,
      createdAt: attemptAnswersTable.createdAt,
    })
    .from(attemptAnswersTable)
    .innerJoin(testAttemptsTable, eq(attemptAnswersTable.attemptId, testAttemptsTable.id))
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
    .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id))
    .where(and(eq(testAttemptsTable.userId, userId), isNotNull(attemptAnswersTable.isCorrect)));

  const bySection = new Map<number, { name: string; chapter: string; subject: string; className: string; attempts: number; correct: number; lastAt: Date | null }>();

  for (const row of rows) {
    const entry = bySection.get(row.sectionId) ?? {
      name: row.sectionName,
      chapter: row.chapterName,
      subject: row.subjectName,
      className: row.className,
      attempts: 0,
      correct: 0,
      lastAt: null,
    };
    entry.attempts += 1;
    if (row.isCorrect) entry.correct += 1;
    if (!entry.lastAt || new Date(row.createdAt) > new Date(entry.lastAt)) entry.lastAt = row.createdAt;
    bySection.set(row.sectionId, entry);
  }

  const stats: TopicStat[] = [];
  for (const [sectionId, e] of bySection) {
    const accuracy = e.attempts > 0 ? e.correct / e.attempts : 0;
    const lastDays = daysAgo(e.lastAt);
    const mastery = computeMastery(accuracy, e.attempts, lastDays);
    const label = e.attempts >= MIN_ATTEMPTS_FOR_SIGNAL ? (accuracy < 0.5 ? "weak" : accuracy >= 0.8 ? "strong" : "neutral") : "neutral";
    stats.push({
      sectionId,
      sectionName: e.name,
      chapterName: e.chapter,
      subjectName: e.subject,
      className: e.className,
      attempts: e.attempts,
      correct: e.correct,
      accuracy: Math.round(accuracy * 100) / 100,
      lastAttemptDaysAgo: lastDays,
      mastery,
      label,
    });
  }

  return stats;
}

export async function getWeakSectionIds(userId: number, minAttempts = MIN_ATTEMPTS_FOR_SIGNAL): Promise<number[]> {
  const stats = await getTopicStats(userId);
  return stats.filter((s) => s.attempts >= minAttempts && s.accuracy < 0.5).map((s) => s.sectionId);
}

export async function getOverallAccuracy(userId: number): Promise<{ attempts: number; correct: number; accuracy: number }> {
  const rows = await db
    .select({
      isCorrect: attemptAnswersTable.isCorrect,
    })
    .from(attemptAnswersTable)
    .innerJoin(testAttemptsTable, eq(attemptAnswersTable.attemptId, testAttemptsTable.id))
    .where(and(eq(testAttemptsTable.userId, userId), isNotNull(attemptAnswersTable.isCorrect)));

  const attempts = rows.length;
  const correct = rows.filter((r) => r.isCorrect).length;
  return { attempts, correct, accuracy: attempts > 0 ? Math.round((correct / attempts) * 10000) / 10000 : 0 };
}
