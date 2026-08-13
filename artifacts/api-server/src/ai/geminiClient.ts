import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface Citation {
  page: number;
  filename: string;
  snippet: string;
}

export interface ExplainResponse {
  explanation: string;
  citations: Citation[];
}

export interface VerificationResponse {
  aiAnswer: string;
  sourcePage: number | null;
  sourceFilename: string | null;
  confidence: number | null;
}

export interface GeneratedQuestion {
  question: string;
  options?: { A: string; B: string; C: string; D: string };
  correctOption?: "A" | "B" | "C" | "D";
  modelAnswer?: string;
  sourcePage: number;
  explanation?: string;
}

export interface GradingSuggestion {
  marksAwarded: number;
  feedback: string;
  missedPoints: string[];
  citations: Citation[];
}

export interface ChatResponse {
  content: string;
  citations: Citation[];
}

export type ChatMode = "answer" | "tutor";
export type ReplyLanguage = "auto" | "english" | "urdu" | "sindhi";

export interface ChatStreamOptions {
  mode?: ChatMode;
  language?: ReplyLanguage;
}

export interface EvaluateRubricCriterion {
  criterion: string;
  marks: number;
}

export interface RubricEvaluation {
  criteria: Array<{
    criterion: string;
    marks: number;
    awarded: number;
    met: boolean;
    comment: string;
  }>;
  marksAwarded: number;
  marksTotal: number;
  feedback: string;
  missedPoints: string[];
  citations: Citation[];
}

export interface GenerateOptions {
  topicFocus?: string;
  difficulty?: "auto" | "easier" | "harder";
  language?: ReplyLanguage;
}

export interface ExcerptAnswer {
  text: string;
}

/**
 * Phase 5: answer an MCQ/plain question using only the provided textbook
 * excerpt (page-tagged). The model is told to rely solely on the excerpt and
 * cite the page number, so answers stay grounded in the book.
 */
export async function answerFromExcerpt(
  excerpt: string,
  question: string,
  options?: Record<string, string>
): Promise<ExcerptAnswer> {
  const client = getGeminiClient();
  const optionsText = options
    ? `\nMCQ options:\n${Object.entries(options).map(([k, v]) => `${k}) ${v}`).join("\n")}`
    : "";

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Answer the question using ONLY the textbook excerpt below. Base your answer strictly on the excerpt — do not use outside knowledge. If the excerpt does not contain the answer, say so instead of guessing. Cite the page number(s) the answer comes from as [page N]. Keep it to 2-4 sentences and, for MCQs, state the chosen option letter.

Textbook excerpt:
${excerpt}

Question: ${question}${optionsText}`,
  });

  return { text: (response as { text?: string }).text ?? "" };
}

export async function createBookStore(subjectName: string): Promise<string> {
  const client = getGeminiClient();
  const store = await client.fileSearchStores.create({
    config: { displayName: `cybered-${subjectName}` },
  });
  return store.name ?? "";
}

export async function uploadToFileSearchStore(
  fileSearchStoreName: string,
  fileBytes: Uint8Array,
  displayName: string
): Promise<string> {
  if (!fileBytes || fileBytes.byteLength === 0) {
    throw new Error(
      `Cannot index an empty file into store '${fileSearchStoreName}' (displayName='${displayName}'). ` +
      `For full PDFs, upload via the file queue so the worker reads the stored bytes; for excerpts, pass non-empty textbookContent.`
    );
  }

  const client = getGeminiClient();
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: new Blob([Buffer.from(fileBytes)], { type: "application/pdf" }),
    fileSearchStoreName,
    config: { displayName, mimeType: "application/pdf" },
  });

  if (!operation.name) {
    throw new Error(
      `Gemini uploadToFileSearchStore for '${fileSearchStoreName}' (displayName='${displayName}', ` +
      `${fileBytes.byteLength} bytes) did not return a long-running operation name.`
    );
  }

  return operation.name;
}

interface FileSearchOperationLike {
  name?: string;
  done?: boolean;
  error?: { message?: string };
}

export async function checkIndexingStatus(operationName: string): Promise<{ done: boolean; error?: string }> {
  const client = getGeminiClient();
  const get = client.operations.get as unknown as (
    params: { operation: { name: string } }
  ) => Promise<FileSearchOperationLike>;
  const operation = await get({ operation: { name: operationName } });
  return {
    done: operation.done ?? false,
    error: operation.error?.message,
  };
}

export async function explainFromBook(
  storeName: string,
  questionText: string,
  opts: { language?: ReplyLanguage } = {}
): Promise<ExplainResponse> {
  const client = getGeminiClient();
  const lang = languageInstruction(opts.language);
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${lang}Explain this in the style of a textbook answer, citing the page it comes from: ${questionText}`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  return parseExplanationResponse(response);
}

