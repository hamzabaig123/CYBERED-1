import { Router, type IRouter } from "express";
import { db, aiChatSessionsTable, aiChatMessagesTable, bookStoresTable, subjectsTable } from "@workspace/db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  CreateAIChatSessionBody,
  ListAIChatSessionsQueryParams,
  GetAIChatSessionParams,
  SendAIChatMessageParams,
  SendAIChatMessageBody,
  ListAIChatSessionsQueryParams as ListAIChatMessagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { chatWithBook, streamChatWithBook } from "../ai/geminiClient";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseFloat(s);
}

// POST /ai/chat/sessions - Create a new chat session
router.post("/ai/chat/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const body = CreateAIChatSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Verify subject exists and has a ready book store
  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(and(eq(bookStoresTable.subjectId, body.data.subjectId), eq(bookStoresTable.status, "ready")));

  if (!store) {
    res.status(404).json({ error: "No ready book store for this subject" });
    return;
  }

  const [session] = await db
    .insert(aiChatSessionsTable)
    .values({
      userId: user.id,
      subjectId: body.data.subjectId,
    })
    .returning();

  await writeAudit(req, { 
    action: "AI_CHAT_SESSION_CREATE", 
    entityType: "ai_chat_session", 
    entityId: session.id,
    detail: `Created chat session for subject ${body.data.subjectId}` 
  });

  res.status(201).json(session);
});

// GET /ai/chat/sessions - List user's chat sessions
router.get("/ai/chat/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const params = ListAIChatSessionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { subjectId, limit = 20, offset = 0 } = params.data;

  const conditions = [eq(aiChatSessionsTable.userId, user.id)];
  if (subjectId) conditions.push(eq(aiChatSessionsTable.subjectId, subjectId));

  const [sessions, total] = await Promise.all([
    db
      .select({
        id: aiChatSessionsTable.id,
        subjectId: aiChatSessionsTable.subjectId,
        createdAt: aiChatSessionsTable.createdAt,
        subjectName: subjectsTable.name,
        messageCount: sql<number>`(
          SELECT count(*)::int FROM ai_chat_messages 
          WHERE ai_chat_messages.session_id = ai_chat_sessions.id
        )`,
      })
      .from(aiChatSessionsTable)
      .innerJoin(subjectsTable, eq(aiChatSessionsTable.subjectId, subjectsTable.id))
      .where(and(...conditions))
      .orderBy(desc(aiChatSessionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiChatSessionsTable)
      .where(and(...conditions)),
  ]);

  res.json({
    sessions,
    total: total[0]?.count ?? 0,
    limit,
    offset,
  });
});

// GET /ai/chat/sessions/:sessionId - Get a chat session with messages
router.get("/ai/chat/sessions/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const params = GetAIChatSessionParams.safeParse({ sessionId: parseId(req.params.sessionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(aiChatSessionsTable)
    .where(and(eq(aiChatSessionsTable.id, params.data.sessionId), eq(aiChatSessionsTable.userId, user.id)));

  if (!session) {
    res.status(404).json({ error: "Chat session not found" });
    return;
  }

  const queryParams = ListAIChatMessagesQueryParams.safeParse(req.query);
  const limit = queryParams.success ? queryParams.data.limit ?? 50 : 50;
  const offset = queryParams.success ? queryParams.data.offset ?? 0 : 0;

  const messages = await db
    .select()
    .from(aiChatMessagesTable)
    .where(eq(aiChatMessagesTable.sessionId, session.id))
    .orderBy(asc(aiChatMessagesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ session, messages });
});

