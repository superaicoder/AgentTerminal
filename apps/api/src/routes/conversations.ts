import { Router } from "express";
import { db } from "../db/index.js";
import { conversation, message } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// List conversations
router.get("/", async (req, res) => {
  const conversations = await db
    .select()
    .from(conversation)
    .where(eq(conversation.userId, req.userId!))
    .orderBy(desc(conversation.updatedAt));

  res.json(conversations);
});

// Create conversation
const createSchema = z.object({
  title: z.string().min(1).max(200).default("New Chat"),
  model: z.string().default("sonnet"),
});

router.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);

  const [conv] = await db
    .insert(conversation)
    .values({
      userId: req.userId!,
      title: body.title,
      model: body.model,
    })
    .returning();

  res.status(201).json(conv);
});

// Rename conversation
const renameSchema = z.object({ title: z.string().min(1).max(200) });

router.patch("/:id", async (req, res) => {
  const body = renameSchema.parse(req.body);

  const [updated] = await db
    .update(conversation)
    .set({ title: body.title, updatedAt: new Date() })
    .where(and(eq(conversation.id, req.params.id), eq(conversation.userId, req.userId!)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

// Delete conversation
router.delete("/:id", async (req, res) => {
  const [deleted] = await db
    .delete(conversation)
    .where(and(eq(conversation.id, req.params.id), eq(conversation.userId, req.userId!)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

// Get messages for a conversation
router.get("/:id/messages", async (req, res) => {
  // Verify ownership
  const [conv] = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, req.params.id), eq(conversation.userId, req.userId!)))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, req.params.id))
    .orderBy(message.createdAt);

  res.json(messages);
});

export default router;
