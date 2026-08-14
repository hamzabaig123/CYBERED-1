export interface Metrics {
    recallAt5: number;
    recallAt10: number;
    recallAt20: number;
    mrr: number;
    precisionAt5: number;
    citationAccuracy: number;
    groundedness: number;
}
export declare function calculateRecall(retrieved: number[], expected: number[]): number;
export declare function calculateMRR(retrieved: number[], expected: number[]): number;
//# sourceMappingURL=metrics.d.ts.map