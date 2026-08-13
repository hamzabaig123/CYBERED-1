import { Chunk } from "./semantic-chunker";

export class ChunkExpander {
  /**
   * Expands the chunk context by prepending/appending surrounding text.
   * Useful for better LLM comprehension during retrieval.
   */
  expandContext(chunk: Chunk, surroundingText: { before?: string; after?: string }): Chunk {
    const before = surroundingText.before ? `${surroundingText.before}\n` : "";
    const after = surroundingText.after ? `\n${surroundingText.after}` : "";
    
    const expandedText = `${before}${chunk.text}${after}`;
    
    return {
      ...chunk,
      text: expandedText,
      charCount: expandedText.length
    };
  }
}
