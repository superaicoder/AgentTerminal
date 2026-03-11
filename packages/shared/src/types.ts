export type Role = "admin" | "manager" | "user";

export interface UserProfile {
  id: string;
  userId: string;
  role: Role;
  dailyQuota: number | null;
  isActive: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  claudeSessionId: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokenUsage: { input?: number; output?: number } | null;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  userId: string;
  conversationId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  status: "completed" | "error" | "timeout" | "cancelled";
  createdAt: string;
}

export interface ChatSendRequest {
  conversationId: string;
  message: string;
  model?: string;
}

export interface ChatSendResponse {
  jobId: string;
  position: number;
}

export interface SSEEvent {
  type: "delta" | "done" | "error" | "queue_position";
  data: string;
  messageId?: string;
  tokenUsage?: { input: number; output: number };
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}