export async function verifyQuestion(
  storeName: string,
  questionText: string,
  storedAnswer: string,
  questionType: string
): Promise<VerificationResponse> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `According to the textbook, is this correct?
Question: ${questionText}
Stored answer: ${storedAnswer}
Reply with the book's actual answer and the page it's on.`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  return parseVerificationResponse(response);
}

export async function generateQuestions(
  storeName: string,
  pageRange: string,
  questionType: "mcq" | "short" | "long",
  count: number,
  topicFocus?: string,
  difficulty: "auto" | "easier" | "harder" = "auto",
  language?: ReplyLanguage
): Promise<GeneratedQuestion[]> {
  const client = getGeminiClient();
  const lang = languageInstruction(language);

  const difficultyText =
    difficulty === "harder"
      ? "Make these questions HARDER than a typical board exam question: combine concepts, require application and reasoning, avoid recall-only items. "
      : difficulty === "easier"
        ? "Make these questions EASIER than typical board exam difficulty to rebuild confidence: focus on direct recall, definitions, and one-concept basics. "
        : "Match the difficulty of a typical board exam. ";

  let prompt = `${lang}${difficultyText}Generate ${count} ${questionType} questions from pages ${pageRange} of this textbook, with answers and page citations. `;
  if (topicFocus) {
    prompt += `Focus on: ${topicFocus}. `;
  }
  prompt += `Return as JSON array: [{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correctOption": "A", "sourcePage": 43, "explanation": "..."}, ...]`;

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
      responseMimeType: "application/json",
    },
  });

  return parseGeneratedQuestions(response);
}

