import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a smart, casual, slightly humorous AI assistant like Iron Man's JARVIS.
Respond concisely, helpfully, and friendly. Add emojis occasionally 😄
You have a confident, dry wit. Reference Iron Man / Tony Stark occasionally when appropriate.
Keep responses brief and punchy — no walls of text.`;

router.get("/conversations", async (_req, res) => {
  const all = await db.query.conversations.findMany({
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  res.json(all);
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [created] = await db
    .insert(conversations)
    .values({ title: body.title })
    .returning();
  res.status(201).json(created);
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: { messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] } },
  });
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conv);
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).end();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db.query.messages.findMany({
    where: eq(messages.conversationId, id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const body = SendOpenaiMessageBody.parse(req.body);

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: { messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] } },
  });

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  const history = conv.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const chatMessages = [
    { role: "system" as const, content: JARVIS_SYSTEM_PROMPT },
    ...history,
    { role: "user" as const, content: body.content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Error streaming chat:", err);
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    res.end();
  }
});

export default router;
