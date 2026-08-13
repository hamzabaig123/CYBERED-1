export interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  metadata?: Record<string, any>;
  score?: number;
}

export class ContextBuilder {
  constructor() {}

  public build(chunks: RetrievedChunk[]): string {
    let contextString = "Context:\n\n";
    chunks.forEach((chunk, index) => {
      contextString += `[Citation ${index + 1}] Source: ${chunk.source}\n${chunk.text}\n\n`;
    });
    return contextString.trim();
  }
}
