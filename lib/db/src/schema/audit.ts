import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(), // e.g. "login", "create_question", "archive_class"
  entityType: text("entity_type"),  // e.g. "question", "class"
  entityId: integer("entity_id"),
  detail: text("detail"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