export async function gradeAnswer(
  storeName: string,
  questionText: string,
  studentAnswer: string,
  modelAnswer: string | undefined,
  maxMarks: number
): Promise<GradingSuggestion> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Question: ${questionText}
Student answer: ${studentAnswer}
${modelAnswer ? `Model answer: ${modelAnswer}` : ""}
Grade out of ${maxMarks} marks based on the textbook, citing what was missed.`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  return parseGradingResponse(response, maxMarks);
}

export async function chatWithBook(
  storeName: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  opts: ChatStreamOptions = {}
): Promise<ChatResponse> {
  const client = getGeminiClient();
  const contents = buildChat(messages, opts);
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  return parseChatResponse(response);
}

/**
 * Streaming chat: yields text chunks as they arrive. The final chunk
 * carries the full text; citations are collected from grounding metadata.
 */
export async function* streamChatWithBook(
  storeName: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  opts: ChatStreamOptions = {}
): AsyncGenerator<{ type: "text"; text: string } | { type: "done"; citations: Citation[] }> {
  const client = getGeminiClient();
  const contents = buildChat(messages, opts);

  const stream = await client.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  let final: { text?: string; groundingMetadata?: unknown } | null = null;
  for await (const chunk of stream) {
    const text = (chunk as { text?: string }).text ?? "";
    final = { text, groundingMetadata: (chunk as { groundingMetadata?: unknown }).groundingMetadata };
    if (text) yield { type: "text", text };
  }

  const citations = parseGroundingCitations(final);
  yield { type: "done", citations };
}

/**
 * Stream an explanation from the textbook, token-by-token.
 * Yields text deltas, and one final chunk with the full text + citations.
 */
export async function* streamExplainFromBook(
  storeName: string,
  questionText: string,
  opts: { language?: ReplyLanguage } = {}
): AsyncGenerator<{ type: "text"; text: string } | { type: "done"; explanation: string; citations: Citation[] }> {
  const client = getGeminiClient();
  const lang = languageInstruction(opts.language);
  const stream = await client.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `${lang}Explain this in the style of a textbook answer, citing the page it comes from: ${questionText}`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  let accumulated = "";
  let final: { text?: string; groundingMetadata?: unknown } | null = null;
  for await (const chunk of stream) {
    const text = (chunk as { text?: string }).text ?? "";
    accumulated += text;
    final = { text, groundingMetadata: (chunk as { groundingMetadata?: unknown }).groundingMetadata };
    if (text) yield { type: "text", text };
  }

  const citations = parseGroundingCitations(final);
  yield { type: "done", explanation: accumulated, citations };
}

/**
 * Evaluate a written answer against an optional structured rubric.
 * Each criterion is graded individually; marks are summed.
 */
export async function evaluateAnswerWithRubric(
  storeName: string,
  questionText: string,
  studentAnswer: string,
  rubric: Array<{ criterion: string; marks: number }> | null,
  totalMarks: number,
  opts: { language?: ReplyLanguage } = {}
): Promise<RubricEvaluation> {
  const client = getGeminiClient();
  const lang = languageInstruction(opts.language);

  const rubricText = rubric && rubric.length > 0
    ? rubric.map((r) => `- ${r.criterion} (${r.marks} marks)`).join("\n")
    : `(no explicit rubric — judge holistically against ${totalMarks} total marks)`;

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${lang}Grade this answer strictly against the marking rubric. For each criterion, decide how many of its marks the answer earns (0 to full), whether it was met, and a 1-line comment. Sum to a final total out of the rubric total.

Question: ${questionText}
Student answer: ${studentAnswer}
Rubric (criterion = marks):
${rubricText}

Return EXACTLY a JSON object:
{
  "criteria": [{"criterion": "...", "marks": 2, "awarded": 1, "met": false, "comment": "..."}],
  "marksTotal": <sum of rubric marks>,
  "marksAwarded": <sum of awarded>,
  "feedback": "2-3 sentence summary",
  "missedPoints": ["..."]
}`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
      responseMimeType: "application/json",
    },
  });

  return parseRubricEvaluation(response, rubric, totalMarks);
}

/**
 * Stream the rubric evaluation feedback token-by-token, finalizing with
 * marks, rubricBreakdown, and missedPoints.
 */
export async function* streamEvaluateAnswer(
  storeName: string,
  questionText: string,
  studentAnswer: string,
  rubric: Array<{ criterion: string; marks: number }> | null,
  totalMarks: number,
  opts: { language?: ReplyLanguage } = {}
): AsyncGenerator<
  | { type: "text"; text: string }
  | { type: "done"; marksAwarded: number; marksTotal: number; feedback: string; missedPoints: string[]; rubricBreakdown?: Array<{ criterion: string; marksAwarded: number; marksTotal: number; feedback: string }> }
> {
  const client = getGeminiClient();
  const lang = languageInstruction(opts.language);

  const rubricText = rubric && rubric.length > 0
    ? rubric.map((r) => `- ${r.criterion} (${r.marks} marks)`).join("\n")
    : `(no explicit rubric — judge holistically against ${totalMarks} total marks)`;

  const stream = await client.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `${lang}Grade this answer strictly against the marking rubric. For each criterion, decide how many of its marks the answer earns (0 to full), whether it was met, and a 1-line comment. Sum to a final total out of the rubric total.

Question: ${questionText}
Student answer: ${studentAnswer}
Rubric (criterion = marks):
${rubricText}

Return EXACTLY a JSON object:
{
  "criteria": [{"criterion": "...", "marks": 2, "awarded": 1, "met": false, "comment": "..."}],
  "marksTotal": <sum of rubric marks>,
  "marksAwarded": <sum of awarded>,
  "feedback": "2-3 sentence summary",
  "missedPoints": ["..."]
}`,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
      responseMimeType: "application/json",
    },
  });

  let accumulated = "";
  let final: { text?: string; groundingMetadata?: unknown } | null = null;
  for await (const chunk of stream) {
    const text = (chunk as { text?: string }).text ?? "";
    accumulated += text;
    final = { text, groundingMetadata: (chunk as { groundingMetadata?: unknown }).groundingMetadata };
    if (text) yield { type: "text", text };
  }

  const evaluation = parseRubricEvaluation(final, rubric, totalMarks);
  yield {
    type: "done",
    marksAwarded: evaluation.marksAwarded,
    marksTotal: evaluation.marksTotal,
    feedback: evaluation.feedback,
    missedPoints: evaluation.missedPoints,
    rubricBreakdown: evaluation.criteria.map((c) => ({
      criterion: c.criterion,
      marksAwarded: c.awarded,
      marksTotal: c.marks,
      feedback: c.comment,
    })),
  };
}

function buildChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  opts: ChatStreamOptions = {}
): string {
  const mode = opts.mode ?? "answer";
  const lang = languageInstruction(opts.language);
  const tutorRule =
    mode === "tutor"
      ? `You are a Socratic tutor. Do NOT give the answer directly. Ask a short guiding question that helps the student arrive at the idea themselves. Only reveal the full answer if the student explicitly asks for it, admits they are stuck, or says "reveal". Keep it brief.`
      : "";

  const parts = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  return `${lang}${tutorRule}
You are a friendly study assistant answering from the textbook only. Be concise, cite pages, and do not use outside knowledge.

${parts}`;
}

function languageInstruction(lang: ReplyLanguage | undefined): string {
  switch (lang) {
    case "urdu":
      return "Reply in Urdu. ";
    case "sindhi":
      return "Reply in Sindhi. ";
    case "english":
      return "Reply in English. ";
    case "auto":
    default:
      return "";
  }
}

function finalAsResponse(r: { text?: string; groundingMetadata?: unknown } | null): unknown {
  if (!r) return {};
  return { text: r.text, groundingMetadata: r.groundingMetadata };
}

function parseGroundingCitations(final: { text?: string; groundingMetadata?: unknown } | null): Citation[] {
  return parseCitations(finalAsResponse(final));
}

function parseCitations(r: unknown): Citation[] {
  const raw = r as { groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndexes?: number[] }> } };
  const citations: Citation[] = [];
  if (raw.groundingMetadata?.groundingChunks && raw.groundingMetadata?.groundingSupports) {
    for (const support of raw.groundingMetadata.groundingSupports) {
      if (support.groundingChunkIndexes && support.segment?.text) {
        for (const idx of support.groundingChunkIndexes) {
          const chunk = raw.groundingMetadata.groundingChunks[idx];
          if (chunk?.web?.title) {
            const pageMatch = chunk.web.title.match(/p\.?\s*(\d+)/i);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 0;
            citations.push({
              page,
              filename: chunk.web.title,
              snippet: support.segment.text,
            });
          }
        }
      }
    }
  }
  return citations;
}

function parseRubricEvaluation(
  response: unknown,
  rubric: Array<{ criterion: string; marks: number }> | null | undefined,
  totalMarks: number
): RubricEvaluation {
  const r = response as { text?: string };
  let parsed: { criteria?: Array<{ criterion: string; marks: number; awarded: number; met: boolean; comment: string }>; marksAwarded?: number; marksTotal?: number; feedback?: string; missedPoints?: string[] } | null = null;
  try {
    parsed = JSON.parse(r.text ?? "{}");
  } catch {
    // Fall back to empty
  }

  const criteria = Array.isArray(parsed?.criteria) && parsed.criteria.length > 0
    ? parsed.criteria.map((c) => ({
      criterion: c.criterion ?? "Unknown",
      marks: c.marks ?? 0,
      awarded: Math.max(0, Math.min(c.awarded ?? 0, c.marks ?? 0)),
      met: c.met === true,
      comment: c.comment ?? "",
    }))
    : (rubric ?? []).map((c) => ({ criterion: c.criterion, marks: c.marks, awarded: 0, met: false, comment: "" }));

  const realTotal = criteria.reduce((a, c) => a + c.marks, 0) || totalMarks;
  const awarded = parsed?.marksAwarded != null ? parsed.marksAwarded : criteria.reduce((a, c) => a + c.awarded, 0);

  return {
    criteria,
    marksAwarded: Math.max(0, Math.min(awarded, realTotal)),
    marksTotal: realTotal,
    feedback: parsed?.feedback ?? "Evaluation complete.",
    missedPoints: parsed?.missedPoints ?? [],
    citations: parseCitations(response),
  };
}

