"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { UserProfile } from "@agent-terminal/shared";

interface UsageStat {
  userId: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  lastUsed: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usage, setUsage] = useState<UsageStat[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [u, s] = await Promise.all([
          apiFetch<UserProfile[]>("/api/admin/users"),
          apiFetch<UsageStat[]>("/api/admin/usage"),
        ]);
        setUsers(u);
        setUsage(s);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("Access denied. Admin only.");
        } else {
          setError("Failed to load admin data.");
        }
      }
    }
    load();
  }, []);

  async function updateUser(id: string, data: Partial<UserProfile>) {
    try {
      const updated = await apiFetch<UserProfile>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch {
      alert("Failed to update user");
    }
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <button
          onClick={() => router.push("/chat")}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            background: "var(--background)",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          Back to Chat
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Admin Panel</h1>
        <button
          onClick={() => router.push("/chat")}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            background: "var(--background)",
            color: "var(--foreground)",
            cursor: "pointer",
            fontSize: "0.8125rem",
          }}
        >
          Back to Chat
        </button>
      </div>

      <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Users</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", marginBottom: "2rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>User ID</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Role</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Quota</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Active</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                {user.userId.slice(0, 12)}...
              </td>
              <td style={{ padding: "0.5rem" }}>
                <select
                  value={user.role}
                  onChange={(e) => updateUser(user.id, { role: e.target.value as UserProfile["role"] })}
                  style={{
                    padding: "0.25rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option value="user">user</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={{ padding: "0.5rem" }}>{user.dailyQuota ?? "default"}</td>
              <td style={{ padding: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={user.isActive}
                  onChange={(e) => updateUser(user.id, { isActive: e.target.checked })}
                />
              </td>
              <td style={{ padding: "0.5rem" }}>-</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Usage Stats</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>User</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Model</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Requests</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Input Tokens</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Output Tokens</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Last Used</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((stat, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                {stat.userId.slice(0, 12)}...
              </td>
              <td style={{ padding: "0.5rem" }}>{stat.model}</td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>{stat.requestCount}</td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>{stat.totalInputTokens?.toLocaleString()}</td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>{stat.totalOutputTokens?.toLocaleString()}</td>
              <td style={{ padding: "0.5rem" }}>{new Date(stat.lastUsed).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
