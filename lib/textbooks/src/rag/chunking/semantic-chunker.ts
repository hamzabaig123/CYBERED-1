export interface Chunk {
  id: string;
  text: string;
  charCount: number;
  tokenCount?: number;
  pageNumber?: number;
}

export interface ChunkerOptions {
  maxTokenSize?: number;
  overlapTokens?: number;
  minTokenSize?: number;
}

/**
 * Simple sentence-aware chunker. Splits text on sentence boundaries
 * (., !, ? followed by whitespace/newline) and groups sentences into
 * chunks up to maxTokenSize tokens (approximated by charCount / 4).
 */
export class SemanticChunker {
  private maxChunkSize: number;
  private overlapSize: number;
  private minChunkSize: number;

  constructor(options: ChunkerOptions = {}) {
    const maxTokens = options.maxTokenSize ?? 512;
    const overlap = options.overlapTokens ?? 50;
    const minTokens = options.minTokenSize ?? 50;

    // Approximate: 1 token ≈ 4 characters
    this.maxChunkSize = maxTokens * 4;
    this.overlapSize = overlap * 4;
    this.minChunkSize = minTokens * 4;
  }

  /** Split text into sentences using a simple heuristic. */
  private splitSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by whitespace or newline
    const sentenceRegex = /(?<=[.!?])\s+|(?<=\n)\s*/g;
    const sentences = text.split(sentenceRegex).filter((s) => s.trim().length > 0);
    return sentences.length > 0 ? sentences : [text];
  }

  /**
   * Chunk text respecting sentence boundaries.
   * Each chunk is between minChunkSize and maxChunkSize characters.
   * Consecutive chunks overlap by overlapSize characters for continuity.
   */
  chunkText(text: string): Chunk[] {
    if (text.length <= this.maxChunkSize) {
      // Single chunk
      return [
        {
          id: "chunk-0",
          text: text,
          charCount: text.length,
        },
      ];
    }

    const sentences = this.splitSentences(text);
    const chunks: Chunk[] = [];
    let chunkIndex = 0;
    let currentSentences: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > this.maxChunkSize && currentSentences.length > 0) {
        // Flush current chunk
        const chunkText = currentSentences.join(" ").trim();
        chunks.push({
          id: `chunk-${chunkIndex}`,
          text: chunkText,
          charCount: chunkText.length,
        });
        chunkIndex++;

        // Start new chunk with overlap
        currentSentences = [];
        currentLength = 0;

        // Add overlap sentences from the end of the previous chunk
        const overlapText = chunkText.slice(-this.overlapSize);
        const overlapSentences = this.splitSentences(overlapText);
        for (const os of overlapSentences) {
          currentSentences.push(os);
          currentLength += os.length;
        }
      }

      currentSentences.push(sentence);
      currentLength += sentenceLength;
    }

    // Flush last chunk
    if (currentSentences.length > 0) {
      const chunkText = currentSentences.join(" ").trim();
      if (chunkText.length >= this.minChunkSize) {
        chunks.push({
          id: `chunk-${chunkIndex}`,
          text: chunkText,
          charCount: chunkText.length,
        });
      }
    }

    return chunks.length > 0 ? chunks : [{ id: "chunk-0", text: text, charCount: text.length }];
  }
}
