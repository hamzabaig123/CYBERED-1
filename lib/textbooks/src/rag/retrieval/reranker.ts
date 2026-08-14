/**
 * Reranker service that uses a Gemini client to rerank documents.
 * The client is passed in to avoid a hard dependency on @google/generative-ai
 * in the library workspace.
 */
export interface RerankerClient {
  generateContent: (params: {
    model: string;
    contents: string;
    generationConfig?: { temperature?: number; maxOutputTokens?: number };
  }) => Promise<string>;
}

export class RerankerService {
  private client: RerankerClient;
  private modelName: string;

  constructor(client: RerankerClient, modelName: string = "gemini-1.5-flash") {
    this.client = client;
    this.modelName = modelName;
  }

  async rerank(query: string, documents: any[]): Promise<any[]> {
    if (documents.length === 0) return [];

    const prompt = `Given the query: "${query}", score the following documents from 0.0 to 1.0 based on relevance.
Respond with a JSON array of objects, each containing the 'id' and 'score'.

Documents:
${JSON.stringify(documents.map(d => ({ id: d.id, content: d.content?.slice(0, 500) })))}`;

    try {
      const responseText = await this.client.generateContent({
        model: this.modelName,
        contents: prompt,
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      });

      const match = responseText.match(/\[.*\]/s);
      if (!match) return documents;

      const scores = JSON.parse(match[0]);
      const scoreMap = new Map(scores.map((s: any) => [s.id, s.score]));

      return documents
        .map(doc => ({ ...doc, rerankScore: scoreMap.get(doc.id) || 0 }))
        .sort((a: any, b: any) => b.rerankScore - a.rerankScore);
    } catch (e) {
      console.error("Reranking failed, falling back to original order", e);
      return documents;
    }
  }
}

// Functional wrapper for convenience
export async function rerank(
  query: string,
  documents: any[],
  client: RerankerClient,
  modelName?: string
): Promise<any[]> {
  const service = new RerankerService(client, modelName);
  return service.rerank(query, documents);
}
