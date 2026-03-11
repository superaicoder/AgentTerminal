"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "@agent-terminal/shared";

interface Props {
  messages: Message[];
  streamingText: string;
  streaming: boolean;
  queuePosition: number | null;
}

export default function MessageList({ messages, streamingText, streaming, queuePosition }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem 0",
      }}
    >
      {messages.length === 0 && !streaming && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "var(--muted)",
            fontSize: "0.875rem",
          }}
        >
          Start a conversation...
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role as "user" | "assistant"} content={msg.content} />
      ))}

      {queuePosition !== null && queuePosition > 0 && (
        <div style={{ textAlign: "center", padding: "0.5rem", color: "var(--muted)", fontSize: "0.8125rem" }}>
          Queue position: {queuePosition}
        </div>
      )}

      {streaming && streamingText && <MessageBubble role="assistant" content={streamingText} />}

      {streaming && !streamingText && queuePosition === null && (
        <div style={{ padding: "0.25rem 1rem" }}>
          <div
            style={{
              maxWidth: "75%",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              background: "var(--bubble-assistant)",
              fontSize: "0.875rem",
              color: "var(--muted)",
            }}
          >
            Thinking...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
