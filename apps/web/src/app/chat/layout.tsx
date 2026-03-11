"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import ChatSidebar from "@/components/ChatSidebar";
import { useConversations } from "@/hooks/useConversations";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { conversations, createConversation, deleteConversation, renameConversation } =
    useConversations();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  async function handleNew() {
    const conv = await createConversation();
    router.push(`/chat/${conv.id}`);
  }

  async function handleDelete(id: string) {
    await deleteConversation(id);
    router.push("/chat");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChatSidebar
        conversations={conversations}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={renameConversation}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            fontSize: "0.8125rem",
          }}
        >
          <span style={{ fontWeight: 600 }}>AgentTerminal</span>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ color: "var(--muted)" }}>{session.user.email}</span>
            <button
              onClick={() => router.push("/admin")}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Admin
            </button>
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Sign Out
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
