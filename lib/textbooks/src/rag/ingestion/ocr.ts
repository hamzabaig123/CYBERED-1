export interface OcrResult {
  text: string;
  confidence: number;
}

export class OcrService {
  constructor(private readonly apiKey: string) {}

  /**
   * Performs OCR on an image buffer, useful for scanned PDFs.
   * Uses Gemini Vision as the fallback OCR engine.
   * @param imageBuffer The image to run OCR on.
   */
  async performOcr(imageBuffer: Buffer): Promise<OcrResult> {
    // TODO: Implement Gemini Vision API call for OCR
    return {
      text: "",
      confidence: 1.0
    };
  }
}
