"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Conversation } from "@agent-terminal/shared";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiFetch<Conversation[]>("/api/conversations");
      setConversations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async (title?: string) => {
    const conv = await apiFetch<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title: title ?? "New Chat" }),
    });
    setConversations((prev) => [conv, ...prev]);
    return conv;
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const updated = await apiFetch<Conversation>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await apiFetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    conversations,
    loading,
    createConversation,
    renameConversation,
    deleteConversation,
    refresh: fetchConversations,
  };
}
