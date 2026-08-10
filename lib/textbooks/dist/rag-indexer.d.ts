/**
 * RAG Indexer: Main pipeline for processing and indexing textbooks
 */
import { type GeminiClient } from "./embeddings.js";
export interface IndexingProgress {
    totalChunks: number;
    processedChunks: number;
    embeddingsGenerated: number;
    status: "processing" | "completed" | "failed";
    errorMessage?: string;
}
export interface IndexingResult {
    fileAssetId: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    success: boolean;
    error?: string;
}
/**
 * Index a textbook file for RAG search
 * This is the main entry point for processing a textbook
 */
export declare function indexTextbookForRAG(fileAssetId: number, subjectId: number, storageKey: string, extractedText: string, geminiClient: GeminiClient, progressCallback?: (progress: IndexingProgress) => void): Promise<IndexingResult>;
/**
 * Delete all RAG chunks for a file asset
 */
export declare function deleteTextbookChunks(fileAssetId: number): Promise<void>;
/**
 * Re-index a textbook (delete old chunks and create new ones)
 */
export declare function reindexTextbook(fileAssetId: number, subjectId: number, storageKey: string, extractedText: string, geminiClient: GeminiClient): Promise<IndexingResult>;
//# sourceMappingURL=rag-indexer.d.ts.map