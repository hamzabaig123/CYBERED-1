import { RetrievedChunk } from './context-builder';

export interface Citation {
  id: string;
  source: string;
  snippet: string;
  citationIndex: number;
}

export class CitationBuilder {
  constructor() {}

  public buildCitations(chunks: RetrievedChunk[]): Citation[] {
    return chunks.map((chunk, index) => ({
      id: chunk.id,
      source: chunk.source,
      snippet: chunk.text.substring(0, 100) + '...',
      citationIndex: index + 1
    }));
  }

  public formatCitationList(citations: Citation[]): string {
    return citations.map(c => `[${c.citationIndex}] ${c.source}`).join('\n');
  }
}
