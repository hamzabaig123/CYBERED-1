import { type EmbeddingClient } from "../embeddings/embedding-service";
export type { IndexingState, IndexingJob } from "./checkpoint";
export { saveCheckpoint, loadCheckpoint } from "./checkpoint";
interface IndexDocumentParams {
    fileAssetId: number;
    subjectId: number;
    classId?: number;
    chapterId?: number;
    topicId?: number;
    rawText: string;
    fileName: string;
    geminiClient: EmbeddingClient;
}
/**
 * Complete indexing pipeline:
 * 1. Chunk text → 2. Enrich metadata → 3. Generate embeddings → 4. Store in rag_chunks
 */
export declare class DocumentIndexer {
    private chunker;
    private metadataEnricher;
    constructor();
    /**
     * Index a document: chunk → enrich → embed → store
     */
    indexDocument(params: IndexDocumentParams): Promise<number>;
    private storeChunk;
}
//# sourceMappingURL=index-document.d.ts.map