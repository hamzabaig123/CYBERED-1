import { GoogleGenerativeAI } from "@google/generative-ai";

export class RerankerService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async rerank(query: string, documents: any[]): Promise<any[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    // Very basic reranking implementation using Gemini
    // In production, you might want to use a dedicated reranking model or prompt
    const prompt = `Given the query: "${query}", score the following documents from 0.0 to 1.0 based on relevance.
    Respond with a JSON array of objects, each containing the 'id' and 'score'.
    
    Documents:
    ${JSON.stringify(documents.map(d => ({ id: d.id, content: d.content })))}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const match = responseText.match(/\[.*\]/s);
      if (!match) return documents;
      
      const scores = JSON.parse(match[0]);
      const scoreMap = new Map(scores.map((s: any) => [s.id, s.score]));
      
      return documents
        .map(doc => ({ ...doc, rerankScore: scoreMap.get(doc.id) || 0 }))
        .sort((a, b) => b.rerankScore - a.rerankScore);
    } catch (e) {
      console.error("Reranking failed, falling back to original order", e);
      return documents;
    }
  }
}
