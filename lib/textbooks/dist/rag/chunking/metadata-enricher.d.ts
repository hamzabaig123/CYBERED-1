import { Chunk } from "./semantic-chunker";
export interface ChunkMetadata {
    subject?: string;
    classLevel?: string;
    chapter?: string;
    section?: string;
    sourceDocument: string;
}
export interface EnrichedChunk extends Chunk {
    metadata: ChunkMetadata;
}
export interface EnrichParams {
    chunkIndex: number;
    fileName: string;
    subjectId: number;
    chapterId?: number;
    topicId?: number;
    classId?: number;
    totalChunks: number;
    rawText: string;
}
export declare class MetadataEnricher {
    /**
     * Enriches a single chunk with textbook-specific metadata for better
     * filtering and retrieval.
     */
    enrich(chunk: Chunk, params: EnrichParams): Chunk & {
        pageNumber?: number;
        sectionTitle?: string;
    };
    /** Try to infer page number from the text context. */
    private extractPageNumber;
    /** Try to infer section/chapter title from the chunk content. */
    private extractSectionTitle;
}
//# sourceMappingURL=metadata-enricher.d.ts.map