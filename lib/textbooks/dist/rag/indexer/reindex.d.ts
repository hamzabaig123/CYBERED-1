export interface DocumentDiff {
    addedChunks: string[];
    removedChunkIds: string[];
    modifiedChunks: Array<{
        id: string;
        content: string;
    }>;
}
export declare class Reindexer {
    processReindex(documentId: string, diff: DocumentDiff): Promise<void>;
    private deleteChunks;
    private updateChunk;
    private addChunks;
}
//# sourceMappingURL=reindex.d.ts.map