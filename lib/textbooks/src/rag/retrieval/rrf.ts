export interface RankedResult {
  id: string;
  score: number;
  originalResult: any;
}

export function reciprocalRankFusion(
  list1: any[],
  list2: any[],
  k: number = 60
): RankedResult[] {
  const scores = new Map<string, RankedResult>();

  // Process list 1
  list1.forEach((item, index) => {
    const rank = index + 1;
    const score = 1 / (k + rank);
    scores.set(item.id, {
      id: item.id,
      score: score,
      originalResult: item,
    });
  });

  // Process list 2
  list2.forEach((item, index) => {
    const rank = index + 1;
    const score = 1 / (k + rank);
    if (scores.has(item.id)) {
      scores.get(item.id)!.score += score;
    } else {
      scores.set(item.id, {
        id: item.id,
        score: score,
        originalResult: item,
      });
    }
  });

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}
