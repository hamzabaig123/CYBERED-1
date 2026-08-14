/**
 * Reranker service that uses a Gemini client to rerank documents.
 * The client is passed in to avoid a hard dependency on @google/generative-ai
 * in the library workspace.
 */
export interface RerankerClient {
    generateContent: (params: {
        model: string;
        contents: string;
        generationConfig?: {
            temperature?: number;
            maxOutputTokens?: number;
        };
    }) => Promise<string>;
}
export declare class RerankerService {
    private client;
    private modelName;
    constructor(client: RerankerClient, modelName?: string);
    rerank(query: string, documents: any[]): Promise<any[]>;
}
export declare function rerank(query: string, documents: any[], client: RerankerClient, modelName?: string): Promise<any[]>;
//# sourceMappingURL=reranker.d.ts.map