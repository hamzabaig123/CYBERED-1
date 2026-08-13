export class QueryDecomposer {
  constructor() {}

  public async decompose(query: string): Promise<string[]> {
    if (query.includes(' and ')) {
      return query.split(' and ').map(q => q.trim() + (q.endsWith('?') ? '' : '?'));
    }
    return [query];
  }
}
