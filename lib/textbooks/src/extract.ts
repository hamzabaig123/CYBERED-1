import type { getDocument as GetDocument } from "pdfjs-dist";

type PdfjsModule = { getDocument: typeof GetDocument };

let pdfjs: PdfjsModule | null = null;

// pdfjs-dist ships its type declarations on the package root, but only the
// "legacy" build runs in Node. Load that build lazily and borrow the root
// package's types for it.
async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjs) {
    pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfjsModule;
  }
  return pdfjs;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractResult {
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
}

function pageTextItems(items: unknown[]): string {
  return items
    .map((item) => (typeof item === "object" && item !== null && "str" in item ? String((item as { str: unknown }).str) : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the full text of a PDF, tagged per page so answers can cite pages.
 * Throws on corrupted/fake PDFs (malformed header or no parseable pages).
 */
export async function extractPdfText(pdfBytes: Buffer): Promise<ExtractResult> {
  const { getDocument } = await loadPdfjs();
  const doc = await getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  try {
    const pages: ExtractedPage[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push({ pageNumber: i, text: pageTextItems(content.items) });
      page.cleanup();
    }

    const fullText = pages
      .filter((p) => p.text.length > 0)
      .map((p) => `[page ${p.pageNumber}] ${p.text}`)
      .join("\n\n");

    return { pageCount: doc.numPages, pages, fullText };
  } finally {
    await doc.destroy();
  }
}
