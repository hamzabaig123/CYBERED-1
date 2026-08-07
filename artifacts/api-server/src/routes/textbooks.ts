import { Router, type IRouter } from "express";
import { db, fileAssetsTable, subjectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { AnswerFromBookBody } from "@workspace/api-zod";
import { getStorage, findRelevantPages, parsePages } from "@workspace/textbooks";
import { requireAuth } from "../middlewares/auth";
import { answerFromExcerpt } from "../ai/geminiClient";
import { logger } from "../lib/logger";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return Number(s);
}

// GET /books/:subjectId/assets - List stored file assets for a subject
router.get("/books/:subjectId/assets", requireAuth, async (req, res): Promise<void> => {
  const subjectId = parseId(req.params.subjectId);
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    res.status(400).json({ error: "Invalid subjectId" });
    return;
  }

  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.subjectId, subjectId))
    .orderBy(desc(fileAssetsTable.id));

  res.json({ assets });
});

// POST /books/:subjectId/answer - Answer a question using the subject's textbook
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
    .orderBy(desc(fileAssetsTable.id))
    .limit(1);

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

  // Searching the option text alongside the stem finds the right page far more
  // often for MCQs, where the stem alone is frequently too generic.
  const options = body.data.options;
  const optionText = options ? Object.values(options).join(" ") : "";
  const relevant = findRelevantPages(fullText, `${body.data.question} ${optionText}`.trim());

  if (relevant.pages.length === 0) {
    res.status(404).json({ error: "No relevant textbook passage found for this question" });
    return;
  }

  try {
    const answer = await answerFromExcerpt(relevant.text, body.data.question, options);
    const chunks = parsePages(relevant.text);

    await writeAudit(req, {
      action: "ANSWER_FROM_BOOK",
      entityType: "file_asset",
      entityId: asset.id,
      detail: `Answered question for subject #${subjectId} (pages ${relevant.pages.join(", ")})`,
    });

    res.json({
      answer: answer.text,
      sourcePages: relevant.pages,
      citations: chunks.map((chunk) => ({
        page: chunk.page,
        snippet: chunk.text.slice(0, 400),
      })),
    });
  } catch (err) {
    logger.error({ err, assetId: asset.id }, "Failed to answer from book");
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

export default router;
