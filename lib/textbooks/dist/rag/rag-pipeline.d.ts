export interface RagResult {
    answer: string;
    citations: Array<{
        chunkId: number;
        content: string;
        pageNumber?: number;
        sectionTitle?: string;
        score: number;
        fileAssetId: number;
    }>;
    contextUsed: string;
}
interface RunRagParams {
    query: string;
    embedding?: number[];
    subjectId?: number;
    fileAssetId?: number;
    limit?: number;
    geminiClient?: any;
}
/**
 * Full RAG 2.0 pipeline:
 * 1. Query embedding → 2. Hybrid search (vector + lexical) →
 * 3. RRF → 4. Rerank → 5. Build context → 6. Generate answer with citations
 */
export declare function runRagPipeline(params: RunRagParams): Promise<RagResult>;
export {};
//# sourceMappingURL=rag-pipeline.d.ts.map