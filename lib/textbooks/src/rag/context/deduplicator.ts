import { RetrievedChunk } from './context-builder';

export class Deduplicator {
  constructor() {}

  public async deduplicate(chunks: RetrievedChunk[], queryEmbedding?: number[], lambda = 0.5): Promise<RetrievedChunk[]> {
    const seenTexts = new Set<string>();
    const uniqueChunks: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      if (!seenTexts.has(chunk.text)) {
        seenTexts.add(chunk.text);
        uniqueChunks.push(chunk);
      }
    }

    return uniqueChunks;
  }
}
