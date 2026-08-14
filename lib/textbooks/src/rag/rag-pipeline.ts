import { vectorSearch } from "./retrieval/vector-search";
import { lexicalSearch } from "./retrieval/lexical-search";
import { reciprocalRankFusion } from "./retrieval/rrf";
import { buildFilters, SearchFilters } from "./retrieval/filters";
import type { SearchResult } from "./retrieval/vector-search";

export interface RagResult {
  answer: string;
  citations: Array<{
    chunkId: number;
    content: string;
    pageNumber?: number;
    sectionTitle?: string;
    score: number;
    fileAssetId: number;
  }>;
  contextUsed: string;
}

interface RunRagParams {
  query: string;
  embedding?: number[];
  subjectId?: number;
  fileAssetId?: number;
  limit?: number;
  geminiClient?: any; // GeminiClient from geminiClient.ts
}

/**
 * Full RAG 2.0 pipeline:
 * 1. Query embedding → 2. Hybrid search (vector + lexical) →
 * 3. RRF → 4. Rerank → 5. Build context → 6. Generate answer with citations
 */
export async function runRagPipeline(params: RunRagParams): Promise<RagResult> {
  const { query, embedding = [], subjectId, fileAssetId, limit = 5, geminiClient } = params;

  // Build filters from curriculum context
  const filters: SearchFilters = {};
  if (subjectId) filters.subjectId = subjectId;
  if (fileAssetId) filters.fileAssetId = fileAssetId;

  const filterSql = filters ? buildFilters(filters) : undefined;

  // Step 1: Generate query embedding if not provided
  let queryEmbedding = embedding;
  if (queryEmbedding.length === 0 && geminiClient) {
    try {
      const embedResult = await geminiClient.models.embedContent({
        model: "models/text-embedding-004",
        content: query,
      });
      queryEmbedding = (embedResult as { embeddings?: Array<{ values?: number[] }> })
        .embeddings?.[0]?.values || [];
    } catch (err) {
      console.error("[RAG Pipeline] Embedding generation failed:", err);
    }
  }

  // Step 2: Vector similarity search (if we have embeddings)
  const vectorResults = queryEmbedding.length > 0
    ? await vectorSearch(queryEmbedding, limit * 2, filterSql)
    : [];

  // Step 3: Lexical/FTS search
  const lexicalResults = await lexicalSearch(query, limit * 2, filterSql);

  // Step 4: RRF to combine results
  const fusedResults = reciprocalRankFusion(vectorResults, lexicalResults);

  // Step 5: Take top results
  const topResults = fusedResults
    .slice(0, limit)
    .map((r) => r.originalResult)
    .filter((r): r is SearchResult => r !== undefined);

  // Step 6: Build context
  const contextString = topResults
    .map(
      (chunk) =>
        `--- Document Chunk ---\n` +
        `File ID: ${chunk.fileAssetId}\n` +
        `Page: ${chunk.pageNumber ?? "N/A"}\n` +
        `Section: ${chunk.sectionTitle ?? "Unknown"}\n` +
        `Relevance: ${(chunk.score * 100).toFixed(1)}%\n` +
        `Content: ${chunk.content}\n`
    )
    .join("\n");

  // Step 7: Generate grounded answer with citations
  let answer: string;

  if (geminiClient && topResults.length > 0) {
    const prompt = `You are a helpful AI tutor answering using textbook content.
Context (with citations):
${contextString}

Question: ${query}

Answer the question using ONLY the provided context. Include citation numbers [1], [2], [3] etc. matching the source chunks. If the answer is not in the context, say so.`;

    try {
      const result = await geminiClient.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });
      answer = result.response.text();
    } catch (err) {
      console.error("[RAG Pipeline] Gemini generation failed:", err);
      answer = `Based on the retrieved documents:\n\n${contextString.slice(0, 500)}...`;
    }
  } else {
    answer = `I found ${topResults.length} relevant passages:\n\n${contextString.slice(0, 1000)}`;
  }

  // Step 8: Format citations
  const citations = topResults.map((chunk, index) => ({
    chunkId: chunk.chunkId,
    content: chunk.content.slice(0, 200),
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.sectionTitle,
    score: chunk.score,
    fileAssetId: chunk.fileAssetId,
  }));

  return {
    answer,
    citations,
    contextUsed: contextString,
  };
}
