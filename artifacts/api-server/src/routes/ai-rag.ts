/**
 * RAG-powered AI endpoints
 * These endpoints use textbook chunks with embeddings instead of Gemini File Search
 */

import { Router, type IRouter } from "express";
import { db, fileAssetsTable, questionsTable, sectionsTable, chaptersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  explainFromBookRAG,
  streamExplainFromBookRAG,
  chatWithBookRAG,
  streamChatWithBookRAG,
  generateQuestionsRAG,
} from "../ai/geminiClient";
import { searchTextbookChunks } from "@workspace/textbooks";
import { getGeminiClient } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

/**
 * Check if a subject has RAG-indexed content
 */
async function hasRAGContent(subjectId: number): Promise<boolean> {
  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(and(
      eq(fileAssetsTable.subjectId, subjectId),
      eq(fileAssetsTable.embeddingsGenerated, true)
    ))
    .limit(1);
  
  return !!asset;
}

// POST /ai/rag/explain - Explain using RAG
router.post("/ai/rag/explain", requireAuth, async (req, res): Promise<void> => {
  const { questionText, subjectId, questionId, language } = req.body;

  if (!questionText) {
    res.status(400).json({ error: "questionText is required" });
    return;
  }

  let finalSubjectId = subjectId;

  // Get subject from question if not provided
  if (!finalSubjectId && questionId) {
    const [question] = await db
      .select({ subjectId: chaptersTable.subjectId })
      .from(questionsTable)
      .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
      .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
      .where(eq(questionsTable.id, questionId));

    if (question) {
      finalSubjectId = question.subjectId;
    }
  }

  if (!finalSubjectId) {
    res.status(400).json({ error: "subjectId or questionId required" });
    return;
  }

  // Check if RAG content available
  const hasContent = await hasRAGContent(finalSubjectId);
  if (!hasContent) {
    res.status(400).json({ error: "No RAG-indexed content available for this subject. Please wait for indexing to complete." });
    return;
  }

  try {
    const result = await explainFromBookRAG(finalSubjectId, questionText, { language });
    
    await writeAudit(req, {
      action: "AI_RAG_EXPLAIN",
      entityType: "ai_explanation",
      entityId: questionId,
      detail: `RAG explanation for subject ${finalSubjectId}`,
    });

    res.json({
      explanation: result.explanation,
      citations: result.citations,
      subjectId: finalSubjectId,
      method: "rag",
    });
  } catch (error) {
    console.error("Error generating RAG explanation:", error);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

// POST /ai/rag/explain/stream - Stream RAG explanation
router.post("/ai/rag/explain/stream", requireAuth, async (req, res): Promise<void> => {
  const { questionText, subjectId, questionId, language } = req.body;

  if (!questionText) {
    res.status(400).json({ error: "questionText is required" });
    return;
  }

  let finalSubjectId = subjectId;

  if (!finalSubjectId && questionId) {
    const [question] = await db
      .select({ subjectId: chaptersTable.subjectId })
      .from(questionsTable)
      .innerJoin(sectionsTable, eq(questionsTable.sectionId, sectionsTable.id))
      .innerJoin(chaptersTable, eq(sectionsTable.chapterId, chaptersTable.id))
      .where(eq(questionsTable.id, questionId));

    if (question) {
      finalSubjectId = question.subjectId;
    }
  }

  if (!finalSubjectId) {
    res.status(400).json({ error: "subjectId or questionId required" });
    return;
  }

  const hasContent = await hasRAGContent(finalSubjectId);
  if (!hasContent) {
    res.status(400).json({ error: "No RAG-indexed content available" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const chunk of streamExplainFromBookRAG(finalSubjectId, questionText, { language })) {
      if (chunk.type === "text") {
        writeEvent({ type: "text", text: chunk.text });
      } else if (chunk.type === "done") {
        writeEvent({
          type: "done",
          explanation: chunk.explanation,
          citations: chunk.citations,
          subjectId: finalSubjectId,
          method: "rag",
        });
      }
    }
    res.end();
  } catch (error) {
    console.error("Error streaming RAG explanation:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream explanation" });
      return;
    }
    writeEvent({ type: "error", message: "Stream interrupted" });
    res.end();
  }
});

// POST /ai/rag/chat - Chat using RAG
router.post("/ai/rag/chat", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, messages, mode, language } = req.body;

  if (!subjectId || !messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "subjectId and messages array required" });
    return;
  }

  const hasContent = await hasRAGContent(subjectId);
  if (!hasContent) {
    res.status(400).json({ error: "No RAG-indexed content available" });
    return;
  }

  try {
    const result = await chatWithBookRAG(subjectId, messages, { mode, language });
    
    await writeAudit(req, {
      action: "AI_RAG_CHAT",
      entityType: "ai_chat",
      entityId: subjectId,
      detail: `RAG chat for subject ${subjectId}`,
    });

    res.json({
      content: result.content,
      citations: result.citations,
      method: "rag",
    });
  } catch (error) {
    console.error("Error in RAG chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// POST /ai/rag/chat/stream - Stream RAG chat
router.post("/ai/rag/chat/stream", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, messages, mode, language } = req.body;

  if (!subjectId || !messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "subjectId and messages array required" });
    return;
  }

  const hasContent = await hasRAGContent(subjectId);
  if (!hasContent) {
    res.status(400).json({ error: "No RAG-indexed content available" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const chunk of streamChatWithBookRAG(subjectId, messages, { mode, language })) {
      if (chunk.type === "text") {
        writeEvent({ type: "text", text: chunk.text });
      } else if (chunk.type === "done") {
        writeEvent({ type: "done", citations: chunk.citations, method: "rag" });
      }
    }
    res.end();
  } catch (error) {
    console.error("Error streaming RAG chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream chat" });
      return;
    }
    writeEvent({ type: "error", message: "Stream interrupted" });
    res.end();
  }
});

// POST /ai/rag/search - Direct chunk search endpoint
router.post("/ai/rag/search", requireAuth, async (req, res): Promise<void> => {
  const { query, subjectId, topK = 5, minScore = 0.3 } = req.body;

  if (!query || !subjectId) {
    res.status(400).json({ error: "query and subjectId required" });
    return;
  }

  try {
    const geminiClient = getGeminiClient();
    const results = await searchTextbookChunks(query, geminiClient, {
      subjectId,
      topK,
      minScore,
    });

    res.json({ results, count: results.length });
  } catch (error) {
    console.error("Error searching chunks:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /ai/rag/status/:subjectId - Check RAG indexing status for a subject
router.get("/ai/rag/status/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = parseInt(req.params.subjectId, 10);

  if (isNaN(subjectId)) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const assets = await db
    .select({
      id: fileAssetsTable.id,
      filename: fileAssetsTable.originalFilename,
      chunksCount: fileAssetsTable.chunksCount,
      embeddingsGenerated: fileAssetsTable.embeddingsGenerated,
      ragIndexedAt: fileAssetsTable.ragIndexedAt,
      processingStatus: fileAssetsTable.processingStatus,
    })
    .from(fileAssetsTable)
    .where(and(
      eq(fileAssetsTable.subjectId, subjectId),
      eq(fileAssetsTable.isTextbook, true)
    ));

  const ragReady = assets.some(a => a.embeddingsGenerated);
  const totalChunks = assets.reduce((sum, a) => sum + (a.chunksCount || 0), 0);

  res.json({
    subjectId,
    ragReady,
    totalChunks,
    textbooks: assets,
  });
});

export default router;
