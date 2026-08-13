import { vectorSearch } from "./vector-search";
import { lexicalSearch } from "./lexical-search";
import { reciprocalRankFusion } from "./rrf";
import { buildFilters, SearchFilters } from "./filters";

export async function hybridSearch(
  query: string,
  embedding: number[],
  limit: number = 10,
  filters?: SearchFilters
) {
  const filterSql = filters ? buildFilters(filters) : undefined;

  const [vectorResults, lexicalResults] = await Promise.all([
    vectorSearch(embedding, limit * 2, filterSql),
    lexicalSearch(query, limit * 2, filterSql),
  ]);

  const fusedResults = reciprocalRankFusion(vectorResults, lexicalResults);

  return fusedResults.slice(0, limit).map((r) => r.originalResult);
}
