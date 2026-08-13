import * as fs from "fs";
import * as path from "path";

export interface GoldenQuestion {
  id: string;
  question: string;
  class: number;
  subject: string;
  chapter: string;
  expected_pages: number[];
  expected_source: string;
  answer_type: string;
}

export function loadGoldenDataset(filePath?: string): GoldenQuestion[] {
  const p = filePath || path.join(process.cwd(), "tests", "rag", "golden-questions.json");
  if (!fs.existsSync(p)) return [];
  const content = fs.readFileSync(p, "utf-8");
  return JSON.parse(content) as GoldenQuestion[];
}
