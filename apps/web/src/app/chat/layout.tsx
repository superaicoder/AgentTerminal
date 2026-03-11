"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import ChatSidebar from "@/components/ChatSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useConversations } from "@/hooks/useConversations";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { conversations, createConversation, deleteConversation, renameConversation } =
    useConversations();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  // Close sidebar on route change (mobile)
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
    closeSidebar();
  }

  async function handleDelete(id: string) {
    await deleteConversation(id);
    router.push("/chat");
  }

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-container ${sidebarOpen ? "sidebar-open" : ""}`}>
        <ChatSidebar
          conversations={conversations}
          onNew={handleNew}
          onDelete={handleDelete}
          onRename={renameConversation}
          onSelect={closeSidebar}
        />
      </div>

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "none",
                border: "none",
                color: "var(--foreground)",
                cursor: "pointer",
                fontSize: "1.25rem",
                padding: "0.25rem",
                lineHeight: 1,
              }}
            >
              &#9776;
            </button>
            <span style={{ fontWeight: 600 }}>AgentTerminal</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <ThemeToggle />
            <span className="header-email" style={{ color: "var(--muted)" }}>{session.user.email}</span>
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
