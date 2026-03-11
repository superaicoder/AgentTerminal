import { describe, it, expect } from "vitest";
import { RATE_LIMITS, QUEUE_NAME, REDIS_CHANNELS, SESSION_EXPIRY_HOURS } from "./constants.js";
import type { Role, SSEEvent, QuotaInfo, ChatSendRequest, ChatSendResponse, Message } from "./types.js";

describe("shared constants", () => {
  it("should export QUEUE_NAME", () => {
    expect(QUEUE_NAME).toBe("chat-queue");
  });

  it("should export SESSION_EXPIRY_HOURS", () => {
    expect(SESSION_EXPIRY_HOURS).toBe(8);
  });

  it("should have REDIS_CHANNELS.chatStream function", () => {
    expect(typeof REDIS_CHANNELS.chatStream).toBe("function");
    expect(REDIS_CHANNELS.chatStream("job-123")).toBe("chat:job-123");
  });

  it("should have all role keys in RATE_LIMITS", () => {
    const roles: Role[] = ["admin", "manager", "user"];
    for (const role of roles) {
      expect(RATE_LIMITS[role]).toBeDefined();
      expect(RATE_LIMITS[role].perMinute).toBeGreaterThan(0);
      expect(RATE_LIMITS[role].perDay).toBeGreaterThan(0);
    }
  });
});

describe("shared types", () => {
  it("should allow valid SSEEvent types", () => {
    const events: SSEEvent[] = [
      { type: "delta", data: "hello" },
      { type: "done", data: "", messageId: "msg-1", tokenUsage: { input: 10, output: 20 } },
      { type: "error", data: "something failed" },
      { type: "queue_position", data: "3" },
    ];

    expect(events).toHaveLength(4);
    expect(events[0].type).toBe("delta");
    expect(events[1].tokenUsage?.input).toBe(10);
    expect(events[3].type).toBe("queue_position");
  });

  it("should validate Message structure", () => {
    const msg: Message = {
      id: "uuid-1",
      conversationId: "conv-1",
      role: "user",
      content: "Hello",
      tokenUsage: null,
      createdAt: "2026-03-11T00:00:00Z",
    };

    expect(msg.role).toBe("user");
    expect(msg.tokenUsage).toBeNull();
  });

  it("should validate QuotaInfo structure", () => {
    const quota: QuotaInfo = {
      used: 5,
      limit: 100,
      remaining: 95,
      resetsAt: "2026-03-12T00:00:00Z",
    };

    expect(quota.remaining).toBe(quota.limit - quota.used);
  });

  it("should validate ChatSendRequest structure", () => {
    const req: ChatSendRequest = {
      conversationId: "conv-1",
      message: "Hello, world!",
    };

    expect(req.message).toBeTruthy();
    expect(req.model).toBeUndefined();
  });

  it("should validate ChatSendResponse structure", () => {
    const res: ChatSendResponse = {
      jobId: "job-1",
      position: 0,
    };

    expect(res.position).toBe(0);
  });
});
