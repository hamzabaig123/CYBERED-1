export declare enum QueryIntent {
    FACTUAL = "factual",
    CONCEPTUAL = "conceptual",
    COMPARATIVE = "comparative",
    PROCEDURAL = "procedural",
    UNKNOWN = "unknown"
}
export interface ClassificationResult {
    intent: QueryIntent;
    confidence: number;
}
export declare class QueryClassifier {
    constructor();
    classify(query: string): Promise<ClassificationResult>;
}
//# sourceMappingURL=classifier.d.ts.map