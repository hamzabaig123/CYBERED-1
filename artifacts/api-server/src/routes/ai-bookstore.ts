import { Router, type IRouter } from "express";
import { db, bookStoresTable, subjectsTable, chaptersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetSubjectParams,
  CreateBookStoreParams,
  CreateBookStoreBody,
  IndexBookBody,
  GetBookStoreStatusParams,
} from "@workspace/api-zod";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { createBookStore, uploadToFileSearchStore, checkIndexingStatus } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// GET /subjects/:subjectId/book-store - Get book store status for a subject
router.get("/subjects/:subjectId/book-store", requireAuth, async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, params.data.subjectId));

  if (!store) {
    res.json({ store: null, status: "not_created" });
    return;
  }

  res.json({ store, status: store.status });
});

// POST /subjects/:subjectId/book-store - Create a new book store for a subject
router.post("/subjects/:subjectId/book-store", requireEditor, async (req, res): Promise<void> => {
  const params = CreateBookStoreParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateBookStoreBody.safeParse(req.body);
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

  const [existing] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, params.data.subjectId));

  if (existing) {
    res.status(409).json({ error: "Book store already exists for this subject" });
    return;
  }

  try {
    const geminiStoreName = await createBookStore(subject.name);
    
    const [store] = await db
      .insert(bookStoresTable)
      .values({
        subjectId: params.data.subjectId,
        geminiStoreName,
        textbookTitle: body.data.textbookTitle,
        status: "ready",
      })
      .returning();

    await writeAudit(req, { 
      action: "CREATE_BOOK_STORE", 
      entityType: "book_store", 
      entityId: store.id,
      detail: `Created book store for subject ${subject.name}` 
    });

    res.status(201).json(store);
  } catch (error) {
    console.error("Error creating book store:", error);
    res.status(500).json({ error: "Failed to create book store" });
  }
});

// POST /subjects/:subjectId/book-store/index - Upload and index a textbook
router.post("/subjects/:subjectId/book-store/index", requireEditor, async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse({ subjectId: parseId(req.params.subjectId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = IndexBookBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(eq(bookStoresTable.subjectId, params.data.subjectId));

  if (!store) {
    res.status(404).json({ error: "Book store not found. Create one first." });
    return;
  }

  if (!body.data.licenseConfirmed) {
    res.status(400).json({ error: "License confirmation required" });
    return;
  }

  // In a real implementation, you would download the file from storage
  // For now, we'll simulate with the provided text content
  const fileBytes = new TextEncoder().encode(body.data.textbookContent);
  
  try {
    await db
      .update(bookStoresTable)
      .set({ status: "pending", textbookTitle: body.data.bookTitle })
      .where(eq(bookStoresTable.id, store.id));

    const operationName = await uploadToFileSearchStore(
      store.geminiStoreName,
      fileBytes,
      body.data.fileName
    );

    // In production, you'd poll the operation status in a background job
    // For now, we'll mark as ready immediately
    await db
      .update(bookStoresTable)
      .set({ 
        status: "ready", 
        indexedPages: body.data.textbookContent.split("\n").length,
        textbookTitle: body.data.bookTitle 
      })
      .where(eq(bookStoresTable.id, store.id));

    await writeAudit(req, { 
      action: "INDEX_BOOK", 
      entityType: "book_store", 
      entityId: store.id,
      detail: `Indexed ${body.data.fileName} for subject` 
    });

    const [updated] = await db
      .select()
      .from(bookStoresTable)
      .where(eq(bookStoresTable.id, store.id));

    res.json({ store: updated, operationName });
  } catch (error) {
    console.error("Error indexing book:", error);
    await db
      .update(bookStoresTable)
      .set({ status: "error", errorMessage: error instanceof Error ? error.message : "Unknown error" })
      .where(eq(bookStoresTable.id, store.id));
    res.status(500).json({ error: "Failed to index book" });
  }
});

// GET /book-stores/:storeId/indexing-status - Check indexing operation status
router.get("/book-stores/:storeId/indexing-status", requireAuth, async (req, res): Promise<void> => {
  const params = GetBookStoreStatusParams.safeParse({ storeId: parseId(req.params.storeId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const operationName = req.query.operationName as string;
  if (!operationName) {
    res.status(400).json({ error: "operationName query parameter required" });
    return;
  }

  try {
    const status = await checkIndexingStatus(operationName);
    res.json(status);
  } catch (error) {
    console.error("Error checking indexing status:", error);
    res.status(500).json({ error: "Failed to check indexing status" });
  }
});

export default router;