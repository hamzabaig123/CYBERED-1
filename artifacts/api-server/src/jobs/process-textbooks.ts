import { eq } from "drizzle-orm";
import { db, fileAssetsTable, bookStoresTable, subjectsTable } from "@workspace/db";
import { processFileAsset } from "@workspace/textbooks";
import { createBookStore, uploadToFileSearchStore, checkIndexingStatus } from "../ai/geminiClient";
import { getStorage } from "@workspace/textbooks";

async function processPendingAssets() {
  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.processingStatus, "pending"))
    .limit(5);

  for (const asset of assets) {
    console.log(`Processing asset ${asset.id}: ${asset.originalFilename}`);
    
    try {
      const processed = await processFileAsset(asset.id, { skipScan: !process.env.CLAMAV_HOST });
      console.log(`Asset ${asset.id} processed: ${processed.processingStatus}`);
      
      if (processed.isTextbook && processed.processingStatus === "done") {
        await indexTextbookToGemini(processed.id);
      }
    } catch (error) {
      console.error(`Failed to process asset ${asset.id}:`, error);
    }
  }
}

async function indexTextbookToGemini(assetId: number) {
  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.id, assetId));

  if (!asset || !asset.fullTextKey) {
    console.log(`Asset ${assetId} has no full text, skipping indexing`);
    return;
  }

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

  if (!currentStore || currentStore.status === "ready") {
    return;
  }

  await db
    .update(bookStoresTable)
    .set({ status: "pending", textbookTitle: asset.originalFilename.replace(/\.pdf$/i, "") })
    .where(eq(bookStoresTable.id, currentStore.id));

  try {
    const storage = getStorage();
    const pdfBytes = await storage.getObject(asset.storageKey);
    
    const operationName = await uploadToFileSearchStore(
      currentStore.geminiStoreName,
      pdfBytes,
      asset.originalFilename
    );

    console.log(`Started indexing for store ${currentStore.id}, operation: ${operationName}`);
    
    pollIndexingStatus(currentStore.id, operationName);
  } catch (error) {
    console.error(`Failed to start indexing:`, error);
    await db
      .update(bookStoresTable)
      .set({ status: "error", errorMessage: error instanceof Error ? error.message : "Unknown error" })
      .where(eq(bookStoresTable.id, currentStore.id));
  }
}

async function pollIndexingStatus(storeId: number, operationName: string) {
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
            .where(eq(fileAssetsTable.subjectId, (await db.select({ subjectId: bookStoresTable.subjectId }).from(bookStoresTable).where(eq(bookStoresTable.id, storeId)))[0]?.subjectId ?? 0))
            .orderBy(desc(fileAssetsTable.id))
            .limit(1);
          
          await db
            .update(bookStoresTable)
            .set({ 
              status: "ready", 
              indexedPages: asset?.pageCount ?? 0,
            })
            .where(eq(bookStoresTable.id, storeId));
          console.log(`Indexing completed for store ${storeId}`);
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

import { desc } from "drizzle-orm";

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