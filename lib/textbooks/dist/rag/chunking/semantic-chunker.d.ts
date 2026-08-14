export interface Chunk {
    id: string;
    text: string;
    charCount: number;
    tokenCount?: number;
    pageNumber?: number;
}
export interface ChunkerOptions {
    maxTokenSize?: number;
    overlapTokens?: number;
    minTokenSize?: number;
}
/**
 * Simple sentence-aware chunker. Splits text on sentence boundaries
 * (., !, ? followed by whitespace/newline) and groups sentences into
 * chunks up to maxTokenSize tokens (approximated by charCount / 4).
 */
export declare class SemanticChunker {
    private maxChunkSize;
    private overlapSize;
    private minChunkSize;
    constructor(options?: ChunkerOptions);
    /** Split text into sentences using a simple heuristic. */
    private splitSentences;
    /**
     * Chunk text respecting sentence boundaries.
     * Each chunk is between minChunkSize and maxChunkSize characters.
     * Consecutive chunks overlap by overlapSize characters for continuity.
     */
    chunkText(text: string): Chunk[];
}
//# sourceMappingURL=semantic-chunker.d.ts.map