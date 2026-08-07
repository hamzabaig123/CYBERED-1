import { db, studySessionsTable, revisionSchedulesTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export type StudyActivityInput = {
  type: string;
  count?: number;
  minutes?: number;
  meta?: { testId?: number; questionId?: number } | null;
};

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return localDateISO(new Date());
}

function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

/**
 * Log a study activity event. Each call inserts one row; aggregation to
 * per-day totals happens at read time.
 */
export async function logStudyActivity(
  userId: number,
  input: StudyActivityInput
): Promise<void> {
  try {
    await db.insert(studySessionsTable).values({
      userId,
      type: input.type,
      count: input.count ?? 1,
      minutes: input.minutes ?? 0,
      meta: input.meta ?? null,
      activityDate: todayISO(),
    });
  } catch (err) {
    console.error("Failed to log study activity:", err);
  }
}

/**
 * Compute the current active streak and the all-time best streak.
 * A streak counts consecutive days with at least one activity event; the
 * current streak is still "alive" if the most recent activity day is today
 * or yesterday.
 */
export async function getStudyStreak(userId: number): Promise<{ currentStreak: number; bestStreak: number }> {
  const rows = await db
    .selectDistinct({ activityDate: studySessionsTable.activityDate })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId))
    .orderBy(asc(studySessionsTable.activityDate));

  const dates = new Set(rows.map((r) => r.activityDate));

  // Current streak
  let currentStreak = 0;
  let d = todayISO();
  if (!dates.has(d)) d = shiftISO(d, -1);
  while (dates.has(d)) {
    currentStreak += 1;
    d = shiftISO(d, -1);
  }

  // Best streak
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const dateStr of rows.map((r) => r.activityDate)) {
    if (prev !== null && dateStr === shiftISO(prev, 1)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
    prev = dateStr;
  }

  return { currentStreak, bestStreak };
}

/**
 * Daily aggregate for a range of dates.
 * Returns a map of "YYYY-MM-DD" -> { minutes, questionsSolved, questionsAdded, testsTaken, flashcardsReviewed, revisionsCompleted, events }
 */
export async function getDailyAggregates(
  userId: number,
  fromISO: string,
  toISO: string
): Promise<Record<string, { minutes: number; questionsSolved: number; questionsAdded: number; testsTaken: number; flashcardsReviewed: number; revisionsCompleted: number; events: number }>> {
  const rows = await db
    .select({
      activityDate: studySessionsTable.activityDate,
      type: studySessionsTable.type,
      count: studySessionsTable.count,
      minutes: studySessionsTable.minutes,
    })
    .from(studySessionsTable)
    .where(
      and(
        eq(studySessionsTable.userId, userId),
        sql`${studySessionsTable.activityDate} >= ${fromISO}`,
        sql`${studySessionsTable.activityDate} <= ${toISO}`
      )
    );

  const map: Record<string, { minutes: number; questionsSolved: number; questionsAdded: number; testsTaken: number; flashcardsReviewed: number; revisionsCompleted: number; events: number }> = {};

  for (const row of rows) {
    const key = row.activityDate;
    const entry = map[key] ?? {
      minutes: 0,
      questionsSolved: 0,
      questionsAdded: 0,
      testsTaken: 0,
      flashcardsReviewed: 0,
      revisionsCompleted: 0,
      events: 0,
    };
    entry.minutes += row.minutes ?? 0;
    entry.events += 1;
    switch (row.type) {
      case "questions_solved":
        entry.questionsSolved += row.count ?? 1;
        break;
      case "questions_added":
        entry.questionsAdded += row.count ?? 1;
        break;
      case "test_taken":
        entry.testsTaken += row.count ?? 1;
        break;
      case "flashcards_reviewed":
        entry.flashcardsReviewed += row.count ?? 1;
        break;
      case "revision_completed":
        entry.revisionsCompleted += row.count ?? 1;
        break;
    }
    map[key] = entry;
  }

  return map;
}

// ── Spaced repetition ────────────────────────────────────────────────────────
// Interval ladder: [1, 3, 7, 15, 30, 60] days.
export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60];
export type RevisionGrade = "again" | "hard" | "good" | "easy";

export function nextRevisionSchedule(
  current: { intervalDays: number; repetitions: number; easeFactor: number },
  grade: RevisionGrade
): { intervalDays: number; repetitions: number; easeFactor: number } {
  const ef = current.easeFactor ?? 250;
  let idx = REVISION_INTERVALS.findIndex((i) => i >= current.intervalDays);
  if (idx < 0) idx = 0;

  switch (grade) {
    case "again":
      return { intervalDays: 1, repetitions: 0, easeFactor: Math.max(130, ef - 20) };
    case "hard":
      return {
        intervalDays: Math.max(1, Math.round(REVISION_INTERVALS[Math.min(idx + 1, REVISION_INTERVALS.length - 1)] / 2)),
        repetitions: current.repetitions + 1,
        easeFactor: Math.max(130, ef - 15),
      };
    case "easy":
      return {
        intervalDays: REVISION_INTERVALS[Math.min(idx + 2, REVISION_INTERVALS.length - 1)],
        repetitions: current.repetitions + 1,
        easeFactor: ef + 15,
      };
    case "good":
    default:
      return {
        intervalDays: REVISION_INTERVALS[Math.min(idx + 1, REVISION_INTERVALS.length - 1)],
        repetitions: current.repetitions + 1,
        easeFactor: ef,
      };
  }
}

export async function dueRevisionCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: revisionSchedulesTable.id })
    .from(revisionSchedulesTable)
    .where(and(eq(revisionSchedulesTable.userId, userId), sql`${revisionSchedulesTable.dueAt} <= now()`));
  return rows.length;
}
