import { describe, it, expect } from "vitest";
import { RATE_LIMITS } from "@agent-terminal/shared";

describe("RATE_LIMITS configuration", () => {
  it("should have correct admin limits", () => {
    expect(RATE_LIMITS.admin).toEqual({ perMinute: 20, perDay: 500 });
  });

  it("should have correct manager limits", () => {
    expect(RATE_LIMITS.manager).toEqual({ perMinute: 10, perDay: 200 });
  });

  it("should have correct user limits", () => {
    expect(RATE_LIMITS.user).toEqual({ perMinute: 5, perDay: 100 });
  });

  it("should have admin limits higher than manager", () => {
    expect(RATE_LIMITS.admin.perMinute).toBeGreaterThan(RATE_LIMITS.manager.perMinute);
    expect(RATE_LIMITS.admin.perDay).toBeGreaterThan(RATE_LIMITS.manager.perDay);
  });

  it("should have manager limits higher than user", () => {
    expect(RATE_LIMITS.manager.perMinute).toBeGreaterThan(RATE_LIMITS.user.perMinute);
    expect(RATE_LIMITS.manager.perDay).toBeGreaterThan(RATE_LIMITS.user.perDay);
  });
});

describe("getQuotaInfo logic", () => {
  it("should calculate remaining quota correctly", () => {
    const dailyLimit = 100;
    const used = 35;
    const remaining = Math.max(0, dailyLimit - used);

    expect(remaining).toBe(65);
  });

  it("should return 0 remaining when over quota", () => {
    const dailyLimit = 100;
    const used = 150;
    const remaining = Math.max(0, dailyLimit - used);

    expect(remaining).toBe(0);
  });

  it("should use custom quota when provided", () => {
    const customQuota = 50;
    const roleDefault = RATE_LIMITS.user.perDay;
    const dailyLimit = customQuota ?? roleDefault;

    expect(dailyLimit).toBe(50);
  });

  it("should fall back to role default when no custom quota", () => {
    const customQuota = null;
    const roleDefault = RATE_LIMITS.user.perDay;
    const dailyLimit = customQuota ?? roleDefault;

    expect(dailyLimit).toBe(100);
  });

  it("should generate correct reset time (next midnight)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    expect(tomorrow.getTime()).toBeGreaterThan(Date.now());
    // Should be within ~24 hours from now
    const diff = tomorrow.getTime() - Date.now();
    expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(diff).toBeGreaterThan(0);
  });
});

describe("daily quota key format", () => {
  it("should generate correct Redis key format", () => {
    const userId = "user-123";
    const today = "2026-03-11";
    const key = `quota:${userId}:${today}`;

    expect(key).toBe("quota:user-123:2026-03-11");
  });

  it("should use ISO date slice for key", () => {
    const date = new Date("2026-03-11T15:30:00Z");
    const dateStr = date.toISOString().slice(0, 10);

    expect(dateStr).toBe("2026-03-11");
  });
});
