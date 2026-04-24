import React, { useState, useMemo } from "react";

/**
 * WorkflowVisualizer — SVG-based flowchart of the generated workflow.
 * No external dependencies (no ReactFlow). Pure SVG + React.
 * Renders each node as a colored box, edges as arrows.
 */

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
  triggerProcess: "#cbd5e1",
  wait_for_event: "#fbbf24",
  subProcess: "#34d399",
  parallel: "#f472b6",
};

const NODE_WIDTH = 130;
const NODE_HEIGHT = 44;
const CANVAS_PAD = 40;
const ARROW_HEAD = 8;

/**
 * Auto-layout nodes if positions not provided.
 * Simple left-to-right layout following outputs.
 */
function autoLayout(nodes) {
  const uuidToNode = {};
  nodes.forEach((n) => (uuidToNode[n.uuid] = n));

  // Find start node
  const startNode = nodes.find((n) => n.type === "start");
  if (!startNode) return {};

  const positions = {};
  const visited = new Set();
  const queue = [{ uuid: startNode.uuid, col: 0, row: 0 }];
  const colRows = {}; // col -> max row used

  while (queue.length > 0) {
    const { uuid, col, row } = queue.shift();
    if (visited.has(uuid)) continue;
    visited.add(uuid);

    if (!colRows[col]) colRows[col] = -1;
    const actualRow = Math.max(row, colRows[col] + 1);
    colRows[col] = actualRow;

    positions[uuid] = {
      x: CANVAS_PAD + col * (NODE_WIDTH + 70),
      y: CANVAS_PAD + actualRow * (NODE_HEIGHT + 50),
    };

    const node = uuidToNode[uuid];
    const outputs = node?.outputs || [];
    outputs.forEach((outUuid, i) => {
      if (!visited.has(outUuid)) {
        queue.push({ uuid: outUuid, col: col + 1, row: actualRow + i });
      }
    });
  }

  // Position any unvisited nodes at the bottom
  let extraRow = Math.max(...Object.values(colRows), 0) + 2;
  nodes.forEach((n) => {
    if (!positions[n.uuid]) {
      positions[n.uuid] = { x: CANVAS_PAD, y: CANVAS_PAD + extraRow * (NODE_HEIGHT + 50) };
      extraRow++;
    }
  });

  return positions;
}

/**
 * Calculate edge path between two node center points.
 * Returns an SVG path "d" string with a smooth bezier curve.
 */
function edgePath(from, to) {
  const fx = from.x + NODE_WIDTH;
  const fy = from.y + NODE_HEIGHT / 2;
  const tx = to.x;
  const ty = to.y + NODE_HEIGHT / 2;
  const cx = (fx + tx) / 2;
  return `M ${fx} ${fy} C ${cx} ${fy}, ${cx} ${ty}, ${tx} ${ty}`;
}

/**
 * Main SVG Visualizer component.
 */
