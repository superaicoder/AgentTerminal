"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { Message, ChatSendResponse, SSEEvent } from "@agent-terminal/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const currentJobId = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    apiFetch<Message[]>(`/api/conversations/${conversationId}/messages`).then(setMessages).catch(() => {});
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || streaming) return;

      setError(null);
      setStreaming(true);
      setStreamingText("");

      // Optimistic add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content,
        tokenUsage: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        // Send message
        const { jobId, position } = await apiFetch<ChatSendResponse>("/api/chat/send", {
          method: "POST",
          body: JSON.stringify({ conversationId, message: content }),
        });

        currentJobId.current = jobId;
        if (position > 0) setQueuePosition(position);

        // Connect SSE
        const es = new EventSource(`${API_URL}/api/chat/stream/${jobId}`, {
          withCredentials: true,
        });
        eventSourceRef.current = es;

        let accumulated = "";

        es.onmessage = (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);

            if (data.type === "delta") {
              accumulated += data.data;
              setStreamingText(accumulated);
              setQueuePosition(null);
            } else if (data.type === "queue_position") {
              setQueuePosition(parseInt(data.data, 10));
            } else if (data.type === "done") {
              // Add complete assistant message
              const assistantMsg: Message = {
                id: data.messageId ?? crypto.randomUUID(),
                conversationId,
                role: "assistant",
                content: accumulated,
                tokenUsage: data.tokenUsage ?? null,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingText("");
              setStreaming(false);
              setQueuePosition(null);
              es.close();
            } else if (data.type === "error") {
              setError(data.data);
              setStreaming(false);
              es.close();
            }
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          setError("Connection lost");
          setStreaming(false);
          es.close();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
        setStreaming(false);
      }
    },
    [conversationId, streaming],
  );

  const stopGeneration = useCallback(async () => {
    if (currentJobId.current) {
      try {
        await apiFetch(`/api/chat/stop/${currentJobId.current}`, { method: "POST" });
      } catch {
        // ignore
      }
    }
    eventSourceRef.current?.close();
    setStreaming(false);

    // Save partial response as message
    if (streamingText) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversationId: conversationId!,
          role: "assistant",
          content: streamingText + "\n\n*[Generation stopped]*",
          tokenUsage: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingText("");
    }
  }, [conversationId, streamingText]);

  return {
    messages,
    streaming,
    streamingText,
    error,
    queuePosition,
    sendMessage,
    stopGeneration,
  };
}
