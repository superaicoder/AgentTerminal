"use client";

import { useParams } from "next/navigation";
import ChatInput from "@/components/ChatInput";
import MessageList from "@/components/MessageList";
import { useChat } from "@/hooks/useChat";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const { messages, streaming, streamingText, error, queuePosition, sendMessage, stopGeneration } =
    useChat(conversationId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <MessageList
        messages={messages}
        streamingText={streamingText}
        streaming={streaming}
        queuePosition={queuePosition}
      />

      {error && (
        <div
          style={{
            padding: "0.5rem 1rem",
            color: "var(--error)",
            fontSize: "0.8125rem",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <ChatInput onSend={sendMessage} onStop={stopGeneration} streaming={streaming} />
    </div>
  );
}
