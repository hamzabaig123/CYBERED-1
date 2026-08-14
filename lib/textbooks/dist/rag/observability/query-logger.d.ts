export interface QueryLogEntry {
    queryId: string;
    timestamp: Date;
    userId: string;
    queryText: string;
    mode: string;
    latencyMs: number;
    tokensUsed: number;
    successful: boolean;
}
export declare class QueryLogger {
    logQuery(entry: QueryLogEntry): Promise<void>;
    getMetrics(timeRangeMs: number): Promise<{
        avgLatency: number;
        errorRate: number;
    }>;
}
//# sourceMappingURL=query-logger.d.ts.map