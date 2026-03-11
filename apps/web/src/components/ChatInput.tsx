"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, streaming, disabled }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [input]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || streaming || disabled) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      style={{
        padding: "1rem",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "0.5rem",
        alignItems: "flex-end",
      }}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        disabled={disabled}
        style={{
          flex: 1,
          resize: "none",
          padding: "0.75rem",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--background)",
          color: "var(--foreground)",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          outline: "none",
          fontFamily: "inherit",
        }}
      />

      {streaming ? (
        <button
          onClick={onStop}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--error)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            cursor: !input.trim() || disabled ? "not-allowed" : "pointer",
            opacity: !input.trim() || disabled ? 0.5 : 1,
            fontSize: "0.875rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Send
        </button>
      )}
    </div>
  );
}
