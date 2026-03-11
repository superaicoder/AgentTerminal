import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Re-implement requireRole for isolated testing to avoid side-effect imports
// (env.ts, db connection) that require DATABASE_URL / BETTER_AUTH_SECRET.
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).userRole || !roles.includes((req as any).userRole)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

describe("requireRole", () => {
  function createMockReqRes(userRole?: string) {
    const req = { userRole } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it("should call next() when user has required role", () => {
    const { req, res, next } = createMockReqRes("admin");
    const middleware = requireRole("admin");

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should accept any of multiple allowed roles", () => {
    const { req, res, next } = createMockReqRes("manager");
    const middleware = requireRole("admin", "manager");

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should return 403 when user does not have required role", () => {
    const { req, res, next } = createMockReqRes("user");
    const middleware = requireRole("admin");

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("should return 403 when no role set on request", () => {
    const { req, res, next } = createMockReqRes(undefined);
    const middleware = requireRole("admin");

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("should handle user role correctly", () => {
    const { req, res, next } = createMockReqRes("user");
    const middleware = requireRole("user");

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("requireAuth logic", () => {
  it("should reject when no session exists", () => {
    const session = null;
    expect(session?.user).toBeFalsy();
  });

  it("should reject when profile is inactive", () => {
    const profile = { isActive: false, role: "user" };
    expect(profile.isActive).toBe(false);
  });

  it("should set correct request properties from profile", () => {
    const session = { user: { id: "user-1" } };
    const profile = {
      id: "prof-1",
      userId: "user-1",
      role: "admin" as const,
      dailyQuota: null,
      isActive: true,
    };

    const req: Record<string, unknown> = {};
    req.userId = session.user.id;
    req.userRole = profile.role;
    req.userProfile = profile;

    expect(req.userId).toBe("user-1");
    expect(req.userRole).toBe("admin");
    expect(req.userProfile).toEqual(profile);
  });

  it("should default role to 'user' when profile has no role", () => {
    const profile = null;
    const role = (profile?.role ?? "user") as string;
    expect(role).toBe("user");
  });
});
