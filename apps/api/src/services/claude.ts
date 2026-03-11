import { spawn, type ChildProcess } from "child_process";

export interface ClaudeStreamEvent {
  type: "delta" | "result" | "error";
  text?: string;
  sessionId?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface ClaudeOptions {
  prompt: string;
  sessionId?: string;
  model?: string;
  onEvent: (event: ClaudeStreamEvent) => void;
  onDone: () => void;
  signal?: AbortSignal;
}

export function spawnClaude(options: ClaudeOptions): ChildProcess {
  const args = [
    "-p", options.prompt,
    "--output-format", "stream-json",
    "--verbose",
  ];

  if (options.sessionId) {
    args.push("--resume", options.sessionId);
  }

  if (options.model) {
    args.push("--model", options.model);
  }

  // Remove CLAUDECODE env var to allow spawning claude inside a claude session
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  const proc = spawn("claude", args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: cleanEnv,
  });

  let buffer = "";

  proc.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        handleStreamJson(parsed, options.onEvent);
      } catch {
        // non-JSON line, ignore
      }
    }
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    if (text.trim()) {
      options.onEvent({ type: "error", error: text });
    }
  });

  proc.on("close", () => {
    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        handleStreamJson(parsed, options.onEvent);
      } catch {
        // ignore
      }
    }
    options.onDone();
  });

  proc.on("error", (err) => {
    options.onEvent({ type: "error", error: err.message });
    options.onDone();
  });

  // Handle abort
  if (options.signal) {
    options.signal.addEventListener("abort", () => {
      proc.kill("SIGTERM");
    });
  }

  return proc;
}

function handleStreamJson(
  data: Record<string, unknown>,
  onEvent: (event: ClaudeStreamEvent) => void,
) {
  // Actual claude stream-json --verbose format:
  // {"type":"assistant","message":{"content":[{"type":"text","text":"..."}],...},"session_id":"..."}
  // {"type":"result","subtype":"success","session_id":"...","usage":{...},"result":"..."}
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
