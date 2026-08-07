import "./lib/env.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq, desc } from "drizzle-orm";
import { db, fileAssetsTable, subjectsTable, type FileAssetRow } from "@workspace/db";
import { getStorage } from "@workspace/textbooks";
import { processFileAsset } from "@workspace/textbooks/pipeline";

function usage(): void {
  console.log(`
Usage:
  pnpm ingest:book <pdf-path> <subject-id> [--no-scan]
  pnpm ingest:list

Ingests one class-nine textbook PDF: copies it into file storage, creates a
FileAsset row, then runs the virus-scan + full-text-extraction pipeline.

Options:
  --no-scan   Skip the ClamAV scan step (marks virus_scan_status 'skipped')
`);
}

function printResult(asset: FileAssetRow): void {
  console.log(`  virus_scan_status:    ${asset.virusScanStatus}`);
  console.log(`  processing_status:    ${asset.processingStatus}`);
  if (asset.pageCount != null) console.log(`  page_count:           ${asset.pageCount}`);
  if (asset.fullTextKey) console.log(`  full_text_key:        ${asset.fullTextKey}`);
  if (asset.textPreview) {
    const preview = asset.textPreview.replace(/\n/g, " ").slice(0, 120);
    console.log(`  text_preview:         ${preview}...`);
  }
  if (asset.errorMessage) console.log(`  error:                ${asset.errorMessage}`);
}

async function listAssets(): Promise<void> {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .orderBy(subjectsTable.id);

  for (const subject of subjects) {
    const assets = await db
      .select()
      .from(fileAssetsTable)
      .where(eq(fileAssetsTable.subjectId, subject.id))
      .orderBy(desc(fileAssetsTable.id));

    console.log(`Subject #${subject.id} — ${subject.name}`);
    if (assets.length === 0) {
      console.log("  (no textbooks yet)");
      continue;
    }
    for (const a of assets) {
      console.log(
        `  #${a.id} ${a.originalFilename} | ${a.processingStatus}/${a.virusScanStatus} | pages=${a.pageCount ?? "-"} | ${a.storageKey}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  if (args[0] === "list" || args[0] === "--list") {
    await listAssets();
    return;
  }

  const pdfPath = args[0];
  const subjectId = Number(args[1]);
  const skipScan = args.includes("--no-scan");

  if (!pdfPath || !Number.isInteger(subjectId) || subjectId <= 0) {
    usage();
    process.exit(1);
  }

  let stat;
  try {
    stat = await fs.stat(pdfPath);
  } catch {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
  }
  if (!stat.isFile()) {
    console.error(`Not a regular file: ${pdfPath}`);
    process.exit(1);
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, subjectId));
  if (!subject) {
    console.error(`Subject #${subjectId} does not exist — run "pnpm ingest:list" to see available subjects.`);
    process.exit(1);
  }

  const filename = path.basename(pdfPath);
  const storageKey = `textbooks/${subjectId}/${filename}`;
  const body = await fs.readFile(pdfPath);

  const storage = getStorage();
  await storage.putObject(storageKey, body, "application/pdf");

  const [asset] = await db
    .insert(fileAssetsTable)
    .values({
      subjectId,
      isTextbook: true,
      storageKey,
      originalFilename: filename,
      sizeBytes: body.length,
      mimeType: "application/pdf",
    })
    .returning();

  console.log(`Ingested ${filename} -> FileAsset #${asset.id} (${storageKey})`);

  const result = await processFileAsset(asset.id, { skipScan });
  printResult(result);

  if (result.processingStatus === "error") {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Ingestion failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
