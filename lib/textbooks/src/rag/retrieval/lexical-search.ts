import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { ragChunksTable } from "@workspace/db/schema";
import { SearchResult } from "./vector-search";

export async function lexicalSearch(
  queryText: string,
  limit: number = 10,
  filterSql?: SQL | undefined
): Promise<SearchResult[]> {
  const tsQuery = queryText.replace(/['"]/g, " ");

  let whereClause: SQL;

  if (filterSql) {
    whereClause = sql`to_tsvector('english', ${ragChunksTable.content}) @@ plainto_tsquery('english', ${tsQuery}) AND ${filterSql}`;
  } else {
    whereClause = sql`to_tsvector('english', ${ragChunksTable.content}) @@ plainto_tsquery('english', ${tsQuery})`;
  }

  const results = await db
    .select({
      chunkId: ragChunksTable.id,
      content: ragChunksTable.content,
      pageNumber: ragChunksTable.pageNumber,
      sectionTitle: ragChunksTable.sectionTitle,
      fileAssetId: ragChunksTable.fileAssetId,
      rank: sql<number>`ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${tsQuery}))`,
    })
    .from(ragChunksTable)
    .where(whereClause)
    .orderBy(sql`ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${tsQuery})) DESC`)
    .limit(limit);

  return results.map((r) => ({
    chunkId: r.chunkId,
    content: r.content,
    pageNumber: r.pageNumber ?? 0,
    sectionTitle: r.sectionTitle ?? undefined,
    fileAssetId: r.fileAssetId,
    score: Number(r.rank),
  }));
}
