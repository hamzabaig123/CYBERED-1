import { Chunk } from "./semantic-chunker";
export declare class ChunkExpander {
    /**
     * Expands the chunk context by prepending/appending surrounding text.
     * Useful for better LLM comprehension during retrieval.
     */
    expandContext(chunk: Chunk, surroundingText: {
        before?: string;
        after?: string;
    }): Chunk;
}
//# sourceMappingURL=chunk-expander.d.ts.map