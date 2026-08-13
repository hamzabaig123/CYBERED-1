export const RAG_CONFIG = {
  embedding: {
    model: process.env.EMBEDDING_MODEL || "models/text-embedding-004",
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "768"),
    batchSize: 5,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  search: {
    defaultTopK: 10,
    vectorTopK: 50,
    ftsTopK: 50,
    rrfK: 60,
    minConfidence: 0.3,
  },
  chunking: {
    maxChunkSize: 1500,
    overlapSize: 200,
    minChunkSize: 50,
  },
};
