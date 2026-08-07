import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";

export interface AuditMeta {
  userId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  detail?: string | null;
}

export async function writeAudit(req: Request | null, meta: AuditMeta): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: meta.userId ?? null,
      action: meta.action,
      entityType: meta.entityType ?? null,
      entityId: meta.entityId ?? null,
      detail: meta.detail ?? null,
      ipAddress: req?.ip || req?.socket?.remoteAddress || null,
      userAgent: req?.headers["user-agent"] || null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function writeAuditForUser(userId: number | undefined, meta: Omit<AuditMeta, "userId">): Promise<void> {
  await writeAudit(null, { ...meta, userId });
}
