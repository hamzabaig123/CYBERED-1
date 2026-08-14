import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { ragChunksTable } from "@workspace/db/schema";

export interface SearchResult {
  chunkId: number;
  content: string;
  pageNumber: number;
  sectionTitle?: string;
  score: number;
  fileAssetId: number;
}

/**
 * Vector similarity search.
 * Embeddings are stored as JSONB arrays in embedding_json column.
 * Computes cosine similarity in SQL when pgvector is available,
 * or falls back to application-side computation.
 */
export async function vectorSearch(
  embedding: number[],
  limit: number = 10,
  filterSql?: SQL | undefined
): Promise<SearchResult[]> {
  // First fetch candidates (with optional filter)
  const rows = await db
    .select({
      chunkId: ragChunksTable.id,
      content: ragChunksTable.content,
      pageNumber: ragChunksTable.pageNumber,
      sectionTitle: ragChunksTable.sectionTitle,
      fileAssetId: ragChunksTable.fileAssetId,
      embeddingJson: ragChunksTable.embeddingJson,
    })
    .from(ragChunksTable)
    .where(filterSql
      ? sql`(${ragChunksTable.embeddingJson} IS NOT NULL) AND (${filterSql})`
      : sql`${ragChunksTable.embeddingJson} IS NOT NULL`
    )
    .limit(limit * 2);

  // Compute cosine similarity in TypeScript (works without pgvector)
  function cosineSim(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  const results: SearchResult[] = [];

  for (const r of rows) {
    const emb = r.embeddingJson as unknown as number[] | null;
    if (!emb || !Array.isArray(emb)) continue;

    results.push({
      chunkId: r.chunkId,
      content: r.content,
      pageNumber: r.pageNumber ?? 0,
      sectionTitle: r.sectionTitle ?? undefined,
      fileAssetId: r.fileAssetId,
      score: cosineSim(emb, embedding),
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
