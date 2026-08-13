import { writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { PDFDocument } from "../../vendor/pdf-lib.esm.js";

export interface PdfPartInfo {
  partNumber: number;
  firstPage: number;
  lastPage: number;
  sizeBytes: number;
  bytes: Uint8Array;
  tmpPath?: string;
}

function cleanupTmp(paths: (string | undefined)[]): void {
  for (const p of paths) {
    if (!p) continue;
    rm(p, { force: true }).catch(() => { });
  }
}

export interface SplitOptions {
  targetBytes: number;
  maxBytes: number;
  displayName: string;
}

export async function splitPdfIntoPageAlignedParts(
  pdfBytes: Uint8Array,
  opts: SplitOptions
): Promise<PdfPartInfo[]> {
  if (opts.maxBytes <= 0 || opts.targetBytes <= 0) {
    throw new Error(`Invalid split thresholds: target=${opts.targetBytes}, max=${opts.maxBytes}`);
  }
  if (opts.targetBytes > opts.maxBytes) {
    throw new Error(`targetBytes (${opts.targetBytes}) may not exceed maxBytes (${opts.maxBytes})`);
  }
  if (!pdfBytes || pdfBytes.length === 0) {
    throw new Error("splitPdfIntoPageAlignedParts: empty input PDF");
  }

  const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = src.getPageCount();
  if (pageCount <= 0) {
    throw new Error("PDF has no pages");
  }

  if (pageCount === 1) {
    return [{
      partNumber: 1,
      firstPage: 1,
      lastPage: 1,
      sizeBytes: pdfBytes.length,
      bytes: pdfBytes,
    }];
  }

  const avgPerPage = Math.max(1, Math.floor(pdfBytes.length / pageCount));
  let seedPages = Math.max(1, Math.floor(opts.targetBytes / avgPerPage));
  seedPages = Math.min(seedPages, 500);

  const parts: PdfPartInfo[] = [];
  const tmpPaths: string[] = [];
  let cursorPage = 0;

  let safetyCounter = 0;
  while (cursorPage < pageCount) {
    safetyCounter++;
    if (safetyCounter > pageCount * 4) {
      cleanupTmp(tmpPaths);
      throw new Error(
        `PDF split safety limit exceeded (pageCount=${pageCount}, cursor=${cursorPage}, parts=${parts.length})`
      );
    }

    const start = cursorPage;
    let end = Math.min(pageCount, start + seedPages);

    let attempt = 0;
    let part: {
      rangePages: number;
      firstPage1: number;
      lastPage1: number;
      sizeBytes: number;
      bytes: Uint8Array;
      tmpPath?: string;
    } | null = null;

    while (end > start) {
      attempt++;
      const indices: number[] = [];
      for (let i = start; i < end; i++) indices.push(i);

      const subDoc = await PDFDocument.create();
      const copied = await subDoc.copyPages(src, indices);
      for (const p of copied) subDoc.addPage(p);
      const outBytes = await subDoc.save({ useObjectStreams: true });
      const size = outBytes.byteLength;

      if (size <= opts.targetBytes) {
        part = {
          rangePages: end - start,
          firstPage1: start + 1,
          lastPage1: end,
          sizeBytes: size,
          bytes: outBytes,
        };
        break;
      }

      if (size <= opts.maxBytes) {
        part = {
          rangePages: end - start,
          firstPage1: start + 1,
          lastPage1: end,
          sizeBytes: size,
          bytes: outBytes,
        };
        break;
      }

      const prevCount = end - start;
      const shrink = attempt === 1
        ? Math.max(1, Math.floor(prevCount * 0.25))
        : Math.max(1, Math.ceil(prevCount * 0.1));
      end = Math.max(start + 1, end - shrink);
    }

    if (!part) {
      cleanupTmp(tmpPaths);
      throw new Error(
        `Cannot split PDF below maxBytes=${opts.maxBytes}: ` +
        `page ${start + 1} (1-based) alone serialises to > max bytes. ` +
        `Try recompressing the scanned PDF before uploading.`
      );
    }

    const tmpFile = join(
      tmpdir(),
      `cybered-split-${basename(opts.displayName || "part").replace(/[^\w.-]+/g, "_")}-${Date.now()}-${randomBytes(4).toString("hex")}.pdf`
    );
    await writeFile(tmpFile, Buffer.from(part.bytes));
    tmpPaths.push(tmpFile);

    parts.push({
      partNumber: parts.length + 1,
      firstPage: part.firstPage1,
      lastPage: part.lastPage1,
      sizeBytes: part.sizeBytes,
      bytes: part.bytes,
      tmpPath: tmpFile,
    });

    cursorPage = start + part.rangePages;

    if (part.rangePages > 0) {
      seedPages = Math.max(1, part.rangePages);
    }
  }

  return parts;
}

export { cleanupTmp };
