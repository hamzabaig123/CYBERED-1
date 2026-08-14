import { type SQL } from "drizzle-orm";
import { SearchResult } from "./vector-search";
export declare function lexicalSearch(queryText: string, limit?: number, filterSql?: SQL | undefined): Promise<SearchResult[]>;
//# sourceMappingURL=lexical-search.d.ts.map