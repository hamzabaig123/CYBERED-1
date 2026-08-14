export declare const RAG_CONFIG: {
    embedding: {
        model: string;
        dimensions: number;
        batchSize: number;
        maxRetries: number;
        retryDelayMs: number;
    };
    search: {
        defaultTopK: number;
        vectorTopK: number;
        ftsTopK: number;
        rrfK: number;
        minConfidence: number;
    };
    chunking: {
        maxChunkSize: number;
        overlapSize: number;
        minChunkSize: number;
    };
};
//# sourceMappingURL=config.d.ts.map