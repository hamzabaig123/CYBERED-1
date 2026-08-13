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

export class QueryLogger {
    public async logQuery(entry: QueryLogEntry): Promise<void> {
        // Implement database logging here
        console.log(`[QUERY LOG] ${entry.timestamp.toISOString()} | Mode: ${entry.mode} | Latency: ${entry.latencyMs}ms | Success: ${entry.successful}`);
        
        // Example: await db.insert(schema.queryLogs).values(entry);
    }
    
    public async getMetrics(timeRangeMs: number): Promise<{ avgLatency: number, errorRate: number }> {
        // Implement metric calculation
        return { avgLatency: 0, errorRate: 0 };
    }
}
