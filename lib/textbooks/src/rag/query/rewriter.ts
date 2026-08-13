export class QueryRewriter {
  constructor() {}

  public async rewrite(query: string, conversationHistory: string[] = []): Promise<string> {
    if (conversationHistory.length > 0) {
      return `${query} (Context: ${conversationHistory[conversationHistory.length - 1]})`;
    }
    return query;
  }
}
