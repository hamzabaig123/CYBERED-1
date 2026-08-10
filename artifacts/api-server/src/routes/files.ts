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

const DeleteFileAssetParams = z.object({
  assetId: z.coerce.number(),
});

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

const router: IRouter = Router();

const UPLOAD_EXPIRY_SECONDS = 3600;

// Stage-based progress estimation
const STAGE_PERCENT: Record<string, number> = {
  queued: 5,
  scanning: 15,
  extracting: 30,
  uploading_to_ai: 50,
  indexing: 70,
  ready: 100,
  error: 0,
};

function estimateSecondsRemaining(stage: string, sizeBytes: number, stageStartedAt: Date): number | null {
  if (stage === "ready" || stage === "error") return 0;
  const estimatedTotalSec = Math.max(60, (sizeBytes / (1024 * 1024)) * 25);
  const elapsedSec = (Date.now() - stageStartedAt.getTime()) / 1000;
  return Math.max(5, Math.round(estimatedTotalSec - elapsedSec));
}

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

// No auth required here — the storageKey is unguessable and the upload-url
// endpoint (which IS auth-gated) is what creates both the record and the key.
router.post("/files/direct-upload", async (req, res): Promise<void> => {
  const storageKey = req.query.storageKey as string;
  if (!storageKey) {
    res.status(400).json({ error: "storageKey query parameter required" });
    return;
  }
  const decodedKey = decodeURIComponent(storageKey);

  const storage = getStorage();
  let uploadedBytes = 0;

  // Stream directly to storage instead of buffering the entire file in memory
  try {
    await storage.putStream(decodedKey, req, "application/pdf");
    uploadedBytes = parseInt(req.headers["content-length"] ?? "0", 10);
    res.json({ success: true, size: uploadedBytes });
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

router.delete("/files/:assetId", requireEditor, async (req, res): Promise<void> => {
  const params = DeleteFileAssetParams.safeParse({ assetId: parseId(req.params.assetId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  const storage = getStorage();
  // Best-effort — don't fail the delete if the file's already gone from storage
  try {
    await storage.deleteObject?.(asset.storageKey);
  } catch (e) {
    console.warn("Could not delete PDF object:", e);
  }
  if (asset.fullTextKey) {
    try {
      await storage.deleteObject?.(asset.fullTextKey);
    } catch (e) {
      console.warn("Could not delete text object:", e);
    }
  }

  await db.delete(fileAssetsTable).where(eq(fileAssetsTable.id, asset.id));

  await writeAudit(req, {
    action: "FILE_DELETE",
    entityType: "file_asset",
    entityId: asset.id,
    detail: `Deleted ${asset.originalFilename} (was ${asset.processingStatus})`,
  });

  res.json({ success: true });
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

  // Enhance response with progress info
  const enhancedAssets = assets.map((asset) => ({
    ...asset,
    stagePercent: STAGE_PERCENT[asset.processingStatus as string] ?? 0,
    estimatedSecondsRemaining: estimateSecondsRemaining(
      asset.processingStatus,
      asset.sizeBytes,
      new Date(asset.updatedAt || asset.createdAt)
    ),
  }));

  res.json({ assets: enhancedAssets });
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