import { eq } from "drizzle-orm";
import { db, fileAssetsTable, bookStoresTable, subjectsTable } from "@workspace/db";
import { processFileAsset } from "@workspace/textbooks";
import { createBookStore, uploadToFileSearchStore, checkIndexingStatus, normalizeGeminiError } from "../ai/geminiClient";
import { getStorage } from "@workspace/textbooks";
import { splitPdfIntoPageAlignedParts, cleanupTmp, type PdfPartInfo } from "../pdf/splitPdfIntoParts";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5000;

// Gemini File Search per-document limit is exactly 100 MiB = 104,857,600 bytes.
// Use an 85 MiB soft target so pdf-lib structural overhead + HTTP framing
// overhead cannot drift us over the hard ceiling.  NEVER raise MAX above 100MiB.
const GEMINI_MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
const GEMINI_TARGET_PART_BYTES = 85 * 1024 * 1024;

// Per-part poll limits. For N parts we allow (N * perPartAttempts) with a shared
// overall ceiling so 3 parts × 30 attempts × 10s = 15 minutes of poll time.
const POLL_PART_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 10_000;
const POLL_TOTAL_ATTEMPTS_CEILING = 90;

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

interface PartIndexHandle {
  part: PdfPartInfo;
  operationName: string;
  displayName: string;
}

async function indexOversizedPdfAsParts(opts: {
  assetId: number;
  assetOriginalFilename: string;
  pdfBytes: Uint8Array;
  storeId: number;
  geminiStoreName: string;
}) {
  const { assetId, assetOriginalFilename, pdfBytes, storeId, geminiStoreName } = opts;
  const baseName = assetOriginalFilename.replace(/\.pdf$/i, "");

  console.log(
    `Asset ${assetId}: PDF is ${pdfBytes.length} bytes (${(pdfBytes.length / 1024 / 1024).toFixed(1)} MiB) > ` +
    `${GEMINI_MAX_DOCUMENT_BYTES / 1024 / 1024} MiB limit — splitting into page-aligned parts (target ${GEMINI_TARGET_PART_BYTES / 1024 / 1024} MiB).`
  );

  const parts = await splitPdfIntoPageAlignedParts(pdfBytes, {
    targetBytes: GEMINI_TARGET_PART_BYTES,
    maxBytes: GEMINI_MAX_DOCUMENT_BYTES,
    displayName: assetOriginalFilename,
  });

  console.log(`Asset ${assetId}: split complete — ${parts.length} part(s) produced`);
  for (const p of parts) {
    const sizeMiB = (p.sizeBytes / 1024 / 1024).toFixed(1);
    console.log(
      `  Part ${p.partNumber}/${parts.length}: pages ${p.firstPage}–${p.lastPage} (${p.lastPage - p.firstPage + 1} pages), ` +
      `${sizeMiB} MiB — ${p.sizeBytes > GEMINI_MAX_DOCUMENT_BYTES ? "⚠️ OVER HARD LIMIT" : "✅ within limit"}`
    );
  }

  const overLimit = parts.find(p => p.sizeBytes > GEMINI_MAX_DOCUMENT_BYTES);
  if (overLimit) {
    cleanupTmp(parts.map(p => p.tmpPath));
    throw new Error(
      `Split produced a part (${overLimit.partNumber}/${parts.length}, pages ${overLimit.firstPage}–${overLimit.lastPage}) ` +
      `of ${overLimit.sizeBytes} bytes (> ${GEMINI_MAX_DOCUMENT_BYTES} hard limit). ` +
      `This usually means a single scanned image page already exceeds the limit. Recompress the PDF and re-upload.`
    );
  }

  // Upload all parts sequentially (low concurrency = safer for large payloads
  // and keeps Gemini API rate-friendly). Each upload returns an LRO name.
  const handles: PartIndexHandle[] = [];
  try {
    for (const part of parts) {
      const displayName = `${baseName} — pages ${part.firstPage}-${part.lastPage}.pdf`;
      console.log(
        `  Uploading part ${part.partNumber}/${parts.length} to store '${geminiStoreName}' as '${displayName}'...`
      );
      const operationName = await uploadToFileSearchStore(
        geminiStoreName,
        part.bytes,
        displayName
      );
      handles.push({ part, operationName, displayName });
      console.log(
        `  Part ${part.partNumber}/${parts.length} accepted — LRO=${operationName}`
      );
    }
  } catch (uploadErr) {
    cleanupTmp(parts.map(p => p.tmpPath));
    throw uploadErr;
  }

  // Free part buffers (they're persisted to tmp already, but we also keep the
  // Uint8Array reference). We don't need the bytes anymore after upload.
  cleanupTmp(parts.map(p => p.tmpPath));

  // Aggregate poll — store is `ready` only when ALL parts reach a terminal state.
  pollMultiPartIndexingStatus({
    storeId,
    assetId,
    handles,
    totalSourcePages: parts[parts.length - 1]?.lastPage ?? 0,
  }).catch(err => {
    console.error(`Background multi-part indexing poll failed for store ${storeId}:`, err);
  });
}

interface MultiPartPollCtx {
  storeId: number;
  assetId: number;
  handles: PartIndexHandle[];
  totalSourcePages: number;
}

