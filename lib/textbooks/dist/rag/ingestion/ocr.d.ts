export interface OcrResult {
    text: string;
    confidence: number;
}
export declare class OcrService {
    private readonly apiKey;
    constructor(apiKey: string);
    /**
     * Performs OCR on an image buffer, useful for scanned PDFs.
     * Uses Gemini Vision as the fallback OCR engine.
     * @param imageBuffer The image to run OCR on.
     */
    performOcr(imageBuffer: Buffer): Promise<OcrResult>;
}
//# sourceMappingURL=ocr.d.ts.map