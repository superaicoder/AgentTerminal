import { Worker, type Job } from "bullmq";
import { redisConnection, createRedisClient } from "./index.js";
import { spawnClaude } from "../services/claude.js";
import { db } from "../db/index.js";
import { message, conversation, usageLog } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { QUEUE_NAME, REDIS_CHANNELS } from "@agent-terminal/shared";

interface ChatJobData {
  jobId: string;
  userId: string;
  conversationId: string;
  prompt: string;
  model: string;
  claudeSessionId: string | null;
}

const publisher = createRedisClient();

// Track active processes for cancellation
const activeProcesses = new Map<string, AbortController>();

export function getActiveProcesses() {
  return activeProcesses;
}

const worker = new Worker<ChatJobData>(
  QUEUE_NAME,
  async (job: Job<ChatJobData>) => {
    const { jobId, userId, conversationId, prompt, model, claudeSessionId } = job.data;
    const channel = REDIS_CHANNELS.chatStream(jobId);
    const controller = new AbortController();
    activeProcesses.set(jobId, controller);

    let fullText = "";
    let sessionId = claudeSessionId;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      await new Promise<void>((resolve, reject) => {
        spawnClaude({
          prompt,
          sessionId: claudeSessionId ?? undefined,
          model,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "delta" && event.text) {
              fullText += event.text;
              publisher.publish(channel, JSON.stringify({ type: "delta", data: event.text }));
            } else if (event.type === "result") {
              sessionId = event.sessionId ?? sessionId;
              inputTokens = event.inputTokens ?? 0;
              outputTokens = event.outputTokens ?? 0;
            } else if (event.type === "error") {
              publisher.publish(channel, JSON.stringify({ type: "error", data: event.error }));
            }
          },
          onDone: resolve,
        });
      });

      // Save assistant message
      if (fullText) {
        await db.insert(message).values({
          conversationId,
          role: "assistant",
          content: fullText,
          tokenUsage: { input: inputTokens, output: outputTokens },
        });
      }

      // Update conversation session ID
      if (sessionId) {
        await db
          .update(conversation)
          .set({ claudeSessionId: sessionId, updatedAt: new Date() })
          .where(eq(conversation.id, conversationId));
      }

      // Log usage
      await db.insert(usageLog).values({
        userId,
        conversationId,
        model,
        inputTokens,
        outputTokens,
        status: controller.signal.aborted ? "cancelled" : "completed",
      });

      // Publish done
      publisher.publish(
        channel,
        JSON.stringify({
          type: "done",
          data: "",
          messageId: conversationId,
          tokenUsage: { input: inputTokens, output: outputTokens },
        }),
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      publisher.publish(channel, JSON.stringify({ type: "error", data: errorMsg }));

      await db.insert(usageLog).values({
        userId,
        conversationId,
        model,
        inputTokens,
        outputTokens,
        status: "error",
      });
    } finally {
      activeProcesses.delete(jobId);
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

export { worker };
