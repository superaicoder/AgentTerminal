import type { Role } from "./types.js";

export const RATE_LIMITS: Record<Role, { perMinute: number; perDay: number }> = {
  admin: { perMinute: 20, perDay: 500 },
  manager: { perMinute: 10, perDay: 200 },
  user: { perMinute: 5, perDay: 100 },
};

export const SESSION_EXPIRY_HOURS = 8;

export const QUEUE_NAME = "chat-queue";

export const REDIS_CHANNELS = {
  chatStream: (jobId: string) => `chat:${jobId}`,
};
