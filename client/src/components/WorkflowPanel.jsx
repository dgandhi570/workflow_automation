import React, { useState } from "react";
import WorkflowVisualizer from "./WorkflowVisualizer";
import { workflowApi } from "../services/api";

const styles = {
  panel: {
    width: "380px",
    flexShrink: 0,
    background: "var(--bg-secondary)",
    borderLeft: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "16px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: (color) => ({
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "20px",
    background: `rgba(${color}, 0.15)`,
    border: `1px solid rgba(${color}, 0.3)`,
    color: `rgb(${color})`,
    fontWeight: "500",
  }),
  content: {
    flex: 1,
    overflow: "auto",
    padding: "16px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
    color: "var(--text-muted)",
    textAlign: "center",
    padding: "20px",
  },
  emptyIcon: {
    fontSize: "40px",
    opacity: 0.4,
  },
  section: {
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  metaCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
  },
  metaLabel: {
    fontSize: "10px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  metaValue: {
    fontSize: "16px",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
  },
  tag: (color) => ({
    fontSize: "11px",
    padding: "2px 9px",
    borderRadius: "20px",
    background: `rgba(${color}, 0.1)`,
    border: `1px solid rgba(${color}, 0.2)`,
    color: `rgb(${color})`,
  }),
  nodeList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  nodeItem: (type) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
  }),
  nodeDot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  validationBox: (valid) => ({
    padding: "12px",
    borderRadius: "var(--radius-md)",
    background: valid ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
    border: `1px solid ${valid ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
    marginBottom: "12px",
  }),
  validTitle: (valid) => ({
    fontSize: "12px",
    fontWeight: "600",
    color: valid ? "#10b981" : "#ef4444",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  }),
  issueList: {
    listStyle: "none",
    fontSize: "11px",
    color: "var(--text-secondary)",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  footer: {
    padding: "14px 16px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    gap: "8px",
  },
  btn: (variant) => ({
    flex: variant === "primary" ? 2 : 1,
    padding: "9px",
    borderRadius: "var(--radius-sm)",
    border: variant === "primary" ? "none" : "1px solid var(--border)",
    background: variant === "primary" ? "var(--accent)" : "transparent",
    color: variant === "primary" ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  }),
};

const NODE_COLORS = {
  start: "#10b981",
  stop: "#ef4444",
  conditional: "#6366f1",
  apiCall: "#f59e0b",
  userInteraction: "#f97316",
  setVariable: "#94a3b8",
  textMessage: "#64748b",
  review: "#10b981",
  delay: "#a78bfa",
  split: "#84cc16",
  join: "#fb923c",
  error: "#ec4899",
  timeout: "#ec4899",
  triggerProcess: "#e2e8f0",
  wait_for_event: "#fbbf24",
};

export default function WorkflowPanel({ workflow, validation, isSaving, onSave }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!workflow) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>
            <span>📋</span> Workflow Preview
          </span>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔄</div>
          <div style={{ fontWeight: "600", color: "var(--text-secondary)" }}>No workflow yet</div>
          <div style={{ fontSize: "12px" }}>Describe your workflow in the chat and the AI will generate it here.</div>
        </div>
      </div>
    );
  }

  const { journey, nodes = [] } = workflow;

  const nodeCounts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  const getExportJson = async () => {
    try {
      return await workflowApi.exportWorkflow(workflow);
    } catch (e) {
      console.error("Export transform failed, falling back to raw format", e);
      return workflow;
    }
  };

  const copyJson = async () => {
    const exported = await getExportJson();
    navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = async () => {
    setIsExporting(true);
    try {
      const exported = await getExportJson();
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow_${(journey?.name || "workflow").replace(/\s+/g, "_")}_v1_${new Date()
        .toISOString()
        .replace(/[-:T.]/g, "")
        .slice(0, 14)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = ["overview", "nodes", "visual", "json"];

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>
          <span>📋</span>
          {journey?.name || "Workflow"}
        </span>
        <span style={styles.badge("99, 102, 241")}>{nodes.length} nodes</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              color: activeTab === tab ? "var(--accent-light)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: activeTab === tab ? "600" : "400",
              textTransform: "capitalize",
              transition: "all 0.15s",
              marginBottom: "-1px",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === "overview" && (
          <>
            {/* Validation */}
            {validation && (
              <div style={styles.validationBox(validation.is_valid)}>
                <div style={styles.validTitle(validation.is_valid)}>
                  {validation.is_valid ? "✓ Valid Workflow" : "✗ Issues Found"}
                </div>
                {validation.errors?.length > 0 && (
                  <ul style={styles.issueList}>
                    {validation.errors.map((e, i) => <li key={i}>⚠️ {e}</li>)}
                  </ul>
                )}
                {validation.warnings?.length > 0 && (
                  <ul style={{ ...styles.issueList, marginTop: "6px" }}>
                    {validation.warnings.map((w, i) => <li key={i}>💡 {w}</li>)}
                  </ul>
                )}
              </div>
            )}

            {/* Stats */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📊 Stats</div>
              <div style={styles.metaGrid}>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Nodes</div>
                  <div style={styles.metaValue}>{nodes.length}</div>
                </div>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Target</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {journey?.targetType || "Customer"}
                  </div>
                </div>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>APIs</div>
                  <div style={styles.metaValue}>{(journey?.apiCalls || []).length}</div>
                </div>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Variables</div>
                  <div style={styles.metaValue}>{(journey?.variables || []).length}</div>
                </div>
              </div>
            </div>

            {/* Teams */}
            {journey?.teams?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>👥 Teams</div>
                <div style={styles.tagList}>
                  {journey.teams.map((t, i) => (
                    <span key={i} style={styles.tag("99, 102, 241")}>
                      {typeof t === "string" ? t : t.label || t.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* API Calls */}
            {journey?.apiCalls?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>🔌 API Integrations</div>
                <div style={styles.tagList}>
                  {journey.apiCalls.map((a, i) => (
                    <span key={i} style={styles.tag("245, 158, 11")}>
                      {typeof a === "string" ? a : a.label || a.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variables */}
            {journey?.variables?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📦 Variables</div>
                <div style={styles.tagList}>
                  {journey.variables.map((v, i) => (
                    <span key={i} style={styles.tag("148, 163, 184")}>
                      {typeof v === "string" ? v : v.label || v.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "nodes" && (
          <div style={styles.nodeList}>
            {nodes.map((node, i) => (
              <div key={i} style={styles.nodeItem(node.type)}>
                <div style={styles.nodeDot(NODE_COLORS[node.type] || "#64748b")} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {node.name || node.type}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {node.type}
                  </div>
                </div>
                {node.outputs?.length > 0 && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    → {node.outputs.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "visual" && (
          <WorkflowVisualizer workflow={workflow} />
        )}

        {activeTab === "json" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "6px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Production-ready format for website upload
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={copyJson}
                  style={{ ...styles.btn("secondary"), flex: "none", padding: "5px 12px" }}
                >
                  {copied ? "✓ copied" : "copy"}
                </button>
                <button
                  onClick={downloadJson}
                  disabled={isExporting}
                  style={{ ...styles.btn("secondary"), flex: "none", padding: "5px 12px", opacity: isExporting ? 0.7 : 1 }}
                >
                  {isExporting ? "..." : "⬇ download"}
                </button>
              </div>
            </div>
            <pre style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              background: "#0d1117",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "12px",
              overflow: "auto",
              maxHeight: "500px",
              lineHeight: "1.6",
            }}>
              {JSON.stringify(workflow, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.btn("secondary")} onClick={copyJson}>
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
        <button style={{ ...styles.btn("secondary"), opacity: isExporting ? 0.7 : 1 }} onClick={downloadJson} disabled={isExporting}>
          {isExporting ? "Exporting..." : "⬇ Export"}
        </button>
        <button
          style={{ ...styles.btn("primary"), opacity: isSaving ? 0.7 : 1 }}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "💾 Save to Backend"}
        </button>
      </div>
    </div>
  );
}
