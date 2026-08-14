import { sql, type SQL } from "drizzle-orm";
import { ragChunksTable } from "@workspace/db/schema";

export interface SearchFilters {
  subjectId?: number;
  classId?: number;
  fileAssetId?: number;
  topicId?: number;
  chapterId?: number;
}

export function buildFilters(filters: SearchFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.subjectId !== undefined) {
    conditions.push(sql`${ragChunksTable.subjectId} = ${filters.subjectId}`);
  }

  if (filters.classId !== undefined) {
    conditions.push(sql`${ragChunksTable.classId} = ${filters.classId}`);
  }

  if (filters.fileAssetId !== undefined) {
    conditions.push(sql`${ragChunksTable.fileAssetId} = ${filters.fileAssetId}`);
  }

  if (filters.topicId !== undefined) {
    conditions.push(sql`${ragChunksTable.topicId} = ${filters.topicId}`);
  }

  if (filters.chapterId !== undefined) {
    conditions.push(sql`${ragChunksTable.chapterId} = ${filters.chapterId}`);
  }

  if (conditions.length === 0) return undefined;

  let result: SQL = conditions[0]!;
  for (let i = 1; i < conditions.length; i++) {
    result = sql`${result} AND ${conditions[i]}`;
  }

  return result;
}
