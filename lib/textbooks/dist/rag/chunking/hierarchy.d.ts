import { Chunk } from "./semantic-chunker";
export interface HierarchicalChunk extends Chunk {
    parentId?: string;
    childrenIds: string[];
    level: number;
}
export declare class HierarchyBuilder {
    /**
     * Builds a tree of chunks based on document section levels.
     */
    buildHierarchy(chunks: Chunk[], sectionLevel: number): HierarchicalChunk[];
}
//# sourceMappingURL=hierarchy.d.ts.map