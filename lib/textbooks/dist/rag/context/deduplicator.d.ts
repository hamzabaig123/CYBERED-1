import { RetrievedChunk } from './context-builder';
export declare class Deduplicator {
    constructor();
    deduplicate(chunks: RetrievedChunk[], queryEmbedding?: number[], lambda?: number): Promise<RetrievedChunk[]>;
}
//# sourceMappingURL=deduplicator.d.ts.map