"use client";

import { useRouter, useParams } from "next/navigation";
import type { Conversation } from "@agent-terminal/shared";

interface Props {
  conversations: Conversation[];
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function ChatSidebar({ conversations, onNew, onDelete, onRename }: Props) {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  return (
    <aside
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100vh",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem" }}>
        <button
          onClick={onNew}
          style={{
            width: "100%",
            padding: "0.625rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          + New Chat
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 0.5rem" }}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => router.push(`/chat/${conv.id}`)}
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8125rem",
              background: activeId === conv.id ? "var(--border)" : "transparent",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2px",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {conv.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this conversation?")) onDelete(conv.id);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: "0.75rem",
                flexShrink: 0,
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--border)",
          fontSize: "0.75rem",
          color: "var(--muted)",
        }}
      >
        AgentTerminal
      </div>
    </aside>
  );
}