// POST /ai/chat/sessions/:sessionId/messages - Send a message and get AI response
router.post("/ai/chat/sessions/:sessionId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const params = SendAIChatMessageParams.safeParse({ sessionId: parseId(req.params.sessionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

const body = SendAIChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const extra = (req.body ?? {}) as { mode?: "answer" | "tutor"; language?: "auto" | "english" | "urdu" | "sindhi" };
  const mode = extra.mode === "tutor" ? "tutor" : "answer";
  const language = ["english", "urdu", "sindhi", "auto"].includes(extra.language ?? "") ? extra.language! : "auto";

  const [session] = await db
    .select()
    .from(aiChatSessionsTable)
    .where(and(eq(aiChatSessionsTable.id, params.data.sessionId), eq(aiChatSessionsTable.userId, user.id)));

  if (!session) {
    res.status(404).json({ error: "Chat session not found" });
    return;
  }

  // Get the book store for this subject
  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(and(eq(bookStoresTable.subjectId, session.subjectId), eq(bookStoresTable.status, "ready")));

  if (!store) {
    res.status(404).json({ error: "No ready book store for this subject" });
    return;
  }

  // Save user message
  const [userMessage] = await db
    .insert(aiChatMessagesTable)
    .values({
      sessionId: session.id,
      role: "user",
      content: body.data.content,
    })
    .returning();

  // Get conversation history
  const history = await db
    .select()
    .from(aiChatMessagesTable)
    .where(eq(aiChatMessagesTable.sessionId, session.id))
    .orderBy(asc(aiChatMessagesTable.createdAt))
    .limit(20); // Limit history to last 20 messages

try {
    // Call AI with conversation history
    const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    messages.push({ role: "user", content: body.data.content });

    const result = await chatWithBook(store.geminiStoreName, messages, { mode, language });

    // Save assistant response
    const [assistantMessage] = await db
      .insert(aiChatMessagesTable)
      .values({
        sessionId: session.id,
        role: "assistant",
        content: result.content,
        citationsJson: result.citations,
      })
      .returning();

    await writeAudit(req, { 
      action: "AI_CHAT_MESSAGE", 
      entityType: "ai_chat_message", 
      entityId: assistantMessage.id,
      detail: `AI response in session ${session.id}` 
    });

    res.json({
      userMessage,
      assistantMessage: {
        ...assistantMessage,
        citations: result.citations,
      },
    });
} catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

// POST /ai/chat/sessions/:sessionId/messages/stream - Send a message, stream the AI reply (SSE)
router.post("/ai/chat/sessions/:sessionId/messages/stream", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: { id: number } }).user;
  const params = SendAIChatMessageParams.safeParse({ sessionId: parseId(req.params.sessionId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendAIChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const extra = (req.body ?? {}) as { mode?: "answer" | "tutor"; language?: "auto" | "english" | "urdu" | "sindhi" };
  const mode = extra.mode === "tutor" ? "tutor" : "answer";
  const language = ["english", "urdu", "sindhi", "auto"].includes(extra.language ?? "") ? extra.language! : "auto";

  const [session] = await db
    .select()
    .from(aiChatSessionsTable)
    .where(and(eq(aiChatSessionsTable.id, params.data.sessionId), eq(aiChatSessionsTable.userId, user.id)));

  if (!session) {
    res.status(404).json({ error: "Chat session not found" });
    return;
  }

  const [store] = await db
    .select()
    .from(bookStoresTable)
    .where(and(eq(bookStoresTable.subjectId, session.subjectId), eq(bookStoresTable.status, "ready")));

  if (!store) {
    res.status(404).json({ error: "No ready book store for this subject" });
    return;
  }

  const [userMessage] = await db
    .insert(aiChatMessagesTable)
    .values({
      sessionId: session.id,
      role: "user",
      content: body.data.content,
    })
    .returning();

  const history = await db
    .select()
    .from(aiChatMessagesTable)
    .where(eq(aiChatMessagesTable.sessionId, session.id))
    .orderBy(asc(aiChatMessagesTable.createdAt))
    .limit(20);

  const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    writeEvent({ type: "meta", userMessageId: userMessage.id });

    let accumulated = "";
    for await (const chunk of streamChatWithBook(store.geminiStoreName, messages, { mode, language })) {
      if (chunk.type === "text") {
        accumulated += chunk.text;
        writeEvent({ type: "text", text: chunk.text });
      } else if (chunk.type === "done") {
        const [assistantMessage] = await db
          .insert(aiChatMessagesTable)
          .values({
            sessionId: session.id,
            role: "assistant",
            content: accumulated,
            citationsJson: chunk.citations,
          })
          .returning();

        await writeAudit(req, {
          action: "AI_CHAT_MESSAGE",
          entityType: "ai_chat_message",
          entityId: assistantMessage.id,
          detail: `Streamed AI response in session ${session.id}`,
        });

        writeEvent({ type: "done", assistantMessageId: assistantMessage.id, citations: chunk.citations });
      }
    }
    res.end();
  } catch (error) {
    console.error("Error streaming chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get AI response" });
      return;
    }
    writeEvent({ type: "error", message: "Stream interrupted. Please try again." });
    res.end();
  }
});

export default router;
