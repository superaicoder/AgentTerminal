import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import type { Request, Response } from "express";
import { createRedisClient } from "../queue/index.js";
import { RATE_LIMITS } from "@agent-terminal/shared";
import type { Role } from "@agent-terminal/shared";

const redisClient = createRedisClient();

export const perMinuteLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args) as never,
  }),
  windowMs: 60 * 1000,
  max: (req: Request) => {
    const role = (req.userRole ?? "user") as Role;
    return RATE_LIMITS[role].perMinute;
  },
  keyGenerator: (req: Request) => `rl:min:${req.userId ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Daily quota check middleware
export async function checkDailyQuota(req: Request, res: Response, next: Function) {
  if (!req.userId || !req.userRole) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = req.userRole as Role;
  const dailyLimit = req.userProfile?.dailyQuota ?? RATE_LIMITS[role].perDay;
  const today = new Date().toISOString().slice(0, 10);
  const key = `quota:${req.userId}:${today}`;

  const current = await redisClient.get(key);
  const used = current ? parseInt(current, 10) : 0;

  if (used >= dailyLimit) {
    res.status(429).json({
      error: "Daily quota exceeded",
      quota: { used, limit: dailyLimit, remaining: 0 },
    });
    return;
  }

  // Increment
  await redisClient.incr(key);
  await redisClient.expire(key, 86400); // 24h TTL

  next();
}

// Get current quota info
export async function getQuotaInfo(userId: string, role: Role, customQuota: number | null) {
  const dailyLimit = customQuota ?? RATE_LIMITS[role].perDay;
  const today = new Date().toISOString().slice(0, 10);
  const key = `quota:${userId}:${today}`;

  const current = await redisClient.get(key);
  const used = current ? parseInt(current, 10) : 0;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    used,
    limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - used),
    resetsAt: tomorrow.toISOString(),
  };
}
