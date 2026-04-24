import React, { useState, useRef, useEffect } from "react";

export default function ChatInput({ onSend, isLoading, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || isLoading || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: "14px 16px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg-secondary)",
    }}>
      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-end",
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 14px",
        transition: "border-color 0.15s",
        outline: "none",
      }}
        onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--border-accent)"}
        onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            isLoading
              ? "AI is thinking..."
              : "Describe your workflow or answer a question... (Enter to send)"
          }
          disabled={isLoading || disabled}
          rows={1}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "13.5px",
            lineHeight: "1.5",
            resize: "none",
            fontFamily: "var(--font-sans)",
            minHeight: "22px",
            maxHeight: "160px",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "none",
            background: !value.trim() || isLoading ? "var(--bg-hover)" : "var(--accent)",
            color: !value.trim() || isLoading ? "var(--text-muted)" : "#fff",
            cursor: !value.trim() || isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "15px",
            transition: "all 0.15s",
            transform: isLoading ? "none" : "scale(1)",
          }}
        >
          {isLoading ? (
            <span style={{
              width: "14px",
              height: "14px",
              border: "2px solid rgba(255,255,255,0.2)",
              borderTop: "2px solid #fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              display: "inline-block",
            }} />
          ) : "↑"}
        </button>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginTop: "8px",
      }}>
        <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
          Type <code style={{ fontSize: "10px" }}>/generate</code> to build immediately
        </span>
        <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
          <code style={{ fontSize: "10px" }}>save</code> to push to backend
        </span>
        <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
          <code style={{ fontSize: "10px" }}>Shift+Enter</code> for newline
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
