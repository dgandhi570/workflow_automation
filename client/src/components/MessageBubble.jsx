import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const styles = {
  wrapper: (role) => ({
    display: "flex",
    flexDirection: role === "user" ? "row-reverse" : "row",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "20px",
    animation: "fadeSlideIn 0.2s ease",
  }),
  avatar: (role) => ({
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    flexShrink: 0,
    background: role === "user"
      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
      : "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    fontWeight: "600",
    marginTop: "2px",
  }),
  bubble: (role, isError) => ({
    maxWidth: "78%",
    padding: "12px 16px",
    borderRadius: role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
    background: isError
      ? "rgba(239, 68, 68, 0.1)"
      : role === "user"
      ? "linear-gradient(135deg, #6366f1, #7c3aed)"
      : "var(--bg-card)",
    border: isError
      ? "1px solid rgba(239,68,68,0.3)"
      : role === "user"
      ? "none"
      : "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--text-primary)",
    lineHeight: "1.65",
    wordBreak: "break-word",
  }),
  time: {
    fontSize: "11px",
    color: "var(--text-muted)",
    marginTop: "5px",
    textAlign: "right",
  },
  copyBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    borderRadius: "5px",
    padding: "3px 10px",
    cursor: "pointer",
    fontSize: "11px",
    transition: "all 0.15s",
  },
  codeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px",
    background: "#161b22",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px 8px 0 0",
  },
  codeLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  workflowBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#10b981",
    borderRadius: "20px",
    padding: "2px 10px",
    fontSize: "11px",
    fontWeight: "500",
    marginTop: "8px",
  },
};

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ margin: "10px 0", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={styles.codeHeader}>
        <span style={styles.codeLabel}>{language || "code"}</span>
        <button style={styles.copyBtn} onClick={copy}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: "0 0 8px 8px", fontSize: "12.5px", maxHeight: "400px" }}
        showLineNumbers={language === "json"}
        wrapLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message }) {
  const { role, content, timestamp, isError, hasWorkflow } = message;

  if (role === "system_error") {
    return (
      <div style={{
        padding: "10px 16px",
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: "8px",
        color: "#ef4444",
        fontSize: "13px",
        marginBottom: "16px",
      }}>
        ⚠️ {content}
      </div>
    );
  }

  if (role === "system") return null;

  return (
    <div style={styles.wrapper(role)}>
      <div style={styles.avatar(role)}>
        {role === "user" ? "U" : "AI"}
      </div>
      <div>
        <div style={styles.bubble(role, isError)}>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                if (!inline && match) {
                  return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />;
                }
                return (
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12.5px",
                      background: "rgba(255,255,255,0.08)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ children }) => <p style={{ marginBottom: "8px", lastChild: { marginBottom: 0 } }}>{children}</p>,
              ul: ({ children }) => <ul style={{ paddingLeft: "18px", marginBottom: "8px" }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: "18px", marginBottom: "8px" }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: role === "user" ? "#fff" : "var(--text-primary)", fontWeight: 600 }}>{children}</strong>,
              h2: ({ children }) => <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px", marginTop: "10px", color: "var(--accent-light)" }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "5px", marginTop: "8px" }}>{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: "3px solid var(--warning)",
                  paddingLeft: "12px",
                  margin: "8px 0",
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                }}>
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {hasWorkflow && (
            <div style={styles.workflowBadge}>
              <span>✓</span> Workflow JSON generated
            </div>
          )}
        </div>
        {timestamp && <div style={styles.time}>{formatTime(timestamp)}</div>}
      </div>
    </div>
  );
}
