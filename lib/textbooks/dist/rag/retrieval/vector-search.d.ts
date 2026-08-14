import { type SQL } from "drizzle-orm";
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
export declare function vectorSearch(embedding: number[], limit?: number, filterSql?: SQL | undefined): Promise<SearchResult[]>;
//# sourceMappingURL=vector-search.d.ts.map