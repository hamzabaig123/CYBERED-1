export interface RetrievedChunk {
    id: string;
    text: string;
    source: string;
    metadata?: Record<string, any>;
    score?: number;
}
export declare class ContextBuilder {
    constructor();
    build(chunks: RetrievedChunk[]): string;
}
//# sourceMappingURL=context-builder.d.ts.map