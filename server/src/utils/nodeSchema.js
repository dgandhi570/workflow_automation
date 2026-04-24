/**
 * NODE SCHEMA — Complete definition of every workflow node type.
 * This is the AI's authoritative reference when building workflows.
 * Mirrors the frontend NodeDefaultData and backend node handlers exactly.
 */

const NODE_TYPES = {
  start: {
    type: "start",
    display_name: "Start",
    description: "The mandatory entry point of every workflow. Only ONE start node allowed.",
    outputs: ["output_1"],
    inputs: [],
    properties: { isDisabled: true },
    style: { backgroundColor: "#5F9EA0", color: "#FFFFFF" },
    image: "mdiPlay",
    rules: ["Every workflow must begin with exactly one start node."],
  },

  stop: {
    type: "stop",
    display_name: "Stop / End",
    description: "Terminates the workflow. Can be rejection or successful completion. Multiple stop nodes allowed for different end states.",
    outputs: [],
    inputs: ["input_1"],
    properties: { isDisabled: true },
    style: { backgroundColor: "#5F9EA0", color: "#FFFFFF" },
    image: "mdiStop",
    rules: ["Every workflow must have at least one stop node."],
  },

  conditional: {
    type: "conditional",
    display_name: "Conditional",
    description: "Branches the workflow into TWO paths based on a condition. Output 'a' = TRUE/YES path, Output 'b' = FALSE/NO path.",
    outputs: ["output_a (true/yes path)", "output_b (false/no path)"],
    inputs: ["input_1"],
    outletType: "dual",
    style: { backgroundColor: "#4986E7", color: "#FFFFFF" },
    image: "mdiCodeTagsCheck",
    properties_schema: {
      condition_type: {
        type: "select",
        options: ["Defined", "Code", "WF"],
        description: "Defined = predefined condition, Code = custom Ruby code, WF = compare workflow variables",
      },
      condition_value: {
        type: "string",
        description: "For 'Defined' type: the predefined condition value",
      },
      code: {
        type: "string",
        description: "For 'Code' type: Ruby code that returns true/false",
      },
      variable: {
        type: "string",
        description: "For 'WF' type: the workflow variable to compare",
      },
      comparator_type: {
        type: "select",
        options: ["equals", "not_equals", "greater_than", "less_than", "contains"],
        description: "For 'WF' type: comparison operator",
      },
      comparator: {
        type: "string",
        description: "For 'WF' type: the value to compare against",
      },
    },
    example_properties: {
      condition_type: { value: "WF", label: "WF" },
      variable: { value: "credit_decision", label: "credit_decision" },
      comparator_type: { value: "equals", label: "equals" },
      comparator: "approved",
    },
    rules: [
      "Always has exactly 2 output connections: 'a' (true) and 'b' (false).",
      "Use for yes/no decision points in the journey.",
    ],
  },

  apiCall: {
    type: "apiCall",
    display_name: "API Call",
    description: "Calls an external/internal API (e.g., CDE, Rule Engine, Disburse Loan). The API must be pre-registered in the workflow's global apiCalls list.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#B3DC6C", color: "#FFFFFF" },
    image: "mdiRobotHappyOutline",
    properties_schema: {
      api_call: {
        type: "select",
        description: "Select from the workflow's registered API calls (e.g., 'CDE', 'Rule Engine', 'Disburse Loan')",
      },
      parameters: {
        type: "json",
        description: "Optional JSON parameters to pass to the API",
      },
    },
    example_properties: {
      api_call: { value: "CDE", label: "CDE" },
      parameters: "{}",
    },
    rules: [
      "API call name must exist in the workflow's global apiCalls list.",
      "Results are stored in workflow payload for downstream nodes.",
    ],
  },

  userInteraction: {
    type: "userInteraction",
    display_name: "User Interaction",
    description: "Pauses the workflow and presents a screen/form to the user. Workflow resumes when user submits the interaction.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FF7537", color: "#FFFFFF" },
    image: "mdiAccountDetailsOutline",
    properties_schema: {
      actions: {
        type: "multi_select",
        description: "User action screens to show (must be in workflow's userActions list). E.g., 'get_personal_info', 'get_documents', 'show_loan_summary'",
      },
      parameters: {
        type: "json",
        description: "Optional JSON parameters for the screen",
      },
      enable_payload: {
        type: "boolean",
        description: "Whether to pass current payload to the screen",
      },
      enable_extraction: {
        type: "boolean",
        description: "Whether to extract data from user's input back into payload",
      },
      payload_extractors: {
        type: "array",
        description: "Fields to extract from user response",
      },
    },
    example_properties: {
      actions: [{ value: "get_personal_info", label: "get_personal_info" }],
      parameters: "{}",
      enable_payload: true,
      enable_extraction: true,
    },
    rules: [
      "Action names must exist in the workflow's global userActions list.",
      "Workflow is paused until user completes the interaction.",
    ],
  },

  setVariable: {
    type: "setVariable",
    display_name: "Set Variable",
    description: "Reads or modifies a workflow variable. Use to track state like approval status, counters, flags.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FFFFFF", color: "#000000", border: "1px solid grey" },
    image: "mdiVariable",
    properties_schema: {
      variable_type: {
        type: "select",
        description: "The workflow variable to modify (from global variables list)",
      },
      value_type: {
        type: "select",
        options: ["Set", "Random", "Increment", "Decrement", "Multiply"],
        description: "Operation to perform",
      },
      type_of_value: {
        type: "select",
        options: ["Variable", "Text", "Decimal"],
        description: "Type of the value being set",
      },
      value: {
        type: "string",
        description: "The value to use in the operation",
      },
    },
    example_properties: {
      variable_type: { value: "credit_approval_status", label: "credit_approval_status" },
      value_type: { value: "Set", label: "Set" },
      type_of_value: { value: "Text", label: "Text" },
      value: "approved",
    },
    rules: [
      "Variable must exist in the workflow's global variables list.",
    ],
  },

  textMessage: {
    type: "textMessage",
    display_name: "Text Message",
    description: "Sends an SMS or notification to the user. Use for status updates, approval notifications, rejection messages.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#C2C2C2", color: "#000000" },
    image: "mdiMessageTextOutline",
    properties_schema: {
      template: {
        type: "textarea",
        description: "Message content. Can include variable placeholders like {{variable_name}}",
      },
      template_frequency: {
        type: "select",
        options: ["Send Repeatedly", "Send only once"],
        description: "How often to send this message",
      },
    },
    example_properties: {
      template: "Your loan application has been approved. Loan amount: {{credit_limit}}",
      template_frequency: { value: "Send only once", label: "Send only once" },
    },
  },

  review: {
    type: "review",
    display_name: "Manual Review",
    description: "Pauses workflow for a human agent/team to review and approve or reject. Used for compliance, underwriting, or fraud checks.",
    outputs: ["output_1 (approved)", "output_2 (rejected)"],
    inputs: ["input_1"],
    style: { backgroundColor: "#92E1C0", color: "#000000" },
    image: "mdiAccountMultipleCheckOutline",
    properties_schema: {
      teams: {
        type: "multi_select",
        description: "Teams assigned to perform the review (from global teams list)",
      },
    },
    example_properties: {
      teams: [{ value: "CDE", label: "CDE" }],
    },
    rules: [
      "Team names must exist in the workflow's global teams list.",
      "Review node has 2 outputs: approval path and rejection path.",
    ],
  },

  delay: {
    type: "delay",
    display_name: "Delay",
    description: "Pauses workflow execution for a specified duration. Use for waiting periods, SLA timers, retry delays.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#B99AFF", color: "#FFFFFF" },
    image: "mdiClockOutline",
    properties_schema: {
      delay_type: {
        type: "select",
        options: ["Seconds", "Minutes", "Hours", "Days"],
        description: "Unit of time for the delay",
      },
      delay_duration: {
        type: "number",
        description: "How long to delay",
      },
    },
    example_properties: {
      delay_type: { value: "Hours", label: "Hours" },
      delay_duration: "24",
    },
  },

  split: {
    type: "split",
    display_name: "Split (Parallel Fan-out)",
    description: "Splits workflow into MULTIPLE parallel branches that execute simultaneously. Use Ruby code to determine which branches to activate.",
    outputs: ["output_1", "output_2", "output_3", "...dynamic"],
    inputs: ["input_1"],
    style: { backgroundColor: "#7BD148", color: "#FFFFFF" },
    image: "mdiArrowDecision",
    properties_schema: {
      code: {
        type: "ruby_code",
        description: "Ruby code that returns array of output UUIDs to activate",
      },
    },
    rules: [
      "Used with a join/merge node to wait for all parallel branches to complete.",
    ],
  },

  join: {
    type: "join",
    display_name: "Merge / Join",
    description: "Waits for ALL parallel branches (from a split node) to complete before continuing. Consolidates parallel execution.",
    outputs: ["output_1"],
    inputs: ["input_1", "input_2", "input_3", "...dynamic"],
    style: { backgroundColor: "#FFAD46", color: "#FFFFFF" },
    image: "mdiMerge",
    rules: [
      "Always used in conjunction with a split node.",
      "Waits for all incoming branches to complete.",
    ],
  },

  wait_for_event: {
    type: "wait_for_event",
    display_name: "Wait For Event",
    description: "Pauses workflow until a specific external event occurs (e.g., payment confirmed, document uploaded, KYC approved).",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FAD165", color: "#FFFFFF" },
    image: "mdiFlash",
    properties_schema: {
      item_type: {
        type: "select",
        description: "The event type to wait for",
      },
    },
  },

  error: {
    type: "error",
    display_name: "Error Handler",
    description: "Catches errors from upstream nodes. Connect as alternative path from nodes that may fail. Handles graceful error recovery.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FA6CCE", color: "#FFFFFF" },
    image: "mdiBugOutline",
    rules: [
      "Connect error handler as an alternative output of API call or critical nodes.",
    ],
  },

  timeout: {
    type: "timeout",
    display_name: "Timeout Handler",
    description: "Triggers when a preceding operation exceeds the allowed time limit. Used with review, user interaction, or wait nodes.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FA6CBB", color: "#FFFFFF" },
    image: "mdiTimerOutline",
    properties_schema: {
      timeout_type: {
        type: "select",
        options: ["Seconds", "Minutes", "Hours", "Days"],
      },
      timeout_duration: {
        type: "number",
        description: "Duration after which timeout triggers",
      },
    },
  },

  triggerProcess: {
    type: "triggerProcess",
    display_name: "Trigger Sub-Process",
    description: "Launches another workflow (sub-process) as a child process. Can run synchronously or asynchronously.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FFFFFF", color: "#000000", border: "1px solid grey" },
    image: "mdiChartTimeline",
    properties_schema: {
      sub_process: {
        type: "select",
        description: "Name of the sub-workflow to trigger (from processNames list)",
      },
      parameters: {
        type: "json",
        description: "Parameters to pass to the sub-process",
      },
      async: {
        type: "boolean",
        description: "If true, parent continues without waiting for sub-process to finish",
      },
    },
  },

  subProcess: {
    type: "subProcess",
    display_name: "Gateway",
    description: "A gateway/checkpoint node used to invoke sub-processes or as a routing point.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#16A765", color: "#FFFFFF" },
    image: "mdiCheckboxBlankCircle",
  },

  parallel: {
    type: "parallel",
    display_name: "Parallel Process",
    description: "Executes multiple operations in parallel with timeout support.",
    outputs: ["output_1"],
    inputs: ["input_1"],
    style: { backgroundColor: "#FA6CBB", color: "#FFFFFF" },
    image: "mdiViewParallel",
  },
};

/**
 * Returns a compact text description of all node types for the AI prompt.
 */
function getNodeTypesDescription() {
  return Object.values(NODE_TYPES)
    .map((n) => {
      const props = n.properties_schema
        ? `\n   Key properties: ${Object.entries(n.properties_schema)
            .map(([k, v]) => `${k} (${v.description || v.type})`)
            .join(", ")}`
        : "";
      return `- **${n.display_name}** (type: "${n.type}"): ${n.description}${props}`;
    })
    .join("\n");
}

/**
 * Build a complete node object ready for the workflow JSON.
 */
function buildNode(type, uuid, label, properties = {}, position = { x: 0, y: 0 }) {
  const schema = NODE_TYPES[type];
  if (!schema) throw new Error(`Unknown node type: ${type}`);

  return {
    uuid,
    type,
    name: label,
    ...properties,
    notes: properties.notes || "",
    help: properties.help || "",
  };
}

module.exports = { NODE_TYPES, getNodeTypesDescription, buildNode };