function parseExplanationResponse(response: unknown): ExplainResponse {
  const r = response as { text?: string; groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndexes?: number[] }> } };
  const text = r.text || "";
  const citations: Citation[] = [];

  if (r.groundingMetadata?.groundingChunks && r.groundingMetadata?.groundingSupports) {
    for (const support of r.groundingMetadata.groundingSupports) {
      if (support.groundingChunkIndexes && support.segment?.text) {
        for (const idx of support.groundingChunkIndexes) {
          const chunk = r.groundingMetadata.groundingChunks[idx];
          if (chunk?.web?.title) {
            const pageMatch = chunk.web.title.match(/p\.?\s*(\d+)/i);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 0;
            citations.push({
              page,
              filename: chunk.web.title,
              snippet: support.segment.text,
            });
          }
        }
      }
    }
  }

  return { explanation: text, citations };
}

function parseVerificationResponse(response: unknown): VerificationResponse {
  const r = response as { text?: string; groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndexes?: number[] }> } };
  const text = r.text || "";

  let aiAnswer = text;
  let sourcePage: number | null = null;
  let sourceFilename: string | null = null;
  let confidence: number | null = null;

  if (r.groundingMetadata?.groundingChunks && r.groundingMetadata?.groundingSupports) {
    for (const support of r.groundingMetadata.groundingSupports) {
      if (support.groundingChunkIndexes && support.segment?.text) {
        for (const idx of support.groundingChunkIndexes) {
          const chunk = r.groundingMetadata.groundingChunks[idx];
          if (chunk?.web?.title) {
            const pageMatch = chunk.web.title.match(/p\.?\s*(\d+)/i);
            sourcePage = pageMatch ? parseInt(pageMatch[1], 10) : null;
            sourceFilename = chunk.web.title;
            break;
          }
        }
      }
    }
  }

  const confMatch = text.match(/confidence[:\s]+(\d+)/i);
  if (confMatch) {
    confidence = parseInt(confMatch[1], 10);
  }

  return { aiAnswer, sourcePage, sourceFilename, confidence };
}

function parseGeneratedQuestions(response: unknown): GeneratedQuestion[] {
  const r = response as { text?: string };
  const text = r.text || "[]";
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((q) => ({
        question: q.question || "",
        options: q.options,
        correctOption: q.correctOption,
        modelAnswer: q.modelAnswer,
        sourcePage: q.sourcePage || 0,
        explanation: q.explanation,
      }));
    }
  } catch {
    // If JSON parsing fails, return empty array
  }
  return [];
}

function parseGradingResponse(response: unknown, maxMarks: number): GradingSuggestion {
  const r = response as { text?: string; groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndexes?: number[] }> } };
  const text = r.text || "";

  let marksAwarded = 0;
  const marksMatch = text.match(/(\d+)\s*\/\s*\d+/);
  if (marksMatch) {
    marksAwarded = Math.min(parseInt(marksMatch[1], 10), maxMarks);
  } else {
    const altMatch = text.match(/marks?[:\s]+(\d+)/i);
    if (altMatch) {
      marksAwarded = Math.min(parseInt(altMatch[1], 10), maxMarks);
    }
  }

  const citations: Citation[] = [];
  if (r.groundingMetadata?.groundingChunks && r.groundingMetadata?.groundingSupports) {
    for (const support of r.groundingMetadata.groundingSupports) {
      if (support.groundingChunkIndexes && support.segment?.text) {
        for (const idx of support.groundingChunkIndexes) {
          const chunk = r.groundingMetadata.groundingChunks[idx];
          if (chunk?.web?.title) {
            const pageMatch = chunk.web.title.match(/p\.?\s*(\d+)/i);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 0;
            citations.push({
              page,
              filename: chunk.web.title,
              snippet: support.segment.text,
            });
          }
        }
      }
    }
  }

  const missedPoints: string[] = [];
  const missedSection = text.split(/missed|missing|not covered/i)[1];
  if (missedSection) {
    const lines = missedSection.split(/[\n\.\-]/).filter((l) => l.trim().length > 10);
    missedPoints.push(...lines.slice(0, 5).map((l) => l.trim()));
  }

  return {
    marksAwarded,
    feedback: text,
    missedPoints,
    citations,
  };
}