async function pollMultiPartIndexingStatus(ctx: MultiPartPollCtx) {
  const { storeId, assetId, handles, totalSourcePages } = ctx;

  const partStates = handles.map(h => ({
    ...h,
    attempts: 0,
    done: false,
    error: null as string | null,
  }));

  const overallCeiling = Math.min(
    POLL_TOTAL_ATTEMPTS_CEILING,
    Math.max(POLL_PART_ATTEMPTS, handles.length * POLL_PART_ATTEMPTS)
  );

  let totalAttempts = 0;

  while (totalAttempts < overallCeiling) {
    totalAttempts += 1;
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    let anyRunning = false;
    let anyError = false;

    for (const ps of partStates) {
      if (ps.done) continue;
      ps.attempts += 1;
      anyRunning = true;

      try {
        const status = await checkIndexingStatus(ps.operationName);
        if (status.done) {
          ps.done = true;
          if (status.error) {
            ps.error = status.error;
            anyError = true;
            console.error(
              `Store ${storeId} part ${ps.part.partNumber}/${handles.length} failed: ${status.error}`
            );
          } else {
            console.log(
              `Store ${storeId} part ${ps.part.partNumber}/${handles.length} ` +
              `(${ps.part.firstPage}–${ps.part.lastPage}) ready`
            );
          }
        }
      } catch (pollErr) {
        // Per-attempt poll failures are non-fatal — keep trying until attempts run out.
        console.error(
          `Store ${storeId} poll error on part ${ps.part.partNumber} (attempt ${ps.attempts}):`,
          pollErr instanceof Error ? pollErr.message : String(pollErr)
        );
      }
    }

    if (!anyRunning) {
      // Terminal. Evaluate the aggregate rule exactly as specified.
      const aggregateFailed = partStates.some(p => p.error !== null);
      const aggregateDone = partStates.every(p => p.done && !p.error);

      if (aggregateFailed) {
        const firstErr = partStates.find(p => p.error)?.error ?? "Unknown part error";
        const failedList = partStates
          .filter(p => p.error)
          .map(p => `part ${p.part.partNumber}(p${p.part.firstPage}-p${p.part.lastPage})`)
          .join(", ");
        await db
          .update(bookStoresTable)
          .set({
            status: "error",
            errorMessage: `Multi-part indexing failed: ${firstErr}. Failed parts: ${failedList}`,
          })
          .where(eq(bookStoresTable.id, storeId));
        console.error(`Store ${storeId} → error (parts failed: ${failedList})`);
        return;
      }

      if (aggregateDone) {
        // indexedPages = sum of successful page ranges = full book pages, capped
        // at actual source page count (should match unless a page range bug).
        const pagesSum = partStates.reduce((sum, p) => sum + (p.part.lastPage - p.part.firstPage + 1), 0);
        const indexedPages = Math.min(pagesSum, totalSourcePages || pagesSum);
        await db
          .update(bookStoresTable)
          .set({
            status: "ready",
            indexedPages,
            errorMessage: null,
          })
          .where(eq(bookStoresTable.id, storeId));
        console.log(
          `Store ${storeId} → ready. ${handles.length} part(s), ${indexedPages} pages. ` +
          `Query a late page to confirm page-range citations map correctly.`
        );
        return;
      }
    }
  }

  // Timed out overall.
  const pendingParts = partStates
    .filter(p => !p.done)
    .map(p => `part ${p.part.partNumber}(p${p.part.firstPage}-p${p.part.lastPage},${p.attempts} polls)`)
    .join(", ");
  console.error(`Indexing timed out for store ${storeId} — still pending: ${pendingParts}`);
  await db
    .update(bookStoresTable)
    .set({
      status: "error",
      errorMessage: `Multi-part indexing timed out. Pending parts: ${pendingParts}`,
    })
    .where(eq(bookStoresTable.id, storeId));
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
      const normErr = normalizeGeminiError(error, "createBookStore");
      const errMsg = `Gemini Error [${normErr.status || 'N/A'}]: ${normErr.message}`;
      console.error(`Failed to create book store:`, errMsg);
      throw new Error(`Failed to create book store: ${errMsg}`);
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
        `Stored object is not a valid PDF (magic bytes mismatch, got ${Array.from(header).map(b => "0x" + b.toString(16).padStart(2, "0")).join(" ")
        }): ${asset.storageKey}`
      );
    }

    // === Size preflight: split oversized PDFs BEFORE touching Gemini ===
    if (pdfBytes.length > GEMINI_MAX_DOCUMENT_BYTES) {
      await indexOversizedPdfAsParts({
        assetId,
        assetOriginalFilename: asset.originalFilename,
        pdfBytes,
        storeId: currentStore.id,
        geminiStoreName: currentStore.geminiStoreName,
      });
      return;
    }

    // === Regular path — single document under the limit ===
    const operationName = await uploadToFileSearchStore(
      currentStore.geminiStoreName,
      pdfBytes,
      asset.originalFilename
    );

    console.log(`Started indexing for store ${currentStore.id}, operation: ${operationName}`);

    // Fire-and-forget indexing status polling (non-blocking)
    pollSinglePartIndexingStatus(currentStore.id, operationName, asset.id).catch(err => {
      console.error(`Background indexing poll failed for store ${currentStore.id}:`, err);
    });
  } catch (error) {
    const normErr = normalizeGeminiError(error, "indexTextbookToGemini");
    const errMsg = `Gemini Error [${normErr.status || 'N/A'}]: ${normErr.message}`;
    console.error(`Failed to start indexing:`, errMsg);
    await db
      .update(bookStoresTable)
      .set({ status: "error", errorMessage: errMsg })
      .where(eq(bookStoresTable.id, currentStore.id));
    throw new Error(`Failed to start indexing: ${errMsg}`);
  }
}

// Preserved for the single-part (under size limit) path — keeps the original,
// well-tested poll logic. Renamed from pollIndexingStatus for clarity.
async function pollSinglePartIndexingStatus(storeId: number, operationName: string, assetId: number) {
  const maxAttempts = POLL_PART_ATTEMPTS;
  const intervalMs = POLL_INTERVAL_MS;

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
