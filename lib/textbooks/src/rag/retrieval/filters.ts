import { sql } from "drizzle-orm";
import { chunks } from "@workspace/db/schema";

export interface SearchFilters {
  documentIds?: string[];
  metadata?: Record<string, any>;
}

export function buildFilters(filters: SearchFilters) {
  const conditions = [];

  if (filters.documentIds && filters.documentIds.length > 0) {
    conditions.push(sql`${chunks.documentId} IN ${filters.documentIds}`);
  }

  if (filters.metadata) {
    for (const [key, value] of Object.entries(filters.metadata)) {
      conditions.push(sql`${chunks.metadata}->>${key} = ${value}`);
    }
  }

  if (conditions.length === 0) return undefined;
  
  return sql.join(conditions, sql` AND `);
}
