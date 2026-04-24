/**
 * workflowExporter.js
 *
 * Transforms the AI-generated internal workflow format into the exact production
 * export format used by the Yabx workflow website for JSON import/upload.
 *
 * Internal (AI) format:
 *   { journey: {...}, nodes: [...], edges: [...], positions: {...} }
 *
 * Production format:
 *   { name, description, target_type, nodes: [...], flow: { edges, nodes, globalData }, variables, teams, api_calls, user_actions }
 */

// ─── Node visual config ───────────────────────────────────────────────────────

const NODE_VISUAL = {
  start: {
    color: "#000000",
    image: "mdiPlay",
    style: { color: "#FFFFFF", backgroundColor: "#FA573C" },
    title: "Start Node",
    flowType: "start",
    width: 149,
    height: 67,
  },
  stop: {
    color: "#000000",
    image: "mdiStop",
    style: { color: "#FFFFFF", backgroundColor: "#FA573C" },
    title: "Stop Node",
    flowType: "stop",
    width: 149,
    height: 67,
  },
  userInteraction: {
    color: "rgb(255, 117, 55)",
    image: "mdiAccountDetailsOutline",
    style: { color: "#FFFFFF", backgroundColor: "#FF7537" },
    title: "User Interaction",
    flowType: "custom",
    width: 160,
    height: 67,
  },
  apiCall: {
    color: "rgb(179, 220, 108)",
    image: "mdiRobotHappyOutline",
    style: { color: "#FFFFFF", backgroundColor: "#B3DC6C" },
    title: "API Call",
    flowType: "custom",
    width: 184,
    height: 67,
  },
  conditional: {
    color: "rgb(73, 134, 231)",
    image: "mdiCodeTagsCheck",
    style: { color: "#FFFFFF", backgroundColor: "#4986E7" },
    title: "Conditional",
    flowType: "custom",
    width: 176,
    height: 67,
  },
  review: {
    color: "rgb(16, 185, 129)",
    image: "mdiAccountCheck",
    style: { color: "#FFFFFF", backgroundColor: "#10b981" },
    title: "Review",
    flowType: "custom",
    width: 149,
    height: 67,
  },
  setVariable: {
    color: "rgb(148, 163, 184)",
    image: "mdiVariable",
    style: { color: "#FFFFFF", backgroundColor: "#94a3b8" },
    title: "Set Variable",
    flowType: "custom",
    width: 149,
    height: 67,
  },
  textMessage: {
    color: "rgb(100, 116, 139)",
    image: "mdiMessage",
    style: { color: "#FFFFFF", backgroundColor: "#64748b" },
    title: "Text Message",
    flowType: "custom",
    width: 160,
    height: 67,
  },
  delay: {
    color: "rgb(167, 139, 250)",
    image: "mdiTimer",
    style: { color: "#FFFFFF", backgroundColor: "#a78bfa" },
    title: "Delay",
    flowType: "custom",
    width: 149,
    height: 67,
  },
  wait_for_event: {
    color: "rgb(251, 191, 36)",
    image: "mdiClockOutline",
    style: { color: "#FFFFFF", backgroundColor: "#fbbf24" },
    title: "Wait for Event",
    flowType: "custom",
    width: 160,
    height: 67,
  },
  triggerProcess: {
    color: "rgb(226, 232, 240)",
    image: "mdiPlay",
    style: { color: "#FFFFFF", backgroundColor: "#e2e8f0" },
    title: "Trigger Process",
    flowType: "custom",
    width: 160,
    height: 67,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Build a map of nodeUuid → [sourceUuids] (who points INTO this node) */
function buildInputMap(nodes, edges) {
  const map = {};
  for (const n of nodes) map[n.uuid] = [];
  for (const e of edges || []) {
    if (!map[e.target]) map[e.target] = [];
    map[e.target].push(e.source);
  }
  return map;
}

/** Normalise any string/object reference to { label, value } */
function toTagObject(item) {
  if (!item) return null;
  if (typeof item === "string") return { label: item, value: item };
  return { label: item.label || item.value || String(item), value: item.value || item.label || String(item) };
}

function toTagArray(arr) {
  return (arr || []).map(toTagObject).filter(Boolean);
}

// ─── Conditional helpers ──────────────────────────────────────────────────────

const OPERATOR_SYMBOL_TO_VALUE = {
  "=": "equal",
  ">": "greater",
  "<": "less",
  ">=": "greater_or_equal",
  "<=": "less_or_equal",
  "!=": "not_equal",
};

const OPERATOR_NAME_TO_SYMBOL = {
  equal: "=",
  equals: "=",
  greater: ">",
  greater_than: ">",
  less: "<",
  less_than: "<",
  not_equal: "!=",
  not_equals: "!=",
  contains: "contains",
};

/** Extract the operator symbol (e.g. ">", "=") from whatever format the AI used */
function extractOperatorSymbol(node) {
  const props = node.properties || {};

  // Already a symbol (from a node that came from production format)
  if (node.conditionalWfConditionale) return node.conditionalWfConditionale;

  // properties.conditional array  →  [{label: ">", value: "greater"}]
  if (Array.isArray(props.conditional) && props.conditional[0]) {
    const v = props.conditional[0].label || props.conditional[0].value || "";
    return OPERATOR_NAME_TO_SYMBOL[v] || v || "=";
  }
  // properties.conditional object
  if (props.conditional && typeof props.conditional === "object") {
    const v = props.conditional.label || props.conditional.value || "";
    return OPERATOR_NAME_TO_SYMBOL[v] || v || "=";
  }

  // properties.comparator_type used as operator (internal AI format quirk)
  const rawOp = Array.isArray(props.comparator_type)
    ? props.comparator_type[0]?.value
    : typeof props.comparator_type === "object"
    ? props.comparator_type?.value
    : props.comparator_type;
  if (rawOp) return OPERATOR_NAME_TO_SYMBOL[rawOp] || rawOp || "=";

  // Flat node fields
  if (node.comparator_type) return OPERATOR_NAME_TO_SYMBOL[node.comparator_type] || "=";

  return "=";
}

/** Infer data type (Number / String) from the comparator value */
function inferDataType(comparator) {
  if (comparator !== undefined && comparator !== "" && !isNaN(Number(comparator))) return "Number";
  if (typeof comparator === "string" && (comparator === "True" || comparator === "False")) return "String";
  return "String";
}

/** Extract the variable reference from the conditional node */
function extractVariable(node) {
  const props = node.properties || {};
  const raw = props.variable || node.variable || node.conditionalWfVariable || {};
  return toTagObject(raw) || { label: "", value: "" };
}

/** Extract comparator value */
function extractComparator(node) {
  const props = node.properties || {};
  return props.comparator ?? node.comparator ?? node.conditionalWfComparator ?? "";
}

// ─── Backend node builders ────────────────────────────────────────────────────

function buildBackendNode(node, inputMap) {
  const base = {
    name: node.name || node.type,
    type: node.type,
    uuid: node.uuid,
    notes: node.notes || "",
    inputs: inputMap[node.uuid] || [],
    outputs: node.outputs || [],
  };

  switch (node.type) {
    case "start":
    case "stop":
      return base;

    case "userInteraction": {
      const actions = node.actions || (node.action ? [{ value: node.action, label: node.action }] : []);
      const action = actions[0]?.value || actions[0]?.label || "";
      return {
        ...base,
        action,
        params: {},
        enable_payload: node.enable_payload !== undefined ? node.enable_payload : true,
        enable_extraction: node.enable_extraction !== undefined ? node.enable_extraction : false,
        payload_extractors: {},
      };
    }

    case "apiCall": {
      const apiCallName =
        node.api_call?.value || node.api_call?.label || node.apiCall || node.apiCallName || "";
      return { ...base, apiCall: apiCallName, apiCallParams: null };
    }

    case "conditional": {
      const variable = extractVariable(node);
      const comparator = String(extractComparator(node));
      const operatorSymbol = extractOperatorSymbol(node);
      const comparatorType = node.conditionalWfComparatorType || inferDataType(comparator);
      const condType =
        (node.properties?.condition_type?.value) ||
        (typeof node.condition_type === "string" ? node.condition_type : node.condition_type?.value) ||
        "wf";

      return {
        ...base,
        conditionalCode: "",
        conditionalType: condType.toLowerCase(),
        conditionalPredefined: null,
        conditionalWfVariable: variable,
        conditionalWfComparator: comparator,
        conditionalWfConditionale: operatorSymbol,
        conditionalWfComparatorType: comparatorType,
      };
    }

    case "review": {
      const teams = node.teams
        ? Array.isArray(node.teams)
          ? node.teams.map(toTagObject)
          : [toTagObject(node.teams)]
        : [];
      return { ...base, teams };
    }

    case "setVariable": {
      return {
        ...base,
        variable: node.variable || {},
        value: node.value || "",
      };
    }

    case "textMessage": {
      return {
        ...base,
        template: node.template || "",
        template_frequency: node.template_frequency || { value: "Send only once", label: "Send only once" },
      };
    }

    case "delay": {
      return { ...base, delay: node.delay || {} };
    }

    case "wait_for_event": {
      const itemType =
        node.properties?.item_type || node.item_type || {};
      return { ...base, item_type: toTagObject(itemType) };
    }

    case "triggerProcess": {
      const process =
        node.properties?.process_name || node.process_name || {};
      return { ...base, process_name: toTagObject(process) };
    }

    default:
      return base;
  }
}

// ─── React Flow node builders ─────────────────────────────────────────────────

function buildFlowNodeProperties(node) {
  switch (node.type) {
    case "userInteraction": {
      const actions = node.actions || (node.action ? [{ value: node.action, label: node.action }] : []);
      const action = actions[0]?.value || actions[0]?.label || "";
      return {
        actions: [{ label: action, value: action }],
        isDisabled: false,
        parameters: "",
        enable_payload: node.enable_payload !== undefined ? node.enable_payload : true,
      };
    }

    case "apiCall": {
      const apiCallName =
        node.api_call?.value || node.api_call?.label || node.apiCall || "";
      return {
        api_call: [{ label: apiCallName, value: apiCallName }],
        isDisabled: false,
      };
    }

    case "conditional": {
      const variable = extractVariable(node);
      const comparator = String(extractComparator(node));
      const operatorSymbol = extractOperatorSymbol(node);
      const operatorValue = OPERATOR_SYMBOL_TO_VALUE[operatorSymbol] || "equal";
      const comparatorType = node.conditionalWfComparatorType || inferDataType(comparator);
      const condTypeVal =
        (node.properties?.condition_type?.value) ||
        (typeof node.condition_type === "string" ? node.condition_type : node.condition_type?.value) ||
        "WF";

      return {
        code: "",
        variable: [variable],
        comparator,
        isDisabled: false,
        conditional: [{ label: operatorSymbol, value: operatorValue }],
        condition_type: { label: condTypeVal.toUpperCase(), value: condTypeVal.toUpperCase() },
        comparator_type: [{ label: comparatorType, value: comparatorType.toLowerCase() }],
        condition_value: [],
      };
    }

    case "review": {
      const teams = node.teams
        ? (Array.isArray(node.teams) ? node.teams : [node.teams]).map(toTagObject)
        : [];
      return { teams, isDisabled: false };
    }

    case "setVariable":
      return { variable: node.variable || {}, value: node.value || "", isDisabled: false };

    case "textMessage":
      return {
        template: node.template || "",
        template_frequency: node.template_frequency || { value: "Send only once", label: "Send only once" },
        isDisabled: false,
      };

    case "delay":
      return { delay: node.delay || {}, isDisabled: false };

    case "wait_for_event": {
      const itemType = node.properties?.item_type || node.item_type || {};
      return { item_type: toTagObject(itemType) || {}, isDisabled: false };
    }

    case "triggerProcess": {
      const process = node.properties?.process_name || node.process_name || {};
      return { process_name: toTagObject(process) || {}, isDisabled: false };
    }

    default:
      return { isDisabled: false };
  }
}

function buildFlowNode(node, positions) {
  const config = NODE_VISUAL[node.type] || {
    color: "#64748b",
    image: "mdiCog",
    style: { color: "#FFFFFF", backgroundColor: "#64748b" },
    title: node.type,
    flowType: "custom",
    width: 160,
    height: 67,
  };

  const pos = (positions && positions[node.uuid]) || { x: 100, y: 100 };
  const isStartStop = node.type === "start" || node.type === "stop";

  let data;
  if (isStartStop) {
    data = {
      help: "",
      color: config.color,
      image: config.image,
      label: node.name || node.type,
      notes: node.notes || "",
      style: config.style,
      title: config.title,
      node_type: node.type,
      properties: { isDisabled: true },
    };
    if (node.type === "stop") data.showClose = false;
  } else {
    data = {
      id: node.uuid,
      help: node.help || "",
      color: config.color,
      image: config.image,
      label: node.name || node.type,
      notes: node.notes || "",
      style: config.style,
      title: config.title,
      node_type: node.type,
      showClose: false,
      properties: buildFlowNodeProperties(node),
    };
    if (node.type === "conditional") {
      data.outletType = "dual";
    }
  }

  const flowNode = {
    id: node.uuid,
    data,
    type: config.flowType,
    width: config.width,
    height: config.height,
    position: pos,
    sourcePosition: "right",
    targetPosition: "left",
  };

  if (node.type === "start") flowNode.nowheel = true;

  return flowNode;
}

// ─── React Flow edge builder ──────────────────────────────────────────────────

function buildFlowEdge(edge) {
  return {
    id: generateId(10),
    data: { showClose: false },
    type: "custom",
    label: "",
    source: edge.source,
    target: edge.target,
    animated: true,
    markerEnd: { type: "arrowclosed" },
    sourceHandle: edge.sourceHandle || "b",
    targetHandle: edge.targetHandle || null,
  };
}

// ─── Global data builder ──────────────────────────────────────────────────────

function buildGlobalData(journey) {
  return {
    id: null,
    data: {
      label: journey?.name || "",
      teams: toTagArray(journey?.teams),
      apicalls: toTagArray(journey?.apiCalls),
      item_type: journey?.targetType
        ? [{ label: journey.targetType, value: journey.targetType }]
        : [],
      node_type: "global",
      variables: toTagArray(journey?.variables),
      processNames: toTagArray(journey?.processNames),
      user_actions: toTagArray(journey?.userActions),
    },
    type: "global",
  };
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Transform the AI-generated internal workflow JSON into the production export format
 * that can be directly uploaded to the Yabx workflow website.
 *
 * @param {object} aiWorkflow  The internal AI format: { journey, nodes, edges, positions }
 * @returns {object}           Production format ready for website upload
 */
function transformToExportFormat(aiWorkflow) {
  if (!aiWorkflow) throw new Error("No workflow provided");

  const { journey, nodes = [], edges = [], positions = {} } = aiWorkflow;

  const inputMap = buildInputMap(nodes, edges);

  const backendNodes = nodes.map((n) => buildBackendNode(n, inputMap));
  const flowNodes = nodes.map((n) => buildFlowNode(n, positions));
  const flowEdges = edges.map(buildFlowEdge);
  const globalData = buildGlobalData(journey);

  return {
    name: journey?.name || "AI Generated Workflow",
    description: null,
    target_type: journey?.targetType || "Customer",
    nodes: backendNodes,
    flow: {
      edges: flowEdges,
      nodes: flowNodes,
      globalData,
    },
    variables: toTagArray(journey?.variables),
    teams: toTagArray(journey?.teams),
    api_calls: toTagArray(journey?.apiCalls),
    user_actions: toTagArray(journey?.userActions),
  };
}

module.exports = { transformToExportFormat };
