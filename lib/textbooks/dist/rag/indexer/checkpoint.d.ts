export declare enum IndexingState {
    PENDING = "PENDING",
    CHUNKING = "CHUNKING",
    EMBEDDING = "EMBEDDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export interface IndexingJob {
    jobId: string;
    documentId: string;
    state: IndexingState;
    progress: number;
}
export declare function saveCheckpoint(job: IndexingJob): Promise<void>;
export declare function loadCheckpoint(jobId: string): Promise<IndexingJob | null>;
//# sourceMappingURL=checkpoint.d.ts.map