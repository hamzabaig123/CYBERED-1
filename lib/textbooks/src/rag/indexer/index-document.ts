import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { ragChunksTable, type InsertRagChunk } from "@workspace/db/schema";
import { SemanticChunker } from "../chunking/semantic-chunker";
import { EmbeddingService, type EmbeddingClient } from "../embeddings/embedding-service";
import { MetadataEnricher } from "../chunking/metadata-enricher";

export type { IndexingState, IndexingJob } from "./checkpoint";
export { saveCheckpoint, loadCheckpoint } from "./checkpoint";

interface IndexDocumentParams {
  fileAssetId: number;
  subjectId: number;
  classId?: number;
  chapterId?: number;
  topicId?: number;
  rawText: string;
  fileName: string;
  geminiClient: EmbeddingClient;
}

/**
 * Complete indexing pipeline:
 * 1. Chunk text → 2. Enrich metadata → 3. Generate embeddings → 4. Store in rag_chunks
 */
export class DocumentIndexer {
  private chunker: SemanticChunker;
  private metadataEnricher: MetadataEnricher;

  constructor() {
    this.chunker = new SemanticChunker({
      maxTokenSize: 512,
      overlapTokens: 50,
      minTokenSize: 50,
    });
    this.metadataEnricher = new MetadataEnricher();
  }

  /**
   * Index a document: chunk → enrich → embed → store
   */
  public async indexDocument(params: IndexDocumentParams): Promise<number> {
    const {
      fileAssetId,
      subjectId,
      classId,
      chapterId,
      topicId,
      rawText,
      fileName,
      geminiClient,
    } = params;

    console.log(`[DocumentIndexer] Indexing document ${fileAssetId}: ${fileName}`);

    // Step 1: Chunk the text
    const chunks = this.chunker.chunkText(rawText);
    console.log(`[DocumentIndexer] Generated ${chunks.length} chunks`);

    // Step 2: Enrich metadata for each chunk
    const enrichedChunks = chunks.map((chunk, index) =>
      this.metadataEnricher.enrich(chunk, {
        chunkIndex: index,
        fileName,
        subjectId,
        chapterId,
        topicId,
        classId,
        totalChunks: chunks.length,
        rawText,
      })
    );

    // Step 3: Generate embeddings in batches
    const embeddingService = new EmbeddingService(geminiClient);
    const batchSize = 5;

    for (let i = 0; i < enrichedChunks.length; i += batchSize) {
      const batch = enrichedChunks.slice(i, i + batchSize);
      const batchPromises = batch.map((chunk) =>
        embeddingService.generateEmbedding(chunk.text).catch((err) => {
          console.error(`[DocumentIndexer] Embedding failed for chunk ${chunk.id}:`, err);
          return null;
        })
      );

      const embeddings = await Promise.all(batchPromises);

      // Step 4: Store chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        if (!embedding) {
          await this.storeChunk(fileAssetId, subjectId, classId, chapterId, topicId, chunk, null);
          continue;
        }

        await this.storeChunk(fileAssetId, subjectId, classId, chapterId, topicId, chunk, embedding);

        if (i + batchSize < enrichedChunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    // Count stored chunks
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragChunksTable)
      .where(eq(ragChunksTable.fileAssetId, fileAssetId));

    const stored = countResult.length > 0 ? Number(countResult[0]?.count ?? 0) : 0;
    console.log(`[DocumentIndexer] Indexed ${stored} chunks for file asset ${fileAssetId}`);
    return stored;
  }

  private async storeChunk(
    fileAssetId: number,
    subjectId: number,
    classId: number | undefined,
    chapterId: number | undefined,
    topicId: number | undefined,
    chunk: { id: string; text: string; charCount: number; pageNumber?: number; sectionTitle?: string },
    embedding: number[] | null
  ): Promise<void> {
    const contentHash = createHash("sha256").update(chunk.text).digest("hex");

    const values: InsertRagChunk = {
      fileAssetId,
      subjectId,
      classId: classId ?? null,
      chapterId: chapterId ?? null,
      topicId: topicId ?? null,
      parentChunkId: null,
      chunkType: "paragraph",
      chunkDepth: 0,
      content: chunk.text,
      contentHash,
      embeddingJson: embedding,
      embeddingModel: "text-embedding-004",
      embeddingStatus: embedding ? "completed" : "pending",
      pageNumber: chunk.pageNumber ?? null,
      chapterTitle: chunk.sectionTitle ?? null,
      sectionTitle: chunk.sectionTitle ?? null,
      topicTitle: null,
      language: "en",
      documentType: "textbook",
      board: null,
      academicYear: null,
      tokenCount: null,
      charCount: chunk.charCount,
    };

    await db
      .insert(ragChunksTable)
      .values(values)
      .onConflictDoUpdate({
        target: [ragChunksTable.contentHash, ragChunksTable.fileAssetId],
        set: {
          content: chunk.text,
          embeddingJson: embedding,
          embeddingStatus: embedding ? "completed" : "pending",
          charCount: chunk.charCount,
          updatedAt: new Date(),
        },
      });
  }
}
