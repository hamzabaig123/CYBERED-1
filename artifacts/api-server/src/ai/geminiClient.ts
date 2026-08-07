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
  const client = getGeminiClient();
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: new Blob([Buffer.from(fileBytes)]),
    fileSearchStoreName,
    config: { displayName },
  });
  return operation.name ?? "";
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
  questionText: string
): Promise<ExplainResponse> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Explain this in the style of a textbook answer, citing the page it comes from: ${questionText}`,
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
  topicFocus?: string
): Promise<GeneratedQuestion[]> {
  const client = getGeminiClient();
  let prompt = `Generate ${count} ${questionType} questions from pages ${pageRange} of this textbook, with answers and page citations. `;
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
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ChatResponse> {
  const client = getGeminiClient();
  const contents = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
    },
  });

  return parseChatResponse(response);
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