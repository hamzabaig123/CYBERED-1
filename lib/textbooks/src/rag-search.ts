/**
 * RAG Search: Hybrid search combining embeddings and full-text search
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { generateEmbedding, calculateSimilarity, type GeminiClient } from "./embeddings.js";

export interface SearchResult {
  chunkId: number;
  content: string;
  pageNumber: number;
  sectionTitle?: string;
  score: number;
  fileAssetId: number;
  filename: string;
}

export interface SearchOptions {
  topK?: number; // Number of results to return
  minScore?: number; // Minimum similarity score (0-1)
  hybridWeight?: number; // Weight for embedding vs full-text (0=FTS only, 1=embedding only)
  subjectId?: number; // Filter by subject
  fileAssetId?: number; // Filter by specific file
}

const DEFAULT_SEARCH_OPTIONS: Required<Omit<SearchOptions, "subjectId" | "fileAssetId">> = {
  topK: 5,
  minScore: 0.3,
  hybridWeight: 0.7, // 70% embedding, 30% full-text
};

/**
 * Hybrid search combining embedding similarity and full-text search
 */
export async function searchTextbookChunks(
  query: string,
  geminiClient: GeminiClient,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  
  try {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(query, geminiClient);
    
    // Step 2: Build SQL query with filters
    let sqlQuery = sql`
      SELECT 
        tc.id as chunk_id,
        tc.content,
        tc.page_number,
        tc.section_title,
        tc.embedding_json,
        tc.file_asset_id,
        fa.original_filename as filename,
        ts_rank(tc.content_tsv, plainto_tsquery('english', ${query})) as fts_score
      FROM textbook_chunks tc
      JOIN file_assets fa ON tc.file_asset_id = fa.id
      WHERE 1=1
    `;
    
    // Add filters
    if (opts.subjectId) {
      sqlQuery = sql`${sqlQuery} AND tc.subject_id = ${opts.subjectId}`;
    }
    
    if (opts.fileAssetId) {
      sqlQuery = sql`${sqlQuery} AND tc.file_asset_id = ${opts.fileAssetId}`;
    }
    
    // Only fetch chunks that match the query text (basic relevance filter)
    sqlQuery = sql`${sqlQuery} AND tc.content_tsv @@ plainto_tsquery('english', ${query})`;
    
    // Limit to reasonable number for processing
    sqlQuery = sql`${sqlQuery} LIMIT 100`;
    
    const result = await db.execute(sqlQuery);
    const rows = result.rows as Array<{
      chunk_id: number;
      content: string;
      page_number: number;
      section_title: string | null;
      embedding_json: string;
      file_asset_id: number;
      filename: string;
      fts_score: number;
    }>;
    
    // Step 3: Calculate hybrid scores
    const scoredResults: SearchResult[] = [];
    
    for (const row of rows) {
      // Parse embedding
      let embedding: number[];
      try {
        embedding = JSON.parse(row.embedding_json);
      } catch {
        console.error(`Failed to parse embedding for chunk ${row.chunk_id}`);
        continue;
      }
      
      // Calculate embedding similarity
      const embeddingScore = calculateSimilarity(queryEmbedding, embedding);
      
      // Normalize FTS score to [0, 1] range (approximate)
      const ftsScore = Math.min(row.fts_score / 0.1, 1.0);
      
      // Hybrid score: weighted combination
      const hybridScore =
        opts.hybridWeight * embeddingScore + (1 - opts.hybridWeight) * ftsScore;
      
      if (hybridScore >= opts.minScore) {
        scoredResults.push({
          chunkId: row.chunk_id,
          content: row.content,
          pageNumber: row.page_number,
          sectionTitle: row.section_title || undefined,
          score: hybridScore,
          fileAssetId: row.file_asset_id,
          filename: row.filename,
        });
      }
    }
    
    // Step 4: Sort by score and return top K
    scoredResults.sort((a, b) => b.score - a.score);
    
    return scoredResults.slice(0, opts.topK);
    
  } catch (error) {
    console.error("[RAG Search] Search failed:", error);
    
    // Fallback to full-text search only
    console.log("[RAG Search] Falling back to full-text search only...");
    return await fallbackFullTextSearch(query, options);
  }
}

/**
 * Fallback search using only full-text search (no embeddings)
 */
async function fallbackFullTextSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  
  let sqlQuery = sql`
    SELECT 
      tc.id as chunk_id,
      tc.content,
      tc.page_number,
      tc.section_title,
      tc.file_asset_id,
      fa.original_filename as filename,
      ts_rank(tc.content_tsv, plainto_tsquery('english', ${query})) as score
    FROM textbook_chunks tc
    JOIN file_assets fa ON tc.file_asset_id = fa.id
    WHERE tc.content_tsv @@ plainto_tsquery('english', ${query})
  `;
  
  if (opts.subjectId) {
    sqlQuery = sql`${sqlQuery} AND tc.subject_id = ${opts.subjectId}`;
  }
  
  if (opts.fileAssetId) {
    sqlQuery = sql`${sqlQuery} AND tc.file_asset_id = ${opts.fileAssetId}`;
  }
  
  sqlQuery = sql`${sqlQuery} ORDER BY score DESC LIMIT ${opts.topK}`;
  
  const result = await db.execute(sqlQuery);
  const rows = result.rows as Array<{
    chunk_id: number;
    content: string;
    page_number: number;
    section_title: string | null;
    file_asset_id: number;
    filename: string;
    score: number;
  }>;
  
  return rows.map(row => ({
    chunkId: row.chunk_id,
    content: row.content,
    pageNumber: row.page_number,
    sectionTitle: row.section_title || undefined,
    score: Math.min(row.score / 0.1, 1.0), // Normalize score
    fileAssetId: row.file_asset_id,
    filename: row.filename,
  }));
}

/**
 * Get all chunks for a specific page (for citation/context)
 */
export async function getChunksForPage(
  fileAssetId: number,
  pageNumber: number
): Promise<SearchResult[]> {
  const result = await db.execute(sql`
    SELECT 
      tc.id as chunk_id,
      tc.content,
      tc.page_number,
      tc.section_title,
      tc.file_asset_id,
      fa.original_filename as filename
    FROM textbook_chunks tc
    JOIN file_assets fa ON tc.file_asset_id = fa.id
    WHERE tc.file_asset_id = ${fileAssetId}
      AND tc.page_number = ${pageNumber}
    ORDER BY tc.id
  `);
  
  const rows = result.rows as Array<{
    chunk_id: number;
    content: string;
    page_number: number;
    section_title: string | null;
    file_asset_id: number;
    filename: string;
  }>;
  
  return rows.map(row => ({
    chunkId: row.chunk_id,
    content: row.content,
    pageNumber: row.page_number,
    sectionTitle: row.section_title || undefined,
    score: 1.0,
    fileAssetId: row.file_asset_id,
    filename: row.filename,
  }));
}
