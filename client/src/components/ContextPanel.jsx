import React, { useState } from "react";

/**
 * ContextPanel — shows AI-collected context during the "gathering" phase.
 * Helps users see what information the AI already has, so they don't repeat themselves.
 */

const CONTEXT_SECTIONS = [
  {
    key: "workflow_name",
    label: "Workflow Name",
    icon: "📋",
    color: "99, 102, 241",
    isArray: false,
  },
  {
    key: "loan_product",
    label: "Product",
    icon: "💳",
    color: "99, 102, 241",
    isArray: false,
  },
  {
    key: "target_customer_type",
    label: "Target Customer",
    icon: "👤",
    color: "16, 185, 129",
    isArray: false,
  },
  {
    key: "api_integrations",
    label: "API Integrations",
    icon: "🔌",
    color: "245, 158, 11",
    isArray: true,
  },
  {
    key: "data_collection_steps",
    label: "Data to Collect",
    icon: "📝",
    color: "249, 115, 22",
    isArray: true,
  },
  {
    key: "decision_criteria",
    label: "Decision Criteria",
    icon: "⚖️",
    color: "139, 92, 246",
    isArray: true,
  },
  {
    key: "teams_for_review",
    label: "Review Teams",
    icon: "👥",
    color: "236, 72, 153",
    isArray: true,
  },
  {
    key: "variables_needed",
    label: "Variables",
    icon: "📦",
    color: "148, 163, 184",
    isArray: true,
  },
  {
    key: "user_actions_needed",
    label: "User Screens",
    icon: "📱",
    color: "59, 130, 246",
    isArray: true,
  },
  {
    key: "approval_actions",
    label: "On Approval",
    icon: "✅",
    color: "16, 185, 129",
    isArray: true,
  },
  {
    key: "rejection_actions",
    label: "On Rejection",
    icon: "❌",
    color: "239, 68, 68",
    isArray: true,
  },
];

function hasData(context) {
  if (!context) return false;
  return Object.values(context).some((v) => {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

function countCollected(context) {
  if (!context) return 0;
  return CONTEXT_SECTIONS.filter((s) => {
    const v = context[s.key];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
}

export default function ContextPanel({ context, phase }) {
  const [collapsed, setCollapsed] = useState(false);

  // Only show during gathering phase with some collected data
  if (phase !== "gathering" || !hasData(context)) return null;

  const collected = countCollected(context);
  const total = CONTEXT_SECTIONS.length;
  const pct = Math.round((collected / total) * 100);

  return (
    <div
      style={{
        margin: "0 16px 12px 16px",
        borderRadius: "10px",
        border: "1px solid rgba(99,102,241,0.25)",
        background: "rgba(99,102,241,0.05)",
        overflow: "hidden",
        animation: "fadeSlideIn 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent-light)" }}>
            🧠 AI Context Collected
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "1px 8px",
              borderRadius: "20px",
              background: "rgba(99,102,241,0.2)",
              color: "var(--accent-light)",
              fontWeight: "500",
            }}
          >
            {collected}/{total} fields
          </span>
          {/* Progress bar */}
          <div
            style={{
              width: "80px",
              height: "4px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: pct >= 60 ? "#10b981" : "var(--accent)",
                borderRadius: "2px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{pct}%</span>
        </div>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          style={{
            padding: "0 14px 12px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {CONTEXT_SECTIONS.map((section) => {
            const value = context[section.key];
            const hasValue = Array.isArray(value) ? value.length > 0 : !!value;
            if (!hasValue) return null;

            const items = Array.isArray(value) ? value : [value];

            return (
              <div
                key={section.key}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "5px",
                  background: `rgba(${section.color}, 0.08)`,
                  border: `1px solid rgba(${section.color}, 0.2)`,
                  borderRadius: "8px",
                  padding: "5px 9px",
                  maxWidth: "100%",
                }}
              >
                <span style={{ fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>{section.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: `rgb(${section.color})`,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "2px",
                    }}
                  >
                    {section.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                    {items.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          color: "var(--text-primary)",
                          background: `rgba(${section.color}, 0.12)`,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={String(item)}
                      >
                        {String(item).length > 30 ? String(item).slice(0, 28) + "…" : String(item)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hint when enough data */}
          {pct >= 60 && (
            <div
              style={{
                width: "100%",
                marginTop: "4px",
                fontSize: "11px",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>✓</span>
              <span>Good progress! Type <code style={{ fontSize: "10px", background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: "3px" }}>/generate</code> to build the workflow now, or keep adding details.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
