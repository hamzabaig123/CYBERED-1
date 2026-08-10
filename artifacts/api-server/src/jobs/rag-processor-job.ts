// @ts-nocheck — Frozen: DIY pgvector pipeline worker, replaced by Gemini File Search in process-textbooks
/**
 * Background job for RAG processing of textbooks
 * Runs continuously and processes pending textbooks
 */

import { eq } from "drizzle-orm";
import { db, fileAssetsTable } from "@workspace/db";
import { indexTextbookForRAG } from "@workspace/textbooks";
import { getGeminiClient } from "../ai/geminiClient";

async function processPendingTextbooks() {
  // Find textbooks that are done processing but not yet RAG-indexed
  const pendingAssets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.processingStatus, "done"))
    .limit(5);

  const textbooks = pendingAssets.filter(
    asset => asset.isTextbook && !asset.embeddingsGenerated
  );

  if (textbooks.length === 0) {
    return;
  }

  console.log(`[RAG Job] Found ${textbooks.length} textbooks to process`);

  for (const asset of textbooks) {
    console.log(`\n[RAG Job] Processing: ${asset.originalFilename} (ID: ${asset.id})`);

    try {
      // Get the extracted text
      if (!asset.textPreview) {
        console.log(`[RAG Job] No text preview available, skipping`);
        continue;
      }

      // Build full text from storage if available
      let fullText = asset.textPreview;

      if (asset.fullTextKey) {
        try {
          const { getStorage } = await import("@workspace/textbooks");
          const storage = getStorage();
          const textBuffer = await storage.getObject(asset.fullTextKey);
          fullText = textBuffer.toString("utf-8");
          console.log(`[RAG Job] Loaded full text: ${fullText.length} chars`);
        } catch (error) {
          console.error(`[RAG Job] Failed to load full text, using preview:`, error);
        }
      }

      // Index for RAG
      const geminiClient = getGeminiClient();
      const result = await indexTextbookForRAG(
        asset.id,
        asset.subjectId,
        asset.storageKey,
        fullText,
        geminiClient,
        (progress) => {
          if (progress.status === "processing" && progress.processedChunks % 20 === 0) {
            console.log(
              `[RAG Job] Progress: ${progress.processedChunks}/${progress.totalChunks} chunks, ` +
              `${progress.embeddingsGenerated} embeddings`
            );
          }
        }
      );

      if (result.success) {
        console.log(
          `[RAG Job] ✅ Successfully indexed: ${result.chunksCreated} chunks, ` +
          `${result.embeddingsGenerated} embeddings`
        );
      } else {
        console.error(`[RAG Job] ❌ Failed to index: ${result.error}`);
      }
    } catch (error) {
      console.error(`[RAG Job] Error processing asset ${asset.id}:`, error);

      // Mark as failed to avoid retrying indefinitely
      await db
        .update(fileAssetsTable)
        .set({
          errorMessage: `RAG indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
        .where(eq(fileAssetsTable.id, asset.id));
    }
  }
}

async function main() {
  console.log("[RAG Job] Starting RAG background processor...");
  console.log("[RAG Job] This will process textbooks and generate embeddings");

  while (true) {
    try {
      await processPendingTextbooks();
    } catch (error) {
      console.error("[RAG Job] Error in processing loop:", error);
    }

    // Wait 10 seconds before next iteration
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

main().catch(error => {
  console.error("[RAG Job] Fatal error:", error);
  process.exit(1);
});
