export interface ExtractedPage {
    pageNumber: number;
    text: string;
}
export interface ExtractResult {
    pageCount: number;
    pages: ExtractedPage[];
    fullText: string;
}
/**
 * Extract the full text of a PDF, tagged per page so answers can cite pages.
 * Throws on corrupted/fake PDFs (malformed header or no parseable pages).
 */
export declare function extractPdfText(pdfBytes: Buffer): Promise<ExtractResult>;
//# sourceMappingURL=extract.d.ts.map