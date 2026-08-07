import { Router, type IRouter } from "express";
import { db, fileAssetsTable, subjectsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  ListSubjectAssetsParams,
  AnswerFromBookParams,
  AnswerFromBookBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { getStorage, findRelevantPages, parsePages } from "@workspace/textbooks";
import { answerFromExcerpt } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /books/:subjectId/assets - List stored file assets for a subject
router.get("/books/:subjectId/assets", requireAuth, async (req, res): Promise<void> => {
  const params = ListSubjectAssetsParams.safeParse({
    subjectId: parseId(req.params.subjectId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.subjectId, params.data.subjectId))
    .orderBy(desc(fileAssetsTable.id));

  res.json({ assets });
});

// POST /books/:subjectId/answer - Answer an MCQ/plain question using the textbook
router.post("/books/:subjectId/answer", requireAuth, async (req, res): Promise<void> => {
  const params = AnswerFromBookParams.safeParse({
    subjectId: parseId(req.params.subjectId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AnswerFromBookBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, params.data.subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(
      and(
        eq(fileAssetsTable.subjectId, params.data.subjectId),
        eq(fileAssetsTable.isTextbook, true),
        eq(fileAssetsTable.processingStatus, "done"),
      ),
    )
    .orderBy(desc(fileAssetsTable.id))
    .limit(1);

  if (!asset || !asset.fullTextKey) {
    res.status(404).json({ error: "No processed textbook found for this subject" });
    return;
  }

  let fullText: string;
  try {
    fullText = (await getStorage().getObject(asset.fullTextKey)).toString("utf8");
  } catch (err) {
    res.status(500).json({
      error: `Failed to read textbook text: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  const relevant = findRelevantPages(fullText, body.data.question);

  if (relevant.pages.length === 0) {
    res.status(404).json({
      error: "No matching content found in the textbook",
      sourcePages: [],
      citations: [],
    });
    return;
  }

  try {
    const { text: answer } = await answerFromExcerpt(
      relevant.text,
      body.data.question,
      body.data.options,
    );

    const excerptPages = parsePages(relevant.text);
    const citations = relevant.pages.map((page) => ({
      page,
      snippet: excerptPages.find((c) => c.page === page)?.text.slice(0, 300) ?? null,
    }));

    await writeAudit(req, {
      action: "ANSWER_FROM_BOOK",
      entityType: "file_asset",
      entityId: asset.id,
      detail: `Answered question for subject #${params.data.subjectId} (pages ${relevant.pages.join(", ")})`,
    });

    res.json({ answer, sourcePages: relevant.pages, citations });
  } catch (err) {
    console.error("Error generating answer from book:", err);
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

export default router;
