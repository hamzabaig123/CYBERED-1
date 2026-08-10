import { type FileAssetRow } from "@workspace/db";
export type { FileAssetRow };
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
export declare function processFileAsset(assetId: number, opts?: ProcessFileAssetOptions): Promise<FileAssetRow>;
//# sourceMappingURL=pipeline.d.ts.map