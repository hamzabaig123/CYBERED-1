import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { chunks } from "@workspace/db/schema";
import { cosineDistance } from "drizzle-orm/pg-core";

export interface VectorSearchResult {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export async function vectorSearch(
  embedding: number[],
  limit: number = 10,
  filterSql?: any
): Promise<VectorSearchResult[]> {
  let query = db
    .select({
      id: chunks.id,
      documentId: chunks.documentId,
      content: chunks.content,
      similarity: sql<number>`1 - (${cosineDistance(chunks.embedding, embedding)})`,
      metadata: chunks.metadata,
    })
    .from(chunks)
    .orderBy(sql`${cosineDistance(chunks.embedding, embedding)} ASC`)
    .limit(limit);
    
  if (filterSql) {
    query = query.where(filterSql);
  }

  const results = await query;
  return results.map((r) => ({
    ...r,
    similarity: Number(r.similarity),
  }));
}
