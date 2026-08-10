import { eq } from "drizzle-orm";
import { db, fileAssetsTable, type FileAssetRow } from "@workspace/db";
import { getStorage } from "./storage.js";
import { scanBuffer } from "./virusScan.js";
import { extractPdfText } from "./extract.js";

export type { FileAssetRow };

function storageKeyForText(storageKey: string): string {
  return `${storageKey}.text.txt`;
}

export interface ProcessFileAssetOptions {
  /** Force-skip the virus scan (marks the row virus_scan_status "skipped"). */
  skipScan?: boolean;
}

/**
 * Run the full ingestion pipeline for one FileAsset row:
 *   1. read the PDF from storage
 *   2. virus scan (ClamAV; skipped when CLAMAV_HOST is unset or skipScan)
 *   3. extract page-tagged full text and store it next to the PDF
 *   4. update the asset row (page_count, full_text_key, text_preview, statuses)
 *
 * Text extraction failure is non-fatal: scanned/image-only PDFs will not have
 * a local text layer, but Gemini File Search reads PDFs directly.
 */
export async function processFileAsset(
  assetId: number,
  opts: ProcessFileAssetOptions = {},
): Promise<FileAssetRow> {
  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.id, assetId));

  if (!asset) {
    throw new Error(`FileAsset ${assetId} not found`);
  }

  await db
    .update(fileAssetsTable)
    .set({ processingStatus: "processing", errorMessage: null })
    .where(eq(fileAssetsTable.id, assetId));

  const storage = getStorage();

  const fail = async (virusScanStatus: FileAssetRow["virusScanStatus"], message: string): Promise<FileAssetRow> => {
    const [updated] = await db
      .update(fileAssetsTable)
      .set({
        virusScanStatus,
        processingStatus: "error",
        errorMessage: message,
      })
      .where(eq(fileAssetsTable.id, assetId))
      .returning();
    return updated;
  };

  let pdfBytes: Buffer;
  try {
    pdfBytes = await storage.getObject(asset.storageKey);
  } catch (err) {
    return fail("pending", `Could not read file from storage: ${messageOf(err)}`);
  }

  // Phase 3 — virus scan
  const scan = opts.skipScan
    ? { status: "skipped" as const, message: "skipped via --no-scan" }
    : await scanBuffer(pdfBytes);
  if (scan.status === "infected") {
    try {
      await storage.deleteObject(asset.storageKey);
    } catch {
      // Best effort; the row below is what matters.
    }
    return fail("infected", `Virus detected: ${scan.signature ?? "unknown"}`);
  }
  if (scan.status === "error") {
    return fail("error", `Virus scan failed: ${scan.message ?? "unknown error"}`);
  }

  // Phase 4 — full text extraction (best-effort, not a gate for Gemini indexing)
  try {
    const extracted = await extractPdfText(pdfBytes);
    const textKey = storageKeyForText(asset.storageKey);
    await storage.putObject(textKey, Buffer.from(extracted.fullText, "utf8"), "text/plain");

    const [updated] = await db
      .update(fileAssetsTable)
      .set({
        virusScanStatus: scan.status,
        processingStatus: "done",
        pageCount: extracted.pageCount,
        fullTextKey: textKey,
        textPreview: extracted.fullText.slice(0, 2000),
        errorMessage: null,
      })
      .where(eq(fileAssetsTable.id, assetId))
      .returning();

    return updated;
  } catch (err) {
    // Local text layer missing/corrupt (typical for scanned PDFs) — still let it
    // through to Gemini File Search, which reads the PDF directly.
    console.warn(`[pipeline] Local text extraction failed for asset ${assetId}, continuing without preview:`, err);

    const [updated] = await db
      .update(fileAssetsTable)
      .set({
        virusScanStatus: scan.status,
        processingStatus: "done",
        fullTextKey: null,
        textPreview: null,
        errorMessage: null,
      })
      .where(eq(fileAssetsTable.id, assetId))
      .returning();

    return updated;
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}