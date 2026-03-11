import { Router } from "express";
import { db } from "../db/index.js";
import { userProfile, usageLog } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../auth/middleware.js";

const router = Router();

// All admin routes require admin role
router.use(requireRole("admin"));

// GET /users - list all users with profiles
router.get("/users", async (_req, res) => {
  const users = await db.select().from(userProfile).orderBy(userProfile.userId);
  res.json(users);
});

// PATCH /users/:id - update user role/quota/active
const updateUserSchema = z.object({
  role: z.enum(["admin", "manager", "user"]).optional(),
  dailyQuota: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch("/users/:id", async (req, res) => {
  const body = updateUserSchema.parse(req.body);

  const [updated] = await db
    .update(userProfile)
    .set(body)
    .where(eq(userProfile.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated);
});

// GET /usage - usage stats
router.get("/usage", async (_req, res) => {
  const stats = await db
    .select({
      userId: usageLog.userId,
      model: usageLog.model,
      totalInputTokens: sql<number>`sum(${usageLog.inputTokens})`.as("total_input_tokens"),
      totalOutputTokens: sql<number>`sum(${usageLog.outputTokens})`.as("total_output_tokens"),
      requestCount: sql<number>`count(*)`.as("request_count"),
      lastUsed: sql<string>`max(${usageLog.createdAt})`.as("last_used"),
    })
    .from(usageLog)
    .groupBy(usageLog.userId, usageLog.model)
    .orderBy(desc(sql`max(${usageLog.createdAt})`));

  res.json(stats);
});

export default router;