function parseChatResponse(response: unknown): ChatResponse {
  const r = response as { text?: string; groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndexes?: number[] }> } };
  const text = r.text || "";
  const citations: Citation[] = [];

  if (r.groundingMetadata?.groundingChunks && r.groundingMetadata?.groundingSupports) {
    for (const support of r.groundingMetadata.groundingSupports) {
      if (support.groundingChunkIndexes && support.segment?.text) {
        for (const idx of support.groundingChunkIndexes) {
          const chunk = r.groundingMetadata.groundingChunks[idx];
          if (chunk?.web?.title) {
            const pageMatch = chunk.web.title.match(/p\.?\s*(\d+)/i);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 0;
            citations.push({
              page,
              filename: chunk.web.title,
              snippet: support.segment.text,
            });
          }
        }
      }
    }
  }

  return { content: text, citations };
}

export interface DailyStudyData {
  minutes: number;
  questionsSolved: number;
  questionsAdded: number;
  testsTaken: number;
  flashcardsReviewed: number;
  revisionsCompleted: number;
  accuracy: number | null; // 0..1, null if no graded attempts
  weakTopic: string | null; // e.g. "Virtual Memory (42% accuracy)"
}

/**
 * One-shot daily study summary (dashboard widget). Plain prompt, no
 * file search — data in, short paragraph out. Intentionally cheap.
 */
export async function generateDailySummary(data: DailyStudyData, opts: { language?: ReplyLanguage } = {}): Promise<string> {
  const client = getGeminiClient();
  const lang = languageInstruction(opts.language);

  const track = [
    data.minutes > 0 ? `Studied ${data.minutes} minutes` : "No study time logged",
    `${data.questionsSolved} questions solved`,
    `${data.questionsAdded} questions added`,
    `${data.testsTaken} test(s) taken`,
    `${data.flashcardsReviewed} flashcards reviewed`,
    `${data.revisionsCompleted} revision(s) completed`,
    data.accuracy != null ? `${Math.round(data.accuracy * 100)}% overall accuracy (graded)` : "no graded attempts",
  ].join(", ");

  const weakLine = data.weakTopic ? ` Weak spot: ${data.weakTopic}.` : "";

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${lang}Write ONE short paragraph (3-4 sentences) summarizing today's study session for a student. Include what they studied, how it went, one encouraging note, and one concrete recommendation for tomorrow. Be warm but concise. Do not invent numbers.

Today's raw data — ${track}.${weakLine}`,
  });

  return (response as { text?: string }).text?.trim() || "No summary available today.";
}

/*
 * ===================================================================
 * RAG-POWERED AI FUNCTIONS (FROZEN — see MIGRATION_PLAN.md Option B)
 * ===================================================================
 * The following functions (explainFromBookRAG, chatWithBookRAG,
 * streamChatWithBookRAG, streamExplainFromBookRAG, generateQuestionsRAG)
 * used the custom pgvector/embeddings RAG pipeline and were only ever
 * called by routes/ai-rag.ts (now deleted).
 *
 * The LIVE textbook AI path uses Gemini File Search directly — see
 * routes/ai-bookstore.ts + the createBookStore/uploadToFileSearchStore/
 * checkIndexingStatus helpers above.
 *
 * To revive Option B (custom pgvector):
 *   1. Re-enable the rag-* exports in lib/textbooks/src/index.ts
 *   2. Uncomment the dead functions below
 *   3. Uncomment the import of searchTextbookChunks/SearchResult above
 *   4. Re-create and mount routes/ai-rag.ts
 *   5. Start jobs/rag-processor-job.ts (or re-import it in index.ts)
 */
