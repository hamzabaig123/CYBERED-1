/**
 * RAG Indexer: Main pipeline for processing and indexing textbooks
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { chunkTextbook, type TextChunk } from "./rag-processor.js";
import { generateEmbeddingsBatch, type GeminiClient } from "./embeddings.js";
import { getStorage } from "./storage.js";

export interface IndexingProgress {
  totalChunks: number;
  processedChunks: number;
  embeddingsGenerated: number;
  status: "processing" | "completed" | "failed";
  errorMessage?: string;
}

export interface IndexingResult {
  fileAssetId: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  success: boolean;
  error?: string;
}

/**
 * Index a textbook file for RAG search
 * This is the main entry point for processing a textbook
 */
export async function indexTextbookForRAG(
  fileAssetId: number,
  subjectId: number,
  storageKey: string,
  extractedText: string,
  geminiClient: GeminiClient,
  progressCallback?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  try {
    console.log(`[RAG Indexer] Starting indexing for asset ${fileAssetId}`);
    
    // Step 1: Chunk the textbook
    console.log(`[RAG Indexer] Chunking text (${extractedText.length} chars)...`);
    const chunks = await chunkTextbook(storageKey, extractedText, {
      maxChunkSize: 2000,
      overlapSize: 200,
      splitBySections: true,
    });
    
    console.log(`[RAG Indexer] Created ${chunks.length} chunks`);
    
    if (progressCallback) {
      progressCallback({
        totalChunks: chunks.length,
        processedChunks: 0,
        embeddingsGenerated: 0,
        status: "processing",
      });
    }
    
    // Step 2: Generate embeddings for all chunks
    console.log(`[RAG Indexer] Generating embeddings...`);
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts, geminiClient);
    
    console.log(`[RAG Indexer] Generated ${embeddings.length} embeddings`);
    
    if (progressCallback) {
      progressCallback({
        totalChunks: chunks.length,
        processedChunks: 0,
        embeddingsGenerated: embeddings.length,
        status: "processing",
      });
    }
    
    // Step 3: Store chunks and embeddings in database
    console.log(`[RAG Indexer] Storing chunks in database...`);
    let storedCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      
      await db.execute(sql`
        INSERT INTO textbook_chunks (
          file_asset_id,
          subject_id,
          chunk_type,
          page_number,
          section_title,
          content,
          content_length,
          embedding_json
        ) VALUES (
          ${fileAssetId},
          ${subjectId},
          ${chunk.chunkType},
          ${chunk.pageNumber},
          ${chunk.sectionTitle || null},
          ${chunk.content},
          ${chunk.content.length},
          ${JSON.stringify(embedding)}::jsonb
        )
      `);
      
      storedCount++;
      
      if (progressCallback && storedCount % 10 === 0) {
        progressCallback({
          totalChunks: chunks.length,
          processedChunks: storedCount,
          embeddingsGenerated: embeddings.length,
          status: "processing",
        });
      }
    }
    
    console.log(`[RAG Indexer] Stored ${storedCount} chunks`);
    
    // Step 4: Update file_assets table
    await db.execute(sql`
      UPDATE file_assets
      SET 
        chunks_count = ${chunks.length},
        embeddings_generated = true,
        rag_indexed_at = NOW()
      WHERE id = ${fileAssetId}
    `);
    
    console.log(`[RAG Indexer] Updated file_assets metadata`);
    
    if (progressCallback) {
      progressCallback({
        totalChunks: chunks.length,
        processedChunks: chunks.length,
        embeddingsGenerated: embeddings.length,
        status: "completed",
      });
    }
    
    return {
      fileAssetId,
      chunksCreated: chunks.length,
      embeddingsGenerated: embeddings.length,
      success: true,
    };
    
  } catch (error) {
    console.error(`[RAG Indexer] Failed to index asset ${fileAssetId}:`, error);
    
    if (progressCallback) {
      progressCallback({
        totalChunks: 0,
        processedChunks: 0,
        embeddingsGenerated: 0,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    return {
      fileAssetId,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete all RAG chunks for a file asset
 */
export async function deleteTextbookChunks(fileAssetId: number): Promise<void> {
  await db.execute(sql`
    DELETE FROM textbook_chunks
    WHERE file_asset_id = ${fileAssetId}
  `);
  
  await db.execute(sql`
    UPDATE file_assets
    SET 
      chunks_count = 0,
      embeddings_generated = false,
      rag_indexed_at = NULL
    WHERE id = ${fileAssetId}
  `);
  
  console.log(`[RAG Indexer] Deleted chunks for asset ${fileAssetId}`);
}

/**
 * Re-index a textbook (delete old chunks and create new ones)
 */
export async function reindexTextbook(
  fileAssetId: number,
  subjectId: number,
  storageKey: string,
  extractedText: string,
  geminiClient: GeminiClient
): Promise<IndexingResult> {
  console.log(`[RAG Indexer] Re-indexing asset ${fileAssetId}...`);
  
  // Delete existing chunks
  await deleteTextbookChunks(fileAssetId);
  
  // Index again
  return await indexTextbookForRAG(fileAssetId, subjectId, storageKey, extractedText, geminiClient);
}
