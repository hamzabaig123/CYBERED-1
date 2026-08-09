import { Router, type IRouter } from "express";
import { db, bookStoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { evaluateAnswerWithRubric, streamEvaluateAnswer } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

interface EvaluateRubricBody {
  subjectId: number;
  question: string;
  studentAnswer: string;
  rubric?: Array<{ criterion: string; marks: number }> | null;
  totalMarks?: number;
  language?: "auto" | "english" | "urdu" | "sindhi";
}

// POST /ai/evaluate - Grade a written answer against an optional structured rubric
router.post("/ai/evaluate", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as EvaluateRubricBody;

  if (!body || !body.subjectId || !body.question || !body.studentAnswer) {
    res.status(400).json({ error: "subjectId, question, and studentAnswer are required" });
    return;
  }

  const invalidRubric =
    Array.isArray(body.rubric) &&
    body.rubric.some((c) => !c.criterion || typeof c.marks !== "number" || c.marks < 0);
  if (Array.isArray(body.rubric) && (body.rubric.length < 1 || invalidRubric)) {
    res.status(400).json({ error: "Rubric must be a non-empty array of {criterion, marks}" });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, body.subjectId));

  if (!store) {
    res.status(404).json({ error: "Book store not found for this subject" });
    return;
  }

  if (store.status !== "ready") {
    res.status(400).json({ error: "Book store not ready for queries" });
    return;
  }

  try {
    const result = await evaluateAnswerWithRubric(
      store.geminiStoreName,
      body.question,
      body.studentAnswer,
      Array.isArray(body.rubric) && body.rubric.length > 0 ? body.rubric : null,
      body.totalMarks ?? 0,
      { language: ["english", "urdu", "sindhi", "auto"].includes(body.language ?? "") ? body.language : "auto" }
    );

    await writeAudit(req, {
      action: "AI_EVALUATE_ANSWER",
      entityType: "ai_evaluation",
      entityId: null,
      detail: `Rubric evaluation for subject ${body.subjectId}`,
    });

    res.json(result);
  } catch (error) {
    console.error("Error evaluating answer:", error);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

// POST /ai/evaluate/stream - Stream grading of a written answer with SSE
router.post("/ai/evaluate/stream", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as EvaluateRubricBody;

  if (!body || !body.subjectId || !body.question || !body.studentAnswer) {
    res.status(400).json({ error: "subjectId, question, and studentAnswer are required" });
    return;
  }

  const invalidRubric =
    Array.isArray(body.rubric) &&
    body.rubric.some((c) => !c.criterion || typeof c.marks !== "number" || c.marks < 0);
  if (Array.isArray(body.rubric) && (body.rubric.length < 1 || invalidRubric)) {
    res.status(400).json({ error: "Rubric must be a non-empty array of {criterion, marks}" });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, body.subjectId));

  if (!store) {
    res.status(404).json({ error: "Book store not found for this subject" });
    return;
  }

  if (store.status !== "ready") {
    res.status(400).json({ error: "Book store not ready for queries" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let feedbackText = "";
    for await (const chunk of streamEvaluateAnswer(
      store.geminiStoreName,
      body.question,
      body.studentAnswer,
      Array.isArray(body.rubric) && body.rubric.length > 0 ? body.rubric : null,
      body.totalMarks ?? 0,
      { language: ["english", "urdu", "sindhi", "auto"].includes(body.language ?? "") ? body.language : "auto" }
    )) {
      if (chunk.type === "text") {
        feedbackText += chunk.text;
        writeEvent({ type: "text", text: chunk.text });
      } else if (chunk.type === "done") {
        await writeAudit(req, {
          action: "AI_EVALUATE_ANSWER",
          entityType: "ai_evaluation",
          entityId: null,
          detail: `Streamed rubric evaluation for subject ${body.subjectId}`,
        });

        writeEvent({
          type: "done",
          marksAwarded: chunk.marksAwarded,
          marksTotal: chunk.marksTotal,
          feedback: chunk.feedback ?? feedbackText,
          missedPoints: chunk.missedPoints,
          rubricBreakdown: chunk.rubricBreakdown,
        });
      }
    }
    res.end();
  } catch (error) {
    console.error("Error streaming evaluation:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to evaluate answer" });
      return;
    }
    writeEvent({ type: "error", message: "Stream interrupted. Please try again." });
    res.end();
  }
});

export default router;