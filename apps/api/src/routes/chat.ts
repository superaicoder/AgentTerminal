import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "../db/index.js";
import { message, conversation } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { chatQueue, createRedisClient } from "../queue/index.js";
import { REDIS_CHANNELS } from "@agent-terminal/shared";
import { perMinuteLimit, checkDailyQuota } from "../middleware/rateLimiter.js";
import { getActiveProcesses } from "../queue/chat.worker.js";

const router = Router();

// POST /send - submit a chat message
const sendSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(50000),
  model: z.string().optional(),
});

router.post("/send", perMinuteLimit, checkDailyQuota as any, async (req, res) => {
  try {
    const body = sendSchema.parse(req.body);

    // Verify conversation ownership
    const [conv] = await db
      .select()
      .from(conversation)
      .where(
        and(eq(conversation.id, body.conversationId), eq(conversation.userId, req.userId!)),
      )
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Save user message
    await db.insert(message).values({
      conversationId: body.conversationId,
      role: "user",
      content: body.message,
    });

    // Update conversation timestamp
    await db
      .update(conversation)
      .set({ updatedAt: new Date() })
      .where(eq(conversation.id, body.conversationId));

    // Enqueue job
    const jobId = uuidv4();
    const job = await chatQueue.add("chat", {
      jobId,
      userId: req.userId!,
      conversationId: body.conversationId,
      prompt: body.message,
      model: body.model ?? conv.model,
      claudeSessionId: conv.claudeSessionId,
    });

    const waiting = await chatQueue.getWaitingCount();

    res.json({ jobId, position: waiting });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /stream/:jobId - SSE stream
router.get("/stream/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const channel = REDIS_CHANNELS.chatStream(jobId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const subscriber = createRedisClient();
  await subscriber.subscribe(channel);

  subscriber.on("message", (_ch: string, msg: string) => {
    res.write(`data: ${msg}\n\n`);

    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === "done" || parsed.type === "error") {
        setTimeout(() => {
          subscriber.unsubscribe(channel);
          subscriber.disconnect();
          res.end();
        }, 100);
      }
    } catch {
      // ignore parse errors
    }
  });

  // Client disconnect
  req.on("close", () => {
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
  });

  // Timeout after 5 minutes
  const timeout = setTimeout(() => {
    res.write(`data: ${JSON.stringify({ type: "error", data: "Timeout" })}\n\n`);
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
    res.end();
  }, 5 * 60 * 1000);

  req.on("close", () => clearTimeout(timeout));
});

// POST /stop/:jobId - cancel a running job
router.post("/stop/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const processes = getActiveProcesses();
  const controller = processes.get(jobId);

  if (controller) {
    controller.abort();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Job not found or already completed" });
  }
});

export default router;
