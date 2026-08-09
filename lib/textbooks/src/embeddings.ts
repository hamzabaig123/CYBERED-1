/**
 * Embeddings generation using Gemini API
 * Note: getGeminiClient is passed as a parameter to avoid circular dependencies
 */

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface GeminiClient {
  models: {
    embedContent: (params: { model: string; content: string }) => Promise<unknown>;
    batchEmbedContents: (params: {
      model: string;
      requests: Array<{ content: string }>;
    }) => Promise<unknown>;
  };
}

/**
 * Generate embeddings for a single text chunk using Gemini
 */
export async function generateEmbedding(text: string, geminiClient: GeminiClient): Promise<number[]> {
  try {
    const result = await geminiClient.models.embedContent({
      model: "models/text-embedding-004",
      contents: text,
    });
    
    // Extract embedding values from the response
    const embeddings = (result as { embeddings?: Array<{ values?: number[] }> }).embeddings;
    if (!embeddings || embeddings.length === 0 || !embeddings[0].values) {
      throw new Error("No embedding returned from Gemini API");
    }
    
    return embeddings[0].values;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate embeddings for multiple text chunks
 * Note: Batch API not available in current SDK, so we call individually
 */
export async function generateEmbeddingsBatch(texts: string[], geminiClient: GeminiClient): Promise<number[][]> {
  console.log(`[Embeddings] Generating ${texts.length} embeddings...`);
  const embeddings: number[][] = [];
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    // Generate embeddings for this batch
    const batchPromises = batch.map(text => generateEmbedding(text, geminiClient));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
      
      if (i + batchSize < texts.length) {
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Failed to generate embeddings for batch ${i}-${i + batch.length}:`, error);
      // Add zero vectors for failed batches
      for (let j = 0; j < batch.length; j++) {
        embeddings.push(new Array(768).fill(0));
      }
    }
  }
  
  return embeddings;
}

/**
 * Calculate cosine similarity between query embedding and document embeddings
 * Returns scores in range [0, 1] where 1 is most similar
 */
export function calculateSimilarity(queryEmbedding: number[], docEmbedding: number[]): number {
  if (queryEmbedding.length !== docEmbedding.length) {
    throw new Error(`Embedding dimension mismatch: ${queryEmbedding.length} vs ${docEmbedding.length}`);
  }
  
  let dotProduct = 0;
  let queryNorm = 0;
  let docNorm = 0;
  
  for (let i = 0; i < queryEmbedding.length; i++) {
    dotProduct += queryEmbedding[i] * docEmbedding[i];
    queryNorm += queryEmbedding[i] * queryEmbedding[i];
    docNorm += docEmbedding[i] * docEmbedding[i];
  }
  
  if (queryNorm === 0 || docNorm === 0) {
    return 0;
  }
  
  const similarity = dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(docNorm));
  
  // Normalize to [0, 1] range (cosine similarity is in [-1, 1])
  return (similarity + 1) / 2;
}

/**
 * Find top-k most similar chunks using cosine similarity
 */
export function findTopKSimilar(
  queryEmbedding: number[],
  chunks: Array<{ embedding: number[]; content: string; pageNumber: number; id: number }>,
  k: number = 5
): Array<{ id: number; content: string; pageNumber: number; score: number }> {
  const scores = chunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    pageNumber: chunk.pageNumber,
    score: calculateSimilarity(queryEmbedding, chunk.embedding),
  }));
  
  // Sort by score descending and take top k
  return scores.sort((a, b) => b.score - a.score).slice(0, k);
}
