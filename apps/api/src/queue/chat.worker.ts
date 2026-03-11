import { Worker, type Job } from "bullmq";
import { redisConnection, createRedisClient, chatQueue } from "./index.js";
import { spawnClaude } from "../services/claude.js";
import { db } from "../db/index.js";
import { message, conversation, usageLog } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { QUEUE_NAME, REDIS_CHANNELS } from "@agent-terminal/shared";

const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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

/** Generate a short title from the user's first message */
function generateTitle(prompt: string): string {
  // Take first line or first 60 chars, whichever is shorter
  const firstLine = prompt.split("\n")[0].trim();
  if (firstLine.length <= 60) return firstLine;
  return firstLine.slice(0, 57) + "...";
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
      // Set up job timeout
      const timeout = setTimeout(() => {
        controller.abort();
        publisher.publish(
          channel,
          JSON.stringify({ type: "error", data: "Job timed out after 5 minutes" }),
        );
      }, JOB_TIMEOUT_MS);

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

      clearTimeout(timeout);

      // Save assistant message
      if (fullText) {
        await db.insert(message).values({
          conversationId,
          role: "assistant",
          content: fullText,
          tokenUsage: { input: inputTokens, output: outputTokens },
        });
      }

      // Update conversation session ID + auto-title
      const updateFields: Record<string, unknown> = { updatedAt: new Date() };
      if (sessionId) {
        updateFields.claudeSessionId = sessionId;
      }

      // Auto-title: if conversation is still "New Chat", generate title from prompt
      const [conv] = await db
        .select({ title: conversation.title })
        .from(conversation)
        .where(eq(conversation.id, conversationId))
        .limit(1);

      if (conv?.title === "New Chat") {
        updateFields.title = generateTitle(prompt);
      }

      await db
        .update(conversation)
        .set(updateFields)
        .where(eq(conversation.id, conversationId));

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
      // Broadcast updated queue positions to waiting jobs
      broadcastQueuePositions().catch(() => {});
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

async function broadcastQueuePositions() {
  const waitingJobs = await chatQueue.getWaiting();
  for (let i = 0; i < waitingJobs.length; i++) {
    const wJob = waitingJobs[i];
    const wChannel = REDIS_CHANNELS.chatStream(wJob.data.jobId);
    publisher.publish(
      wChannel,
      JSON.stringify({ type: "queue_position", data: String(i + 1) }),
    );
  }
}

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

export { worker };
