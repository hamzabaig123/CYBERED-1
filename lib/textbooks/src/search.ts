export interface PageChunk {
  page: number;
  text: string;
}

/** Split page-tagged full text (as produced by extractPdfText) into per-page chunks. */
export function parsePages(fullText: string): PageChunk[] {
  const re = /\[page (\d+)\]\s*/g;
  const chunks: PageChunk[] = [];
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    if (last) {
      chunks.push({
        page: Number(last[1]),
        text: fullText.slice(last.index + last[0].length, m.index).trim(),
      });
    }
    last = m;
  }
  if (last) {
    chunks.push({
      page: Number(last[1]),
      text: fullText.slice(last.index + last[0].length).trim(),
    });
  }
  return chunks;
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "of", "to", "in", "on", "at", "for", "and", "or", "not", "with",
  "what", "which", "who", "whom", "whose", "how", "when", "where", "why",
  "does", "do", "did", "done", "it", "its", "this", "that", "these", "those",
  "from", "by", "about", "into", "than", "then", "as", "if", "but", "so",
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "has", "have", "had", "is", "you", "your", "we", "our", "i", "he", "she", "they",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 0);
}

export function keywordTerms(question: string): string[] {
  return tokenize(question).filter((t) => !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function countOccurrences(text: string, term: string): number {
  let count = 0;
  let idx = text.indexOf(term);
  while (idx !== -1) {
    count += 1;
    idx = text.indexOf(term, idx + term.length);
  }
  return count;
}

export interface RelevantChunk {
  pages: number[];
  text: string;
  scores: Array<{ page: number; score: number }>;
}

export interface FindRelevantOptions {
  /** Pages before/after the best-matching page to include as context. */
  window?: number;
  /** Hard cap on the excerpt length passed to the LLM. */
  maxChars?: number;
}

/**
 * Naive keyword search over page-tagged textbook text. Scores each page by how
 * many question terms appear in it (weighted by frequency), picks the best page
 * and returns it plus a window of surrounding pages. Good enough to start;
 * upgrade to embeddings/pgvector only if this proves insufficient.
 */
export function findRelevantPages(
  fullText: string,
  question: string,
  opts: FindRelevantOptions = {},
): RelevantChunk {
  const window = opts.window ?? 1;
  const maxChars = opts.maxChars ?? 12_000;
  const terms = keywordTerms(question);

  const chunks = parsePages(fullText);
  const scores = chunks.map((c) => {
    const text = c.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      score += countOccurrences(text, term);
    }
    return { chunk: c, score };
  });

  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i].score > bestScore) {
      bestScore = scores[i].score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1 || bestScore === 0) {
    return { pages: [], text: "", scores: [] };
  }

  const from = Math.max(0, bestIndex - window);
  const to = Math.min(chunks.length - 1, bestIndex + window);
  const selected = chunks.slice(from, to + 1);

  let text = "";
  for (const c of selected) {
    const block = `[page ${c.page}]\n${c.text}`;
    if (text.length + block.length + 2 > maxChars) break;
    text += (text ? "\n\n" : "") + block;
  }

  return {
    pages: selected.map((c) => c.page),
    text,
    scores: scores
      .map((s) => ({ page: s.chunk.page, score: s.score }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score),
  };
}
