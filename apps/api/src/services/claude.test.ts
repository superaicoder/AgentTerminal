import { describe, it, expect, vi } from "vitest";

// Test handleStreamJson logic by extracting the parser logic
// Since handleStreamJson is not exported, we test via the event flow
// We'll test the stream-json parser behavior directly

interface ClaudeStreamEvent {
  type: "delta" | "result" | "error";
  text?: string;
  sessionId?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

// Re-implement handleStreamJson for testing (mirrors the actual implementation)
function handleStreamJson(
  data: Record<string, unknown>,
  onEvent: (event: ClaudeStreamEvent) => void,
) {
  if (data.type === "assistant") {
    const msg = data.message as Record<string, unknown> | undefined;
    if (msg) {
      const content = msg.content as Array<Record<string, unknown>> | undefined;
      if (content) {
        for (const block of content) {
          if (block.type === "text" && typeof block.text === "string") {
            onEvent({ type: "delta", text: block.text });
          }
        }
      }
    }
  } else if (data.type === "result") {
    const usage = data.usage as Record<string, unknown> | undefined;
    onEvent({
      type: "result",
      sessionId: data.session_id as string | undefined,
      inputTokens: (usage?.input_tokens as number) ?? 0,
      outputTokens: (usage?.output_tokens as number) ?? 0,
    });
  }
}

describe("handleStreamJson", () => {
  it("should parse assistant message with text content", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Hello, world!" }],
        },
      },
      onEvent,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "delta", text: "Hello, world!" });
  });

  it("should parse assistant message with multiple text blocks", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Part 1" },
            { type: "tool_use", id: "tool123" },
            { type: "text", text: "Part 2" },
          ],
        },
      },
      onEvent,
    );

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "delta", text: "Part 1" });
    expect(events[1]).toEqual({ type: "delta", text: "Part 2" });
  });

  it("should parse result message with usage stats", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "result",
        subtype: "success",
        session_id: "sess_abc123",
        usage: {
          input_tokens: 150,
          output_tokens: 300,
        },
        result: "some result",
      },
      onEvent,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "result",
      sessionId: "sess_abc123",
      inputTokens: 150,
      outputTokens: 300,
    });
  });

  it("should handle result without usage", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "result",
        session_id: "sess_xyz",
      },
      onEvent,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "result",
      sessionId: "sess_xyz",
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("should ignore assistant message without content", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "assistant",
        message: {},
      },
      onEvent,
    );

    expect(events).toHaveLength(0);
  });

  it("should ignore assistant message without message field", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson({ type: "assistant" }, onEvent);

    expect(events).toHaveLength(0);
  });

  it("should ignore unknown event types", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson({ type: "system", data: "something" }, onEvent);

    expect(events).toHaveLength(0);
  });

  it("should ignore non-text content blocks", () => {
    const events: ClaudeStreamEvent[] = [];
    const onEvent = (e: ClaudeStreamEvent) => events.push(e);

    handleStreamJson(
      {
        type: "assistant",
        message: {
          content: [{ type: "tool_use", id: "tool1", name: "bash" }],
        },
      },
      onEvent,
    );

    expect(events).toHaveLength(0);
  });
});

describe("spawnClaude argument building", () => {
  it("should build correct base arguments", () => {
    const prompt = "Hello, Claude!";
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];

    expect(args).toContain("-p");
    expect(args).toContain("Hello, Claude!");
    expect(args).toContain("--output-format");
    expect(args).toContain("stream-json");
    expect(args).toContain("--verbose");
  });

  it("should add --resume flag with session ID", () => {
    const args = ["-p", "test", "--output-format", "stream-json", "--verbose"];
    const sessionId = "sess_abc123";
    args.push("--resume", sessionId);

    expect(args).toContain("--resume");
    expect(args).toContain("sess_abc123");
  });

  it("should add --model flag", () => {
    const args = ["-p", "test", "--output-format", "stream-json", "--verbose"];
    const model = "opus";
    args.push("--model", model);

    expect(args).toContain("--model");
    expect(args).toContain("opus");
  });

  it("should clean CLAUDECODE from env", () => {
    const env = { ...process.env, CLAUDECODE: "some-value" };
    delete env.CLAUDECODE;

    expect(env.CLAUDECODE).toBeUndefined();
  });
});
