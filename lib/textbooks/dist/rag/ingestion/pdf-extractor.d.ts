export interface ExtractedPage {
    pageNumber: number;
    text: string;
    hasImages: boolean;
    rawContent?: any;
}
export interface ExtractionResult {
    metadata: {
        title?: string;
        author?: string;
        pageCount: number;
    };
    pages: ExtractedPage[];
}
export declare class PdfExtractor {
    private readonly config;
    constructor(config?: any);
    /**
     * Extracts text and metadata from a PDF file.
     * @param filePathOrBuffer Path to the PDF file or Buffer
     * @returns ExtractionResult containing metadata and page contents
     */
    extract(filePathOrBuffer: string | Buffer): Promise<ExtractionResult>;
}
//# sourceMappingURL=pdf-extractor.d.ts.map