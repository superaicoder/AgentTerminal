"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "0.25rem 1rem",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "0.75rem 1rem",
          borderRadius: "12px",
          background: isUser ? "var(--bubble-user)" : "var(--bubble-assistant)",
          color: isUser ? "#fff" : "var(--foreground)",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          wordBreak: "break-word",
        }}
      >
        {isUser ? (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{content}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown
              components={{
                pre: ({ children }) => (
                  <pre
                    style={{
                      background: "var(--background)",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      overflow: "auto",
                      fontSize: "0.8125rem",
                      margin: "0.5rem 0",
                    }}
                  >
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      style={{
                        background: "var(--background)",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "4px",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {children}
                    </code>
                  ) : (
                    <code>{children}</code>
                  );
                },
                p: ({ children }) => <p style={{ margin: "0.5rem 0" }}>{children}</p>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
