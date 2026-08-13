import { Chunk } from "./semantic-chunker";

export interface HierarchicalChunk extends Chunk {
  parentId?: string;
  childrenIds: string[];
  level: number;
}

export class HierarchyBuilder {
  /**
   * Builds a tree of chunks based on document section levels.
   */
  buildHierarchy(chunks: Chunk[], sectionLevel: number): HierarchicalChunk[] {
    // TODO: Implement hierarchical structure building for chunks
    return chunks.map((c, idx) => ({
      ...c,
      parentId: idx > 0 ? chunks[0].id : undefined,
      childrenIds: [],
      level: sectionLevel
    }));
  }
}
