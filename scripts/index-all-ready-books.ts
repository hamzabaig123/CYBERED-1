import { eq } from "drizzle-orm";
import { db, fileAssetsTable, bookStoresTable } from "@workspace/db";
import { uploadToFileSearchStore, checkIndexingStatus } from "../artifacts/api-server/src/ai/geminiClient.js";
import { getStorage } from "@workspace/textbooks";

async function indexReadyBooks() {
  // Find all "done" textbook assets
  const doneAssets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.processingStatus, "done"));

  const textbookAssets = doneAssets.filter(a => a.isTextbook);

  if (textbookAssets.length === 0) {
    console.log("No processed textbook assets found");
    return;
  }

  console.log(`Found ${textbookAssets.length} processed textbook(s) to index\n`);

  for (const asset of textbookAssets) {
    console.log(`\n📚 Processing: ${asset.originalFilename}`);
    console.log(`   Subject ID: ${asset.subjectId}, Asset ID: ${asset.id}`);

    // Find or get the book store for this subject
    const [store] = await db
      .select()
      .from(bookStoresTable)
      .where(eq(bookStoresTable.subjectId, asset.subjectId));

    if (!store) {
      console.log(`   ❌ No book store found for subject ${asset.subjectId}`);
      continue;
    }

    console.log(`   📖 Store: ${store.geminiStoreName} (status: ${store.status})`);

    // Check if already indexed (indexedPages > 0)
    if (store.status === "ready" && store.indexedPages && store.indexedPages > 0) {
      console.log(`   ✅ Already indexed (${store.indexedPages} pages)`);
      continue;
    }

    // Set to pending
    await db
      .update(bookStoresTable)
      .set({ status: "pending", errorMessage: null })
      .where(eq(bookStoresTable.id, store.id));

    try {
      const storage = getStorage();
      const pdfBytes = await storage.getObject(asset.storageKey);
      
      console.log(`   📤 Uploading to Gemini (${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)...`);
      
      const operationName = await uploadToFileSearchStore(
        store.geminiStoreName,
        pdfBytes,
        asset.originalFilename
      );

      console.log(`   ⏳ Upload started: ${operationName}`);
      console.log(`   ⏳ Waiting for indexing (this may take 5-15 minutes)...`);

      // Poll for completion
      let attempt = 0;
      const maxAttempts = 90; // 15 minutes with 10s intervals
      
      while (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempt++;
        
        const status = await checkIndexingStatus(operationName);
        
        if (status.done) {
          if (status.error) {
            console.log(`   ❌ Indexing failed: ${status.error}`);
            await db
              .update(bookStoresTable)
              .set({ status: "error", errorMessage: status.error })
              .where(eq(bookStoresTable.id, store.id));
          } else {
            console.log(`   ✅ Indexing completed!`);
            await db
              .update(bookStoresTable)
              .set({ 
                status: "ready", 
                indexedPages: asset.pageCount ?? 0,
                textbookTitle: asset.originalFilename.replace(/\.pdf$/i, "")
              })
              .where(eq(bookStoresTable.id, store.id));
          }
          break;
        }
        
        if (attempt % 6 === 0) {
          console.log(`   ⏳ Still indexing... (${attempt * 10}s elapsed)`);
        }
      }
      
      if (attempt >= maxAttempts) {
        console.log(`   ⚠️  Indexing timed out`);
        await db
          .update(bookStoresTable)
          .set({ status: "error", errorMessage: "Indexing timed out" })
          .where(eq(bookStoresTable.id, store.id));
      }
      
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
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
  console.log("🔄 Indexing all processed textbooks to Gemini File Search...\n");
  console.log("=" .repeat(60));
  await indexReadyBooks();
  console.log("\n" + "=".repeat(60));
  console.log("✅ Done!");
}

main().catch(console.error);
