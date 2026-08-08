import { Router, type IRouter } from "express";
import { db, fileAssetsTable, subjectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getStorage } from "@workspace/textbooks";
import { requireAuth, requireEditor } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
import { z } from "zod";

const GetUploadUrlBody = z.object({
  subjectId: z.number(),
  filename: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number().optional(),
  isTextbook: z.boolean().optional(),
});

const CompleteUploadParams = z.object({
  assetId: z.coerce.number(),
});

const CompleteUploadBody = z.object({
  sizeBytes: z.number().optional(),
});

const ListFileAssetsParams = z.object({
  subjectId: z.coerce.number(),
});

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

const router: IRouter = Router();

const UPLOAD_EXPIRY_SECONDS = 3600;

router.post("/files/upload-url", requireEditor, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const body = GetUploadUrlBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { subjectId, filename, contentType, sizeBytes, isTextbook } = body.data;

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const storageKey = `textbooks/${subjectId}/${randomUUID()}-${filename}`;

  const [asset] = await db
    .insert(fileAssetsTable)
    .values({
      subjectId,
      isTextbook: isTextbook ?? true,
      storageKey,
      originalFilename: filename,
      sizeBytes: sizeBytes ?? 0,
      mimeType: contentType ?? "application/pdf",
      virusScanStatus: "pending",
      processingStatus: "pending",
    })
    .returning();

  await writeAudit(req, {
    action: "FILE_UPLOAD_INIT",
    entityType: "file_asset",
    entityId: asset.id,
    detail: `Upload initiated for ${filename}`,
  });

  const storage = getStorage();
  const uploadUrl = await storage.getPresignedUploadUrl?.(storageKey, UPLOAD_EXPIRY_SECONDS);
  
  if (!uploadUrl) {
    res.status(501).json({ error: "Presigned uploads not supported by current storage backend" });
    return;
  }

  res.json({ assetId: asset.id, uploadUrl, storageKey, expiresIn: UPLOAD_EXPIRY_SECONDS });
});

router.post("/files/direct-upload", requireEditor, async (req, res): Promise<void> => {
  const storageKey = req.query.storageKey as string;
  if (!storageKey) {
    res.status(400).json({ error: "storageKey query parameter required" });
    return;
  }
  const decodedKey = decodeURIComponent(storageKey);
  
  const storage = getStorage();
  const chunks: Buffer[] = [];
  
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  const buffer = Buffer.concat(chunks);
  
  try {
    await storage.putObject(decodedKey, buffer, "application/pdf");
    res.json({ success: true, size: buffer.length });
  } catch (error) {
    console.error("Direct upload failed:", error);
    res.status(500).json({ error: "Failed to save file" });
  }
});

router.post("/files/:assetId/complete", requireEditor, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const params = CompleteUploadParams.safeParse({ assetId: parseId(req.params.assetId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteUploadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [asset] = await db
    .select()
    .from(fileAssetsTable)
    .where(eq(fileAssetsTable.id, params.data.assetId));

  if (!asset) {
    res.status(404).json({ error: "File asset not found" });
    return;
  }

  if (asset.sizeBytes === 0 && body.data.sizeBytes) {
    await db
      .update(fileAssetsTable)
      .set({ sizeBytes: body.data.sizeBytes })
      .where(eq(fileAssetsTable.id, asset.id));
  }

  await writeAudit(req, {
    action: "FILE_UPLOAD_COMPLETE",
    entityType: "file_asset",
    entityId: asset.id,
    detail: `Upload completed for ${asset.originalFilename}`,
  });

  res.json({ assetId: asset.id, status: "queued_for_processing" });
});

router.get("/books/:subjectId/assets", requireAuth, async (req, res): Promise<void> => {
  const params = ListFileAssetsParams.safeParse({ subjectId: parseId(req.params.subjectId) });
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

router.get("/files/serve", requireAuth, async (req, res): Promise<void> => {
  const storageKey = req.query.storageKey as string;
  if (!storageKey) {
    res.status(400).json({ error: "storageKey query parameter required" });
    return;
  }
  const decodedKey = decodeURIComponent(storageKey);
  
  const storage = getStorage();
  try {
    const fileBuffer = await storage.getObject(decodedKey);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(fileBuffer);
  } catch (error) {
    console.error("File serve failed:", error);
    res.status(404).json({ error: "File not found" });
  }
});

export default router;