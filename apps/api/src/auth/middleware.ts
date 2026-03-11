import type { Request, Response, NextFunction } from "express";
import { auth } from "./index.js";
import { db } from "../db/index.js";
import { userProfile } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { Role } from "@agent-terminal/shared";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      userProfile?: {
        id: string;
        userId: string;
        role: Role;
        dailyQuota: number | null;
        isActive: boolean;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user profile
    const profiles = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .limit(1);

    const profile = profiles[0];
    if (!profile?.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    req.userId = session.user.id;
    req.userRole = (profile?.role ?? "user") as Role;
    req.userProfile = profile
      ? { ...profile, role: profile.role as Role }
      : { id: "", userId: session.user.id, role: "user", dailyQuota: null, isActive: true };

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
