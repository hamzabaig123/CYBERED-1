/**
 * RAG Processor: Handles chunking, embedding, and indexing of textbooks
 * for Retrieval-Augmented Generation (RAG) search.
 */

import { readFileSync } from "node:fs";
import { getStorage } from "./storage.js";

export interface TextChunk {
  content: string;
  pageNumber: number;
  chunkType: "page" | "section" | "paragraph";
  sectionTitle?: string;
}

export interface ChunkingOptions {
  maxChunkSize?: number; // Maximum characters per chunk
  overlapSize?: number; // Characters to overlap between chunks
  splitBySections?: boolean; // Try to detect sections/chapters
}

const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  maxChunkSize: 2000, // ~500 tokens
  overlapSize: 200, // ~50 tokens overlap
  splitBySections: true,
};

/**
 * Extract text from a PDF file. For scanned PDFs, this will be minimal.
 * The actual OCR will be done by Gemini Vision API separately.
 * 
 * Note: This function is a placeholder. Actual text extraction is done
 * by the existing pipeline in pipeline.ts
 */
export async function extractPDFText(storageKey: string): Promise<string> {
  // This function is kept for API compatibility
  // In practice, text extraction is handled by the existing pipeline
  throw new Error("Use the existing pipeline.ts processFileAsset() instead");
}

/**
 * Detect chapter/section boundaries in text using heuristics
 */
function detectSections(text: string): Array<{ title: string; startIndex: number }> {
  const sections: Array<{ title: string; startIndex: number }> = [];
  
  // Common patterns for chapters/sections in textbooks
  const patterns = [
    /^(Chapter|CHAPTER|Unit|UNIT)\s+\d+[:\s]+(.+)$/gm,
    /^(\d+\.\s+[A-Z][A-Za-z\s]+)$/gm, // "1. Introduction"
    /^([A-Z][A-Z\s]{3,})$/gm, // ALL CAPS headings (at least 3 chars)
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[0].trim();
      if (title.length > 3 && title.length < 100) {
        sections.push({
          title,
          startIndex: match.index,
        });
      }
    }
  }
  
  // Sort by position
  return sections.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Split text into chunks with overlap for better retrieval
 */
function splitIntoChunks(
  text: string,
  maxSize: number,
  overlapSize: number
): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxSize;
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf(".", end);
      const questionEnd = text.lastIndexOf("?", end);
      const exclamEnd = text.lastIndexOf("!", end);
      
      const breakPoint = Math.max(sentenceEnd, questionEnd, exclamEnd);
      if (breakPoint > start + maxSize / 2) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlapSize;
    
    if (start >= text.length) break;
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out tiny chunks
}

/**
 * Process a page of text into chunks with metadata
 */
function processPageText(
  pageText: string,
  pageNumber: number,
  options: Required<ChunkingOptions>
): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // If the page is small enough, keep it as one chunk
  if (pageText.length <= options.maxChunkSize) {
    chunks.push({
      content: pageText,
      pageNumber,
      chunkType: "page",
    });
    return chunks;
  }
  
  // Detect sections within the page
  if (options.splitBySections) {
    const sections = detectSections(pageText);
    
    if (sections.length > 0) {
      // Split by sections
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const nextSection = sections[i + 1];
        
        const sectionText = pageText.slice(
          section.startIndex,
          nextSection ? nextSection.startIndex : undefined
        );
        
        // If section is too large, split further
        if (sectionText.length > options.maxChunkSize) {
          const subChunks = splitIntoChunks(
            sectionText,
            options.maxChunkSize,
            options.overlapSize
          );
          
          for (const subChunk of subChunks) {
            chunks.push({
              content: subChunk,
              pageNumber,
              chunkType: "section",
              sectionTitle: section.title,
            });
          }
        } else {
          chunks.push({
            content: sectionText.trim(),
            pageNumber,
            chunkType: "section",
            sectionTitle: section.title,
          });
        }
      }
      
      return chunks;
    }
  }
  
  // No sections detected, split into paragraphs/chunks
  const textChunks = splitIntoChunks(
    pageText,
    options.maxChunkSize,
    options.overlapSize
  );
  
  for (const chunk of textChunks) {
    chunks.push({
      content: chunk,
      pageNumber,
      chunkType: "paragraph",
    });
  }
  
  return chunks;
}

/**
 * Parse page-tagged text format: "[page N] content"
 * This is the format returned by the existing PDF processor
 */
function parsePageTaggedText(text: string): Map<number, string> {
  const pages = new Map<number, string>();
  const pageRegex = /\[page (\d+)\]\s*([\s\S]*?)(?=\[page \d+\]|$)/g;
  
  let match;
  while ((match = pageRegex.exec(text)) !== null) {
    const pageNum = parseInt(match[1], 10);
    const content = match[2].trim();
    if (content) {
      pages.set(pageNum, content);
    }
  }
  
  return pages;
}

/**
 * Main function: Chunk a textbook into searchable pieces
 */
export async function chunkTextbook(
  storageKey: string,
  extractedText: string,
  options: ChunkingOptions = {}
): Promise<TextChunk[]> {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const allChunks: TextChunk[] = [];
  
  // Parse the page-tagged format
  const pages = parsePageTaggedText(extractedText);
  
  if (pages.size === 0) {
    // Fallback: treat as single document
    const chunks = processPageText(extractedText, 1, opts);
    allChunks.push(...chunks);
  } else {
    // Process each page
    for (const [pageNum, pageText] of pages.entries()) {
      const chunks = processPageText(pageText, pageNum, opts);
      allChunks.push(...chunks);
    }
  }
  
  return allChunks;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * (used when we have embeddings to compare)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple BM25 scoring for text relevance (used as fallback when no embeddings)
 */
export function calculateBM25Score(
  query: string,
  document: string,
  avgDocLength: number = 1000,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const docTerms = document.toLowerCase().split(/\s+/);
  const docLength = docTerms.length;
  
  let score = 0;
  
  for (const term of queryTerms) {
    const termFreq = docTerms.filter(t => t === term).length;
    if (termFreq === 0) continue;
    
    // Simplified BM25 without IDF (since we don't have corpus stats)
    const numerator = termFreq * (k1 + 1);
    const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
    
    score += numerator / denominator;
  }
  
  return score;
}
