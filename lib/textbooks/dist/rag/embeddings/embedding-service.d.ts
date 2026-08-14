/**
 * Embedding service that uses a Gemini client to generate embeddings.
 * The client is passed in to avoid a hard dependency on @google/generative-ai
 * in the library workspace.
 */
export interface EmbeddingClient {
    embedContent: (params: {
        model: string;
        content: string;
    }) => Promise<{
        embedding: {
            values: number[];
        };
    } | {
        embeddings: Array<{
            values?: number[];
        }>;
    }>;
}
export declare class EmbeddingService {
    private client;
    private modelName;
    constructor(client: EmbeddingClient, modelName?: string);
    generateEmbedding(text: string): Promise<number[]>;
}
//# sourceMappingURL=embedding-service.d.ts.map