export interface Metrics {
  recallAt5: number;
  recallAt10: number;
  recallAt20: number;
  mrr: number;
  precisionAt5: number;
  citationAccuracy: number;
  groundedness: number;
}

export function calculateRecall(retrieved: number[], expected: number[]): number {
  const overlap = expected.filter((e) => retrieved.includes(e)).length;
  return expected.length > 0 ? overlap / expected.length : 0;
}

export function calculateMRR(retrieved: number[], expected: number[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.includes(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}
