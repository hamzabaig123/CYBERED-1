import { eq } from "drizzle-orm";
import { db, fileAssetsTable, bookStoresTable, subjectsTable } from "@workspace/db";
import { processFileAsset } from "@workspace/textbooks";
import { createBookStore, uploadToFileSearchStore, checkIndexingStatus } from "../ai/geminiClient";
import { getStorage } from "@workspace/textbooks";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5000;
const retryTracker = new Map<number, { retries: number; lastError: string }>();

function backoffMs(retries: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, Math.max(0, retries - 1));
}

async function markAssetError(assetId: number, error: string) {
  try {
    await db
      .update(fileAssetsTable)
      .set({
        processingStatus: "error",
        errorMessage: error.substring(0, 1000),
      })
      .where(eq(fileAssetsTable.id, assetId));
  } catch (e) {
    console.error(`Failed to mark asset ${assetId} as error:`, e);
  }
}

async function processPendingAssets() {
  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.processingStatus, "pending"))
    .limit(5);

  for (const asset of assets) {
    const tracked = retryTracker.get(asset.id) ?? { retries: 0, lastError: "" };

    if (tracked.retries >= MAX_RETRIES) {
      console.error(`Asset ${asset.id} failed ${MAX_RETRIES} times — marking as error: ${tracked.lastError}`);
      retryTracker.delete(asset.id);
      await markAssetError(asset.id, `Permanently failed after ${MAX_RETRIES} attempts: ${tracked.lastError}`);
      continue;
    }

    if (tracked.retries > 0) {
      const waitMs = backoffMs(tracked.retries);
      console.log(`Asset ${asset.id}: retry ${tracked.retries}/${MAX_RETRIES} — backing off ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    console.log(`Processing asset ${asset.id} (attempt ${tracked.retries + 1}/${MAX_RETRIES}): ${asset.originalFilename}`);

    try {
      const processed = await processFileAsset(asset.id, { skipScan: !process.env.CLAMAV_HOST });
      console.log(`Asset ${asset.id} processed: ${processed.processingStatus}`);

      // Index any textbook that reached "done" — Gemini reads the PDF directly,
      // no fullTextKey required (scanned PDFs won't have one)
      if (processed.isTextbook && processed.processingStatus === "done") {
        await indexTextbookToGemini(processed.id);
      }

      retryTracker.delete(asset.id);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      tracked.retries += 1;
      tracked.lastError = errMsg;
      retryTracker.set(asset.id, tracked);
      console.error(`Failed to process asset ${asset.id} (attempt ${tracked.retries}/${MAX_RETRIES}):`, errMsg);

      if (tracked.retries >= MAX_RETRIES) {
        console.error(`Asset ${asset.id} exhausted retries — marking as error`);
        retryTracker.delete(asset.id);
        await markAssetError(asset.id, `Failed after ${MAX_RETRIES} attempts: ${errMsg}`);
      }
    }
  }
}

async function indexTextbookToGemini(assetId: number) {
  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.id, assetId));

  if (!asset) {
    console.log(`Asset ${assetId} not found, skipping indexing`);
    return;
  }

  // No fullTextKey check — Gemini File Search reads the PDF directly,
  // doesn't need local text extraction to have succeeded
  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, asset.subjectId));

  if (!store) {
    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, asset.subjectId));

    if (!subject) {
      console.log(`Subject ${asset.subjectId} not found, skipping indexing`);
      return;
    }

    try {
      const geminiStoreName = await createBookStore(subject.name);
      await db
        .insert(bookStoresTable)
        .values({
          subjectId: asset.subjectId,
          geminiStoreName,
          textbookTitle: asset.originalFilename.replace(/\.pdf$/i, ""),
          status: "pending",
        });
      console.log(`Created book store for subject ${asset.subjectId}: ${geminiStoreName}`);
    } catch (error) {
      console.error(`Failed to create book store:`, error);
      return;
    }
  }

  const [currentStore] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, asset.subjectId));

  if (
    !currentStore ||
    (currentStore.status === "ready" && (currentStore.indexedPages ?? 0) > 0)
  ) {
    return;
  }

  await db
    .update(bookStoresTable)
    .set({ status: "pending", textbookTitle: asset.originalFilename.replace(/\.pdf$/i, "") })
    .where(eq(bookStoresTable.id, currentStore.id));

  try {
    const storage = getStorage();
    const pdfBytes = await storage.getObject(asset.storageKey);

    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error(`Stored PDF is empty (${pdfBytes ? "0 bytes" : "null"}): ${asset.storageKey}`);
    }

    const header = pdfBytes.subarray(0, Math.min(5, pdfBytes.length));
    const pdfMagic = [0x25, 0x50, 0x44, 0x46]; // "%PDF"
    const looksLikePdf =
      header.length >= 4 &&
      header[0] === pdfMagic[0] &&
      header[1] === pdfMagic[1] &&
      header[2] === pdfMagic[2] &&
      header[3] === pdfMagic[3];

    if (!looksLikePdf) {
      throw new Error(
        `Stored object is not a valid PDF (magic bytes mismatch, got ${
          Array.from(header).map(b => "0x" + b.toString(16).padStart(2, "0")).join(" ")
        }): ${asset.storageKey}`
      );
    }

    const operationName = await uploadToFileSearchStore(
      currentStore.geminiStoreName,
      pdfBytes,
      asset.originalFilename
    );

    console.log(`Started indexing for store ${currentStore.id}, operation: ${operationName}`);

    // Fire-and-forget indexing status polling (non-blocking)
    pollIndexingStatus(currentStore.id, operationName, asset.id).catch(err => {
      console.error(`Background indexing poll failed for store ${currentStore.id}:`, err);
    });
  } catch (error) {
    console.error(`Failed to start indexing:`, error);
    await db
      .update(bookStoresTable)
      .set({ status: "error", errorMessage: error instanceof Error ? error.message : "Unknown error" })
      .where(eq(bookStoresTable.id, currentStore.id));
  }
}

async function pollIndexingStatus(storeId: number, operationName: string, assetId: number) {
  const maxAttempts = 30;
  const intervalMs = 10000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    try {
      const status = await checkIndexingStatus(operationName);

      if (status.done) {
        if (status.error) {
          await db
            .update(bookStoresTable)
            .set({ status: "error", errorMessage: status.error })
            .where(eq(bookStoresTable.id, storeId));
          console.log(`Indexing failed for store ${storeId}: ${status.error}`);
        } else {
          const [asset] = await db
            .select()
            .from(fileAssetsTable)
            .where(eq(fileAssetsTable.id, assetId))
            .limit(1);

          await db
            .update(bookStoresTable)
            .set({
              status: "ready",
              indexedPages: asset?.pageCount ?? 0,
            })
            .where(eq(bookStoresTable.id, storeId));
          console.log(`Indexing completed for store ${storeId} (asset ${assetId})`);
        }
        return;
      }
    } catch (error) {
      console.error(`Error checking indexing status:`, error);
    }
  }

  console.log(`Indexing timed out for store ${storeId}`);
  await db
    .update(bookStoresTable)
    .set({ status: "error", errorMessage: "Indexing timed out" })
    .where(eq(bookStoresTable.id, storeId));
}

async function main() {
  console.log("Starting textbook processing job...");

  while (true) {
    try {
      await processPendingAssets();
    } catch (error) {
      console.error("Error in processing loop:", error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

main().catch(console.error);