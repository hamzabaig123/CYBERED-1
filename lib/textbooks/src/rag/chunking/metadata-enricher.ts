import { Chunk } from "./semantic-chunker";

export interface ChunkMetadata {
  subject?: string;
  classLevel?: string;
  chapter?: string;
  section?: string;
  sourceDocument: string;
}

export interface EnrichedChunk extends Chunk {
  metadata: ChunkMetadata;
}

export class MetadataEnricher {
  /**
   * Enriches chunks with textbook-specific metadata for better filtering and retrieval.
   */
  enrich(chunks: Chunk[], baseMetadata: Partial<ChunkMetadata>): EnrichedChunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        sourceDocument: baseMetadata.sourceDocument || "unknown",
        subject: baseMetadata.subject,
        classLevel: baseMetadata.classLevel,
        chapter: baseMetadata.chapter,
        section: baseMetadata.section
      }
    }));
  }
}
