import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { auth } from "./auth/index.js";
import { requireAuth } from "./auth/middleware.js";
import { getQuotaInfo } from "./middleware/rateLimiter.js";
import conversationsRouter from "./routes/conversations.js";
import chatRouter from "./routes/chat.js";
import adminRouter from "./routes/admin.js";
import { toNodeHandler } from "better-auth/node";

// Start worker (side-effect import)
import "./queue/chat.worker.js";

const app = express();

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Body parser (skip for auth routes - better-auth handles its own parsing)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Better Auth handler - must set basePath
const authHandler = toNodeHandler(auth);
app.all("/api/auth/*", (req, res) => authHandler(req, res));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Protected routes
app.use("/api/conversations", requireAuth, conversationsRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/admin", requireAuth, adminRouter);

// Quota endpoint
app.get("/api/quota/me", requireAuth, async (req, res) => {
  const info = await getQuotaInfo(
    req.userId!,
    req.userRole!,
    req.userProfile?.dailyQuota ?? null,
  );
  res.json(info);
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);
});
