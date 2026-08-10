import { Router, type IRouter } from "express";
import { db, documentsTable, documentPagesTable, documentChunksTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireEditor } from "../middlewares/auth";
import multer from "multer";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const router: IRouter = Router();

// Helper to parse numeric path param
function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// Configure multer for PDF uploads
const uploadDir = process.env.FILE_STORAGE_DIR || join(process.cwd(), 'data', 'documents');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PPT, and DOC files are allowed.'));
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Documents - PDF and other file attachments
// ═══════════════════════════════════════════════════════════════════════════

// GET /documents?topicId=X or /documents?noteId=Y
router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  try {
    const { topicId, noteId, includeArchived } = req.query;
    
    if (!topicId && !noteId) {
      res.status(400).json({ error: "Either topicId or noteId is required" });
      return;
    }

    const conditions: any[] = [];
    
    if (topicId) {
      conditions.push(eq(documentsTable.topicId, parseInt(topicId as string)));
    }
    
    if (noteId) {
      conditions.push(eq(documentsTable.noteId, parseInt(noteId as string)));
    }

    if (includeArchived !== 'true') {
      conditions.push(eq(documentsTable.isArchived, false));
    }

    const rows = await db
      .select({
        id: documentsTable.id,
        topicId: documentsTable.topicId,
        noteId: documentsTable.noteId,
        title: documentsTable.title,
        fileName: documentsTable.fileName,
        storageKey: documentsTable.storageKey,
        mimeType: documentsTable.mimeType,
        fileSize: documentsTable.fileSize,
        pageCount: documentsTable.pageCount,
        isProcessed: documentsTable.isProcessed,
        isArchived: documentsTable.isArchived,
        uploadedBy: documentsTable.uploadedBy,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
      })
      .from(documentsTable)
      .where(and(...conditions))
      .orderBy(desc(documentsTable.createdAt));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /topics/:topicId/documents - Upload document to topic
router.post("/topics/:topicId/documents", requireAuth, upload.single('file'), async (req, res): Promise<void> => {
  try {
    const topicId = parseId(req.params.topicId);
    const userId = (req as any).user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { title } = req.body;

    const [row] = await db
      .insert(documentsTable)
      .values({
        topicId,
        noteId: null,
        title: title || file.originalname,
        fileName: file.originalname,
        storageKey: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: userId || null,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST /notes/:noteId/documents - Upload document to note
router.post("/notes/:noteId/documents", requireAuth, upload.single('file'), async (req, res): Promise<void> => {
  try {
    const noteId = parseId(req.params.noteId);
    const userId = (req as any).user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { title } = req.body;

    const [row] = await db
      .insert(documentsTable)
      .values({
        topicId: null,
        noteId,
        title: title || file.originalname,
        fileName: file.originalname,
        storageKey: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: userId || null,
      })
      .returning();

    res.status(201).json(row);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /documents/:documentId
router.get("/documents/:documentId", requireAuth, async (req, res): Promise<void> => {
  try {
    const documentId = parseId(req.params.documentId);

    const [row] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId));

    if (!row) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Get page count if processed
    if (row.isProcessed) {
      const [pageInfo] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentPagesTable)
        .where(eq(documentPagesTable.documentId, documentId));

      res.json({ ...row, actualPageCount: pageInfo?.count || 0 });
    } else {
      res.json(row);
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// PATCH /documents/:documentId
router.patch("/documents/:documentId", requireAuth, async (req, res): Promise<void> => {
  try {
    const documentId = parseId(req.params.documentId);
    const { title, isProcessed } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (isProcessed !== undefined) updates.isProcessed = isProcessed;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db
      .update(documentsTable)
      .set(updates)
      .where(eq(documentsTable.id, documentId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// PATCH /documents/:documentId/archive
router.patch("/documents/:documentId/archive", requireEditor, async (req, res): Promise<void> => {
  try {
    const documentId = parseId(req.params.documentId);

    const [row] = await db
      .update(documentsTable)
      .set({ isArchived: true })
      .where(eq(documentsTable.id, documentId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error('Error archiving document:', error);
    res.status(500).json({ error: 'Failed to archive document' });
  }
});

// DELETE /documents/:documentId
router.delete("/documents/:documentId", requireEditor, async (req, res): Promise<void> => {
  try {
    const documentId = parseId(req.params.documentId);

    const [row] = await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // TODO: Also delete the physical file from storage

    res.json({ message: "Document deleted successfully", document: row });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /documents/:documentId/pages - Get all pages
router.get("/documents/:documentId/pages", requireAuth, async (req, res): Promise<void> => {
  try {
    const documentId = parseId(req.params.documentId);

    const pages = await db
      .select()
      .from(documentPagesTable)
      .where(eq(documentPagesTable.documentId, documentId))
      .orderBy(documentPagesTable.pageNumber);

    res.json(pages);
  } catch (error) {
    console.error('Error fetching document pages:', error);
    res.status(500).json({ error: 'Failed to fetch document pages' });
  }
});

// POST /documents/search - Full-text search across documents
router.post("/documents/search", requireAuth, async (req, res): Promise<void> => {
  try {
    const { query, topicId, limit } = req.body;

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const searchQuery = query.split(' ').map((word: string) => `${word}:*`).join(' & ');

    // Search document pages
    const results = await db
      .select({
        documentId: documentPagesTable.documentId,
        pageNumber: documentPagesTable.pageNumber,
        content: documentPagesTable.content,
        rank: sql<number>`ts_rank(content_tsv, to_tsquery('english', ${searchQuery}))`,
      })
      .from(documentPagesTable)
      .where(sql`content_tsv @@ to_tsquery('english', ${searchQuery})`)
      .orderBy(sql`ts_rank(content_tsv, to_tsquery('english', ${searchQuery})) DESC`)
      .limit(limit || 20);

    // Get document metadata for each result
    const documentIds = [...new Set(results.map(r => r.documentId))];
    const documents = await db
      .select()
      .from(documentsTable)
      .where(sql`id = ANY(${documentIds})`);

    const documentsMap = new Map(documents.map(d => [d.id, d]));

    const enrichedResults = results.map(r => ({
      ...r,
      document: documentsMap.get(r.documentId),
    }));

    res.json(enrichedResults);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

export default router;
