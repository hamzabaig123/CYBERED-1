import { Router, type IRouter } from "express";
import { db, fileAssetsTable, subjectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { getStorage, findRelevantPages } from "@workspace/textbooks";
import { requireAuth } from "../middlewares/auth";
import { answerFromExcerpt } from "../ai/geminiClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const AnswerFromBookBody = z.object({
  question: z.string().min(3).max(2000),
  options: z.record(z.string(), z.string()).optional(),
});

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return Number(s);
}

// GET /books/:subjectId - List textbooks ingested for a subject
router.get("/books/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = parseId(req.params.subjectId);
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(and(eq(fileAssetsTable.subjectId, subjectId), eq(fileAssetsTable.isTextbook, true)))
    .orderBy(desc(fileAssetsTable.id));

  res.json({ books: assets });
});

// POST /books/:subjectId/answer - Answer a question from the subject's textbook
router.post("/books/:subjectId/answer", requireAuth, async (req, res): Promise<void> => {
  const subjectId = parseId(req.params.subjectId);
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const body = AnswerFromBookBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(
      and(
        eq(fileAssetsTable.subjectId, subjectId),
        eq(fileAssetsTable.isTextbook, true),
        eq(fileAssetsTable.processingStatus, "done"),
      ),
    )
    .orderBy(desc(fileAssetsTable.id));

  if (!asset?.fullTextKey) {
    res.status(404).json({ error: "No processed textbook found for this subject" });
    return;
  }

  // An MCQ is answered better when the options are searchable too.
  const optionText = body.data.options ? Object.values(body.data.options).join(" ") : "";
  const searchQuery = `${body.data.question} ${optionText}`.trim();

  let fullText: string;
  try {
    fullText = (await getStorage().getObject(asset.fullTextKey)).toString("utf8");
  } catch (err) {
    logger.error({ err, assetId: asset.id }, "Failed to read textbook text from storage");
    res.status(500).json({ error: "Failed to read textbook text" });
    return;
  }

  const relevant = findRelevantPages(fullText, searchQuery);
  if (relevant.pages.length === 0) {
    res.status(404).json({
      error: "No relevant textbook passage found for this question",
      bookId: asset.id,
    });
    return;
  }

  const prompt = body.data.options
    ? `${body.data.question}\nOptions:\n${Object.entries(body.data.options)
        .map(([k, v]) => `${k}. ${v}`)
        .join("\n")}`
    : body.data.question;

  try {
    const answer = await answerFromExcerpt(relevant.text, prompt);
    res.json({
      answer,
      pages: relevant.pages,
      bookId: asset.id,
      filename: asset.originalFilename,
      topPages: relevant.scores.slice(0, 5),
    });
  } catch (err) {
    logger.error({ err, assetId: asset.id }, "Failed to answer from book");
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

// POST /books/:subjectId/search - Keyword search only, no LLM (for spot-checking)
router.post("/books/:subjectId/search", requireAuth, async (req, res): Promise<void> => {
  const subjectId = parseId(req.params.subjectId);
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const body = AnswerFromBookBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(
      and(
        eq(fileAssetsTable.subjectId, subjectId),
        eq(fileAssetsTable.isTextbook, true),
        eq(fileAssetsTable.processingStatus, "done"),
      ),
    )
    .orderBy(desc(fileAssetsTable.id));

  if (!asset?.fullTextKey) {
    res.status(404).json({ error: "No processed textbook found for this subject" });
    return;
  }

  let fullText: string;
  try {
    fullText = (await getStorage().getObject(asset.fullTextKey)).toString("utf8");
  } catch (err) {
    logger.error({ err, assetId: asset.id }, "Failed to read textbook text from storage");
    res.status(500).json({ error: "Failed to read textbook text" });
    return;
  }

  const optionText = body.data.options ? Object.values(body.data.options).join(" ") : "";
  const relevant = findRelevantPages(fullText, `${body.data.question} ${optionText}`.trim());

  res.json({
    bookId: asset.id,
    pages: relevant.pages,
    excerpt: relevant.text,
    topPages: relevant.scores.slice(0, 10),
  });
});

export default router;
