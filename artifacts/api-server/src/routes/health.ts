import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { getStorage } from "@workspace/textbooks";
import { getGeminiClient } from "../ai/geminiClient";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/ai/health", async (_req, res) => {
  const status: Record<string, string> = {
    gemini: "healthy",
    fileSearch: "healthy",
    database: "healthy",
    storage: "healthy",
    rag: "healthy"
  };

  try {
    const client = getGeminiClient();
    // Simple fast call to check API key
    await client.models.generateContent({ model: "gemini-3-flash-preview", contents: "test" });
  } catch (err) {
    status.gemini = "unhealthy";
    status.fileSearch = "unhealthy";
    status.rag = "unhealthy";
  }

  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    status.database = "unhealthy";
    status.rag = "unhealthy";
  }

  try {
    const storage = getStorage();
    if (!storage) throw new Error("Storage not configured");
  } catch (err) {
    status.storage = "unhealthy";
    status.rag = "unhealthy";
  }

  res.status(status.rag === "unhealthy" ? 503 : 200).json(status);
});

export default router;
