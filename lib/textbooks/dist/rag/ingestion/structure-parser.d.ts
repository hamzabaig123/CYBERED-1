import { ExtractedPage } from "./pdf-extractor";
export interface DocumentSection {
    id: string;
    title: string;
    level: number;
    startPage: number;
    endPage?: number;
    content: string;
    subSections: DocumentSection[];
}
export interface ParsedDocument {
    title: string;
    toc: DocumentSection[];
    sections: DocumentSection[];
}
export declare class StructureParser {
    /**
     * Parses raw extracted pages into structured chapters and sections.
     */
    parseStructure(pages: ExtractedPage[]): ParsedDocument;
}
//# sourceMappingURL=structure-parser.d.ts.map