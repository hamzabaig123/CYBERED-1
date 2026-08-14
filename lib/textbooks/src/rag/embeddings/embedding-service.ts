/**
 * Embedding service that uses a Gemini client to generate embeddings.
 * The client is passed in to avoid a hard dependency on @google/generative-ai
 * in the library workspace.
 */
export interface EmbeddingClient {
  embedContent: (params: {
    model: string;
    content: string;
  }) => Promise<{ embedding: { values: number[] } } | { embeddings: Array<{ values?: number[] }> }>;
}

export class EmbeddingService {
  private client: EmbeddingClient;
  private modelName: string;

  constructor(client: EmbeddingClient, modelName: string = "text-embedding-004") {
    this.client = client;
    this.modelName = modelName;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.client.embedContent({
      model: `models/${this.modelName}`,
      content: text,
    });

    if ("embedding" in result) {
      return result.embedding.values;
    }
    if ("embeddings" in result && result.embeddings.length > 0 && result.embeddings[0].values) {
      return result.embeddings[0].values;
    }
    throw new Error("No embedding returned from API");
  }
}
