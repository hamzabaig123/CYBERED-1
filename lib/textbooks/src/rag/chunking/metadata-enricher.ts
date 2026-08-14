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

export interface EnrichParams {
  chunkIndex: number;
  fileName: string;
  subjectId: number;
  chapterId?: number;
  topicId?: number;
  classId?: number;
  totalChunks: number;
  rawText: string;
}

export class MetadataEnricher {
  /**
   * Enriches a single chunk with textbook-specific metadata for better
   * filtering and retrieval.
   */
  enrich(chunk: Chunk, params: EnrichParams): Chunk & { pageNumber?: number; sectionTitle?: string } {
    return {
      ...chunk,
      pageNumber: this.extractPageNumber(params.rawText, chunk.text),
      sectionTitle: this.extractSectionTitle(params.fileName, chunk.text),
    };
  }

  /** Try to infer page number from the text context. */
  private extractPageNumber(rawText: string, chunkText: string): number | undefined {
    // Look for page patterns like "Page 12" or "p. 5"
    const pageMatch = chunkText.match(/(?:Page|p\.?|pg\.?)\s*(\d+)/i);
    if (pageMatch) return parseInt(pageMatch[1], 10);
    return undefined;
  }

  /** Try to infer section/chapter title from the chunk content. */
  private extractSectionTitle(fileName: string, chunkText: string): string | undefined {
    // Look for heading-like lines (all caps, or starts with "Chapter", "Section", etc.)
    const headingMatch = chunkText.match(/^(Chapter|Section|Topic|Unit)\s+[^:]*:/i);
    if (headingMatch) return headingMatch[0].trim();

    // Try the filename as a fallback
    const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/Book.*?_\d+/, "").trim();
    if (baseName.length > 0 && baseName.length < 50) return baseName;
    return undefined;
  }
}
