/**
 * RAG Processor: Handles chunking, embedding, and indexing of textbooks
 * for Retrieval-Augmented Generation (RAG) search.
 */
export interface TextChunk {
    content: string;
    pageNumber: number;
    chunkType: "page" | "section" | "paragraph";
    sectionTitle?: string;
}
export interface ChunkingOptions {
    maxChunkSize?: number;
    overlapSize?: number;
    splitBySections?: boolean;
}
/**
 * Extract text from a PDF file. For scanned PDFs, this will be minimal.
 * The actual OCR will be done by Gemini Vision API separately.
 *
 * Note: This function is a placeholder. Actual text extraction is done
 * by the existing pipeline in pipeline.ts
 */
export declare function extractPDFText(storageKey: string): Promise<string>;
/**
 * Main function: Chunk a textbook into searchable pieces
 */
export declare function chunkTextbook(storageKey: string, extractedText: string, options?: ChunkingOptions): Promise<TextChunk[]>;
/**
 * Calculate cosine similarity between two embedding vectors
 * (used when we have embeddings to compare)
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Simple BM25 scoring for text relevance (used as fallback when no embeddings)
 */
export declare function calculateBM25Score(query: string, document: string, avgDocLength?: number, k1?: number, b?: number): number;
//# sourceMappingURL=rag-processor.d.ts.map