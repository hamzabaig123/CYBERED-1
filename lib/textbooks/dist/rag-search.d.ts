/**
 * RAG Search: Hybrid search combining embeddings and full-text search
 */
import { type GeminiClient } from "./embeddings.js";
export interface SearchResult {
    chunkId: number;
    content: string;
    pageNumber: number;
    sectionTitle?: string;
    score: number;
    fileAssetId: number;
    filename: string;
}
export interface SearchOptions {
    topK?: number;
    minScore?: number;
    hybridWeight?: number;
    subjectId?: number;
    fileAssetId?: number;
}
/**
 * Hybrid search combining embedding similarity and full-text search
 */
export declare function searchTextbookChunks(query: string, geminiClient: GeminiClient, options?: SearchOptions): Promise<SearchResult[]>;
/**
 * Get all chunks for a specific page (for citation/context)
 */
export declare function getChunksForPage(fileAssetId: number, pageNumber: number): Promise<SearchResult[]>;
//# sourceMappingURL=rag-search.d.ts.map