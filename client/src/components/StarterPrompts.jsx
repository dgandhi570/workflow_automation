import React from "react";

export default function StarterPrompts({ prompts, onSelect }) {
  return (
    <div style={{ padding: "4px 0 16px 42px" }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        {prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(p)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "6px 14px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              transition: "all 0.15s",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent-light)";
              e.currentTarget.style.background = "var(--accent-dim)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
