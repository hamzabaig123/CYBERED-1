import { EmbeddingService } from "./embedding-service";
export interface BatchProcessorOptions {
    batchSize?: number;
    delayMs?: number;
}
export declare class BatchProcessor {
    private service;
    private batchSize;
    private delayMs;
    constructor(service: EmbeddingService, options?: BatchProcessorOptions);
    processBatch(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=batch-processor.d.ts.map