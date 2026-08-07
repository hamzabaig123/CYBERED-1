export interface PageChunk {
    page: number;
    text: string;
}
/** Split page-tagged full text (as produced by extractPdfText) into per-page chunks. */
export declare function parsePages(fullText: string): PageChunk[];
export declare function tokenize(text: string): string[];
export declare function keywordTerms(question: string): string[];
export declare function countOccurrences(text: string, term: string): number;
export interface RelevantChunk {
    pages: number[];
    text: string;
    scores: Array<{
        page: number;
        score: number;
    }>;
}
export interface FindRelevantOptions {
    /** Pages before/after the best-matching page to include as context. */
    window?: number;
    /** Hard cap on the excerpt length passed to the LLM. */
    maxChars?: number;
}
/**
 * Naive keyword search over page-tagged textbook text. Scores each page by how
 * many question terms appear in it (weighted by frequency), picks the best page
 * and returns it plus a window of surrounding pages. Good enough to start;
 * upgrade to embeddings/pgvector only if this proves insufficient.
 */
export declare function findRelevantPages(fullText: string, question: string, opts?: FindRelevantOptions): RelevantChunk;
//# sourceMappingURL=search.d.ts.map