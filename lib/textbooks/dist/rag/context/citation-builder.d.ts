import { RetrievedChunk } from './context-builder';
export interface Citation {
    id: string;
    source: string;
    snippet: string;
    citationIndex: number;
}
export declare class CitationBuilder {
    constructor();
    buildCitations(chunks: RetrievedChunk[]): Citation[];
    formatCitationList(citations: Citation[]): string;
}
//# sourceMappingURL=citation-builder.d.ts.map