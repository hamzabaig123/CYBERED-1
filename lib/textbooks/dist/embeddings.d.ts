/**
 * Embeddings generation using Gemini API
 * Note: getGeminiClient is passed as a parameter to avoid circular dependencies
 */
export interface EmbeddingResult {
    embedding: number[];
    text: string;
}
export interface GeminiClient {
    models: {
        embedContent: (params: {
            model: string;
            content: string;
        }) => Promise<unknown>;
        batchEmbedContents?: (params: {
            model: string;
            requests: Array<{
                content: string;
            }>;
        }) => Promise<unknown>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
/**
 * Generate embeddings for a single text chunk using Gemini
 */
export declare function generateEmbedding(text: string, geminiClient: GeminiClient): Promise<number[]>;
/**
 * Generate embeddings for multiple text chunks
 * Note: Batch API not available in current SDK, so we call individually
 */
export declare function generateEmbeddingsBatch(texts: string[], geminiClient: GeminiClient): Promise<number[][]>;
/**
 * Calculate cosine similarity between query embedding and document embeddings
 * Returns scores in range [0, 1] where 1 is most similar
 */
export declare function calculateSimilarity(queryEmbedding: number[], docEmbedding: number[]): number;
/**
 * Find top-k most similar chunks using cosine similarity
 */
export declare function findTopKSimilar(queryEmbedding: number[], chunks: Array<{
    embedding: number[];
    content: string;
    pageNumber: number;
    id: number;
}>, k?: number): Array<{
    id: number;
    content: string;
    pageNumber: number;
    score: number;
}>;
//# sourceMappingURL=embeddings.d.ts.map