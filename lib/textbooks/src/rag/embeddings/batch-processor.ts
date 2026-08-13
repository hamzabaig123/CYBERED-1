import { EmbeddingService } from "./embedding-service";
import { withRetry } from "./retry";

export interface BatchProcessorOptions {
  batchSize?: number;
  delayMs?: number;
}

export class BatchProcessor {
  private service: EmbeddingService;
  private batchSize: number;
  private delayMs: number;

  constructor(service: EmbeddingService, options?: BatchProcessorOptions) {
    this.service = service;
    this.batchSize = options?.batchSize || 100;
    this.delayMs = options?.delayMs || 1000;
  }

  async processBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const promises = batch.map((text) =>
        withRetry(() => this.service.generateEmbedding(text))
      );
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      if (i + this.batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
    }
    return results;
  }
}
