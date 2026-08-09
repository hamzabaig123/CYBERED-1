import { eq } from "drizzle-orm";
import { db, fileAssetsTable, bookStoresTable } from "@workspace/db";
import { uploadToFileSearchStore, checkIndexingStatus } from "../artifacts/api-server/src/ai/geminiClient.js";
import { getStorage } from "@workspace/textbooks";

async function retryPendingStores() {
  const pendingStores = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.status, "pending"));

  if (pendingStores.length === 0) {
    console.log("No pending stores to process");
    return;
  }

  for (const store of pendingStores) {
    console.log(`\n📚 Processing store ${store.id}: ${store.textbookTitle}`);
    
    // Find the most recent textbook asset for this subject
    const [asset] = await db
      .select()
      .from(fileAssetsTable)
      .where(eq(fileAssetsTable.subjectId, store.subjectId))
      .orderBy(fileAssetsTable.id)
      .limit(1);

    if (!asset) {
      console.log(`  ❌ No asset found for subject ${store.subjectId}`);
      continue;
    }

    console.log(`  📄 Found asset: ${asset.originalFilename} (${asset.id})`);

    try {
      const storage = getStorage();
      const pdfBytes = await storage.getObject(asset.storageKey);
      
      console.log(`  📤 Uploading to Gemini File Search (${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)...`);
      
      const operationName = await uploadToFileSearchStore(
        store.geminiStoreName,
        pdfBytes,
        asset.originalFilename
      );

      console.log(`  ✅ Upload started, operation: ${operationName}`);
      console.log(`  ⏳ Waiting for indexing to complete (this may take 5-15 minutes)...`);

      // Poll for completion
      let attempt = 0;
      const maxAttempts = 90; // 15 minutes with 10s intervals
      
      while (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
        attempt++;
        
        const status = await checkIndexingStatus(operationName);
        
        if (status.done) {
          if (status.error) {
            console.log(`  ❌ Indexing failed: ${status.error}`);
            await db
              .update(bookStoresTable)
              .set({ status: "error", errorMessage: status.error })
              .where(eq(bookStoresTable.id, store.id));
          } else {
            console.log(`  ✅ Indexing completed successfully!`);
            await db
              .update(bookStoresTable)
              .set({ 
                status: "ready", 
                indexedPages: asset.pageCount ?? 0,
              })
              .where(eq(bookStoresTable.id, store.id));
          }
          break;
        }
        
        if (attempt % 6 === 0) { // Every minute
          console.log(`  ⏳ Still indexing... (${attempt * 10}s elapsed)`);
        }
      }
      
      if (attempt >= maxAttempts) {
        console.log(`  ⚠️  Indexing timed out after ${maxAttempts * 10}s`);
        await db
          .update(bookStoresTable)
          .set({ status: "error", errorMessage: "Indexing timed out" })
          .where(eq(bookStoresTable.id, store.id));
      }
      
    } catch (error) {
      console.error(`  ❌ Failed:`, error);
      await db
        .update(bookStoresTable)
        .set({ 
          status: "error", 
          errorMessage: error instanceof Error ? error.message : "Unknown error" 
        })
        .where(eq(bookStoresTable.id, store.id));
    }
  }
}

async function main() {
  console.log("🔄 Retrying failed/pending Gemini indexing operations...\n");
  await retryPendingStores();
  console.log("\n✅ Done!");
}

main().catch(console.error);