export default function WorkflowVisualizer({ workflow }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, node }
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const { nodes = [], edges = [], positions: rawPositions = {} } = workflow || {};

  // Compute positions: prefer workflow.positions, fall back to auto-layout
  const positions = useMemo(() => {
    const hasPositions = Object.keys(rawPositions).length > 0;
    if (hasPositions) return rawPositions;
    return autoLayout(nodes);
  }, [nodes, rawPositions]);

  // Compute canvas size
  const { canvasW, canvasH } = useMemo(() => {
    if (Object.keys(positions).length === 0) return { canvasW: 600, canvasH: 300 };
    const xs = Object.values(positions).map((p) => p.x + NODE_WIDTH + CANVAS_PAD);
    const ys = Object.values(positions).map((p) => p.y + NODE_HEIGHT + CANVAS_PAD);
    return {
      canvasW: Math.max(600, Math.max(...xs)),
      canvasH: Math.max(300, Math.max(...ys)),
    };
  }, [positions]);

  if (!workflow || nodes.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-muted)", fontSize: "13px" }}>
        No workflow to visualize yet
      </div>
    );
  }

  const uuidToPos = (uuid) => positions[uuid] || { x: 0, y: 0 };

  // Build edge list with conditional label
  const edgeList = edges.map((edge, i) => {
    const fromPos = uuidToPos(edge.source);
    const toPos = uuidToPos(edge.target);
    const isConditional = edge.sourceHandle === "a" || edge.sourceHandle === "b";
    const label = isConditional ? (edge.sourceHandle === "a" ? "Yes" : "No") : "";
    const color = isConditional ? (edge.sourceHandle === "a" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.2)";
    return { ...edge, fromPos, toPos, label, color, key: i };
  });

  return (
    <div style={{ position: "relative", overflow: "auto", width: "100%", background: "#0d1117", borderRadius: "8px", border: "1px solid var(--border)" }}>
      {/* Legend */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {[
          { type: "start", label: "Start/End" },
          { type: "apiCall", label: "API Call" },
          { type: "userInteraction", label: "User Screen" },
          { type: "conditional", label: "Conditional" },
          { type: "review", label: "Review" },
          { type: "textMessage", label: "SMS" },
        ].map(({ type, label }) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: NODE_COLORS[type] || "#64748b", flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <span style={{ fontSize: "10px", color: "#10b981" }}>— Yes path</span>
          <span style={{ fontSize: "10px", color: "#ef4444" }}>— No path</span>
        </div>
      </div>

      <svg
        width={canvasW}
        height={canvasH}
        style={{ display: "block", minWidth: "100%" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Arrow head definitions */}
        <defs>
          {["default", "yes", "no"].map((id) => {
            const color = id === "yes" ? "#10b981" : id === "no" ? "#ef4444" : "rgba(255,255,255,0.3)";
            return (
              <marker key={id} id={`arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={color} />
              </marker>
            );
          })}
        </defs>

        {/* Edges */}
        {edgeList.map((edge) => {
          const markerId = edge.sourceHandle === "a" ? "arrow-yes" : edge.sourceHandle === "b" && edgeList.some(e => e.source === edge.source && e.sourceHandle === "a") ? "arrow-no" : "arrow-default";
          const isHovered = hoveredEdge === edge.key;
          return (
            <g key={edge.key}>
              <path
                d={edgePath(edge.fromPos, edge.toPos)}
                fill="none"
                stroke={isHovered ? "#818cf8" : edge.color}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeDasharray={edge.label ? "none" : "none"}
                markerEnd={`url(#${markerId})`}
                style={{ transition: "stroke 0.15s", cursor: "pointer" }}
                onMouseEnter={() => setHoveredEdge(edge.key)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
              {/* Edge label for conditional */}
              {edge.label && (() => {
                const fx = edge.fromPos.x + NODE_WIDTH;
                const fy = edge.fromPos.y + NODE_HEIGHT / 2;
                const tx = edge.toPos.x;
                const ty = edge.toPos.y + NODE_HEIGHT / 2;
                const midX = (fx + tx) / 2;
                const midY = (fy + ty) / 2;
                return (
                  <g>
                    <rect x={midX - 14} y={midY - 9} width={28} height={16} rx={4} fill="#1a1a24" stroke={edge.color} strokeWidth={0.5} />
                    <text x={midX} y={midY + 4} textAnchor="middle" fill={edge.color} fontSize={9} fontFamily="Inter, sans-serif" fontWeight="600">
                      {edge.label}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = uuidToPos(node.uuid);
          const color = NODE_COLORS[node.type] || "#64748b";
          const isStartStop = node.type === "start" || node.type === "stop";
          const rx = isStartStop ? NODE_HEIGHT / 2 : 8;
          const w = isStartStop ? 80 : NODE_WIDTH;
          const offsetX = isStartStop ? (NODE_WIDTH - w) / 2 : 0;
          const label = (node.name || node.type).length > 16
            ? (node.name || node.type).slice(0, 15) + "…"
            : (node.name || node.type);

          return (
            <g
              key={node.uuid}
              transform={`translate(${pos.x + offsetX}, ${pos.y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => setTooltip({ x: pos.x + offsetX + w / 2, y: pos.y - 10, node })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Node shadow */}
              <rect x={2} y={2} width={w} height={NODE_HEIGHT} rx={rx} fill="rgba(0,0,0,0.4)" />
              {/* Node body */}
              <rect
                x={0} y={0}
                width={w} height={NODE_HEIGHT}
                rx={rx}
                fill={color}
                fillOpacity={0.9}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.8}
              />
              {/* Node label */}
              <text
                x={w / 2}
                y={NODE_HEIGHT / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={11}
                fontFamily="Inter, sans-serif"
                fontWeight="600"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {label}
              </text>
              {/* Node type badge */}
              <text
                x={w / 2}
                y={NODE_HEIGHT - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize={7.5}
                fontFamily="Inter, sans-serif"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.type}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const node = tooltip.node;
          const lines = [
            `Type: ${node.type}`,
            `UUID: ${node.uuid}`,
            node.outputs?.length ? `Outputs: ${node.outputs.length}` : null,
          ].filter(Boolean);
          const boxW = 160;
          const boxH = lines.length * 14 + 14;
          const tx = Math.min(tooltip.x - boxW / 2, canvasW - boxW - 10);
          const ty = Math.max(tooltip.y - boxH - 4, 5);
          return (
            <g>
              <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill="#1e1e2e" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              {lines.map((line, i) => (
                <text key={i} x={tx + 8} y={ty + 14 + i * 14} fill="#cbd5e1" fontSize={10} fontFamily="Inter, sans-serif">
                  {line}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>

      <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)" }}>
        <span>{nodes.length} nodes · {edges.length} edges</span>
        <span>Hover nodes for details</span>
      </div>
    </div>
  );
}
