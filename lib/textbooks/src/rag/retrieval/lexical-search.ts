import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { chunks } from "@workspace/db/schema";

export interface LexicalSearchResult {
  id: string;
  documentId: string;
  content: string;
  rank: number;
  metadata: Record<string, any>;
}

export async function lexicalSearch(
  queryText: string,
  limit: number = 10,
  filterSql?: any
): Promise<LexicalSearchResult[]> {
  const tsQuery = sql`plainto_tsquery('english', ${queryText})`;
  
  let query = db
    .select({
      id: chunks.id,
      documentId: chunks.documentId,
      content: chunks.content,
      rank: sql<number>`ts_rank(to_tsvector('english', ${chunks.content}), ${tsQuery})`,
      metadata: chunks.metadata,
    })
    .from(chunks)
    .where(sql`to_tsvector('english', ${chunks.content}) @@ ${tsQuery}`)
    .orderBy(sql`ts_rank(to_tsvector('english', ${chunks.content}), ${tsQuery}) DESC`)
    .limit(limit);

  if (filterSql) {
    query = query.where(filterSql);
  }

  const results = await query;
  return results.map((r) => ({
    ...r,
    rank: Number(r.rank),
  }));
}
