import React from "react";

const PHASES = [
  { key: "gathering", label: "Gathering", icon: "🔍" },
  { key: "confirming", label: "Confirming", icon: "✓" },
  { key: "generated", label: "Generated", icon: "⚡" },
  { key: "complete", label: "Saved", icon: "✅" },
];

const PHASE_COLORS = {
  idle: "#64748b",
  gathering: "#6366f1",
  confirming: "#f59e0b",
  generated: "#10b981",
  generating_failed: "#ef4444",
  complete: "#10b981",
};

export default function PhaseIndicator({ phase }) {
  if (!phase || phase === "idle") return null;

  const currentIndex = PHASES.findIndex((p) => p.key === phase);
  const color = PHASE_COLORS[phase] || "#6366f1";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 12px",
    }}>
      {PHASES.map((p, i) => {
        const isActive = p.key === phase;
        const isDone = i < currentIndex;
        const isFuture = i > currentIndex;

        return (
          <React.Fragment key={p.key}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: isFuture ? 0.35 : 1,
            }}>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: isActive ? color : isDone ? "#10b981" : "var(--bg-hover)",
                border: isActive ? `2px solid ${color}` : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                transition: "all 0.3s",
                boxShadow: isActive ? `0 0 8px ${color}55` : "none",
              }}>
                {isDone ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "11px",
                color: isActive ? "var(--text-primary)" : isDone ? "#10b981" : "var(--text-muted)",
                fontWeight: isActive ? "600" : "400",
                whiteSpace: "nowrap",
              }}>
                {p.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{
                flex: 1,
                height: "1px",
                background: isDone ? "#10b981" : "var(--border)",
                minWidth: "16px",
                maxWidth: "32px",
                transition: "all 0.3s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
