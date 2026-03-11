import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../env.js";
import { QUEUE_NAME } from "@agent-terminal/shared";

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const chatQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
});

// Helper for pub/sub (separate connections needed)
export function createRedisClient() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}
