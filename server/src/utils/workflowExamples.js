/**
 * FEW-SHOT WORKFLOW EXAMPLES
 * These are injected into the AI system prompt so Claude can pattern-match
 * against real, correct workflow JSON when generating new workflows.
 *
 * Based on the actual Yabx platform node types and JSON format.
 */

const WORKFLOW_EXAMPLES = [
  {
    name: "Personal Loan - Salaried Employee",
    description: "A standard personal loan journey for salaried employees. Collects customer info, runs credit check, makes approval decision, and disburses or rejects.",
    workflow: {
      journey: {
        name: "Personal Loan - Salaried",
        targetType: "Customer",
        teams: ["CDE", "Credit Rule"],
        variables: ["credit_decision", "credit_limit", "cde_failure", "income_profile"],
        apiCalls: ["CDE", "Rule Engine", "Disburse Loan"],
        userActions: [
          "get_personal_info",
          "get_personal_income",
          "get_documents",
          "show_loan_summary",
          "show_reject_screen"
        ],
        processNames: []
      },
      nodes: [
        {
          uuid: "pl-start",
          type: "start",
          name: "Start",
          outputs: ["pl-collect-info"],
          notes: "",
          help: ""
        },
        {
          uuid: "pl-collect-info",
          type: "userInteraction",
          name: "Collect Personal Info",
          actions: [{ value: "get_personal_info", label: "get_personal_info" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: true,
          outputs: ["pl-collect-income"],
          notes: "Collect name, DOB, address, employment details",
          help: ""
        },
        {
          uuid: "pl-collect-income",
          type: "userInteraction",
          name: "Collect Income Details",
          actions: [{ value: "get_personal_income", label: "get_personal_income" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: true,
          outputs: ["pl-collect-docs"],
          notes: "Collect salary slips, bank statements",
          help: ""
        },
        {
          uuid: "pl-collect-docs",
          type: "userInteraction",
          name: "Collect Documents",
          actions: [{ value: "get_documents", label: "get_documents" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: true,
          outputs: ["pl-cde-check"],
          notes: "ID proof, address proof, income documents",
          help: ""
        },
        {
          uuid: "pl-cde-check",
          type: "apiCall",
          name: "Credit Data Engine Check",
          api_call: { value: "CDE", label: "CDE" },
          parameters: "{}",
          outputs: ["pl-cde-conditional"],
          notes: "Runs credit bureau and internal scoring",
          help: ""
        },
        {
          uuid: "pl-cde-conditional",
          type: "conditional",
          name: "CDE Passed?",
          properties: {
            condition_type: { value: "WF", label: "WF" },
            variable: { value: "cde_failure", label: "cde_failure" },
            comparator_type: { value: "equals", label: "equals" },
            comparator: "false"
          },
          outputs: ["pl-rule-engine", "pl-reject-node"],
          notes: "Output A: CDE passed, Output B: CDE failed",
          help: ""
        },
        {
          uuid: "pl-rule-engine",
          type: "apiCall",
          name: "Run Credit Rules",
          api_call: { value: "Rule Engine", label: "Rule Engine" },
          parameters: "{}",
          outputs: ["pl-approval-conditional"],
          notes: "Applies credit policy rules",
          help: ""
        },
        {
          uuid: "pl-approval-conditional",
          type: "conditional",
          name: "Loan Approved?",
          properties: {
            condition_type: { value: "WF", label: "WF" },
            variable: { value: "credit_decision", label: "credit_decision" },
            comparator_type: { value: "equals", label: "equals" },
            comparator: "approved"
          },
          outputs: ["pl-show-summary", "pl-reject-node"],
          notes: "Output A: Approved, Output B: Rejected",
          help: ""
        },
        {
          uuid: "pl-show-summary",
          type: "userInteraction",
          name: "Show Loan Summary",
          actions: [{ value: "show_loan_summary", label: "show_loan_summary" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: false,
          outputs: ["pl-disburse"],
          notes: "Customer accepts loan offer",
          help: ""
        },
        {
          uuid: "pl-disburse",
          type: "apiCall",
          name: "Disburse Loan",
          api_call: { value: "Disburse Loan", label: "Disburse Loan" },
          parameters: "{}",
          outputs: ["pl-sms-approved"],
          notes: "Trigger loan disbursement",
          help: ""
        },
        {
          uuid: "pl-sms-approved",
          type: "textMessage",
          name: "Send Approval SMS",
          template: "Congratulations! Your personal loan of {{credit_limit}} has been approved and disbursed.",
          template_frequency: { value: "Send only once", label: "Send only once" },
          outputs: ["pl-stop-approved"],
          notes: "",
          help: ""
        },
        {
          uuid: "pl-reject-node",
          type: "userInteraction",
          name: "Show Rejection Screen",
          actions: [{ value: "show_reject_screen", label: "show_reject_screen" }],
          parameters: "{}",
          enable_payload: false,
          enable_extraction: false,
          outputs: ["pl-sms-rejected"],
          notes: "Display rejection reason",
          help: ""
        },
        {
          uuid: "pl-sms-rejected",
          type: "textMessage",
          name: "Send Rejection SMS",
          template: "We regret to inform you that your loan application could not be approved at this time.",
          template_frequency: { value: "Send only once", label: "Send only once" },
          outputs: ["pl-stop-rejected"],
          notes: "",
          help: ""
        },
        {
          uuid: "pl-stop-approved",
          type: "stop",
          name: "Loan Disbursed",
          outputs: [],
          notes: "Successful completion",
          help: ""
        },
        {
          uuid: "pl-stop-rejected",
          type: "stop",
          name: "Application Rejected",
          outputs: [],
          notes: "Rejected completion",
          help: ""
        }
      ],
      edges: [
        { source: "pl-start", sourceHandle: "b", target: "pl-collect-info", targetHandle: null },
        { source: "pl-collect-info", sourceHandle: "b", target: "pl-collect-income", targetHandle: null },
        { source: "pl-collect-income", sourceHandle: "b", target: "pl-collect-docs", targetHandle: null },
        { source: "pl-collect-docs", sourceHandle: "b", target: "pl-cde-check", targetHandle: null },
        { source: "pl-cde-check", sourceHandle: "b", target: "pl-cde-conditional", targetHandle: null },
        { source: "pl-cde-conditional", sourceHandle: "a", target: "pl-rule-engine", targetHandle: null },
        { source: "pl-cde-conditional", sourceHandle: "b", target: "pl-reject-node", targetHandle: null },
        { source: "pl-rule-engine", sourceHandle: "b", target: "pl-approval-conditional", targetHandle: null },
        { source: "pl-approval-conditional", sourceHandle: "a", target: "pl-show-summary", targetHandle: null },
        { source: "pl-approval-conditional", sourceHandle: "b", target: "pl-reject-node", targetHandle: null },
        { source: "pl-show-summary", sourceHandle: "b", target: "pl-disburse", targetHandle: null },
        { source: "pl-disburse", sourceHandle: "b", target: "pl-sms-approved", targetHandle: null },
        { source: "pl-sms-approved", sourceHandle: "b", target: "pl-stop-approved", targetHandle: null },
        { source: "pl-reject-node", sourceHandle: "b", target: "pl-sms-rejected", targetHandle: null },
        { source: "pl-sms-rejected", sourceHandle: "b", target: "pl-stop-rejected", targetHandle: null }
      ],
      positions: {
        "pl-start": { x: 100, y: 200 },
        "pl-collect-info": { x: 350, y: 200 },
        "pl-collect-income": { x: 600, y: 200 },
        "pl-collect-docs": { x: 850, y: 200 },
        "pl-cde-check": { x: 1100, y: 200 },
        "pl-cde-conditional": { x: 1350, y: 200 },
        "pl-rule-engine": { x: 1600, y: 100 },
        "pl-approval-conditional": { x: 1850, y: 100 },
        "pl-show-summary": { x: 2100, y: 50 },
        "pl-disburse": { x: 2350, y: 50 },
        "pl-sms-approved": { x: 2600, y: 50 },
        "pl-stop-approved": { x: 2850, y: 50 },
        "pl-reject-node": { x: 1600, y: 350 },
        "pl-sms-rejected": { x: 1850, y: 350 },
        "pl-stop-rejected": { x: 2100, y: 350 }
      }
    }
  },

  {
    name: "KYC Verification Flow",
    description: "Know Your Customer verification journey. Collects documents, waits for KYC provider to verify, then routes to approval or manual review.",
    workflow: {
      journey: {
        name: "KYC Verification",
        targetType: "Customer",
        teams: ["CDE"],
        variables: ["kyc_approval_status", "kyc_failure_reason"],
        apiCalls: ["CDE"],
        userActions: [
          "get_personal_info",
          "get_documents",
          "show_reject_screen"
        ],
        processNames: []
      },
      nodes: [
        {
          uuid: "kyc-start",
          type: "start",
          name: "Start",
          outputs: ["kyc-collect-info"],
          notes: "",
          help: ""
        },
        {
          uuid: "kyc-collect-info",
          type: "userInteraction",
          name: "Collect Personal Info",
          actions: [{ value: "get_personal_info", label: "get_personal_info" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: true,
          outputs: ["kyc-collect-docs"],
          notes: "Collect name, DOB, address",
          help: ""
        },
        {
          uuid: "kyc-collect-docs",
          type: "userInteraction",
          name: "Upload ID Documents",
          actions: [{ value: "get_documents", label: "get_documents" }],
          parameters: "{}",
          enable_payload: true,
          enable_extraction: true,
          outputs: ["kyc-submit-api"],
          notes: "Passport, national ID, or driving licence",
          help: ""
        },
        {
          uuid: "kyc-submit-api",
          type: "apiCall",
          name: "Submit to KYC Provider",
          api_call: { value: "CDE", label: "CDE" },
          parameters: "{}",
          outputs: ["kyc-wait-event"],
          notes: "Submit documents to CDE for verification",
          help: ""
        },
        {
          uuid: "kyc-wait-event",
          type: "wait_for_event",
          name: "Wait for KYC Result",
          properties: {
            item_type: { value: "kyc_completed", label: "kyc_completed" }
          },
          outputs: ["kyc-decision"],
          notes: "Pauses until KYC provider sends result webhook",
          help: ""
        },
        {
          uuid: "kyc-decision",
          type: "conditional",
          name: "KYC Approved?",
          properties: {
            condition_type: { value: "WF", label: "WF" },
            variable: { value: "kyc_approval_status", label: "kyc_approval_status" },
            comparator_type: { value: "equals", label: "equals" },
            comparator: "approved"
          },
          outputs: ["kyc-stop-approved", "kyc-manual-review"],
          notes: "Output A: KYC passed, Output B: Needs review",
          help: ""
        },
        {
          uuid: "kyc-manual-review",
          type: "review",
          name: "Manual KYC Review",
          teams: [{ value: "CDE", label: "CDE" }],
          outputs: ["kyc-review-decision"],
          notes: "Agent reviews borderline cases",
          help: ""
        },
        {
          uuid: "kyc-review-decision",
          type: "conditional",
          name: "Review Approved?",
          properties: {
            condition_type: { value: "WF", label: "WF" },
            variable: { value: "kyc_approval_status", label: "kyc_approval_status" },
            comparator_type: { value: "equals", label: "equals" },
            comparator: "approved"
          },
          outputs: ["kyc-stop-approved", "kyc-show-reject"],
          notes: "Output A: Approved after review, Output B: Rejected",
          help: ""
        },
        {
          uuid: "kyc-show-reject",
          type: "userInteraction",
          name: "Show Rejection Screen",
          actions: [{ value: "show_reject_screen", label: "show_reject_screen" }],
          parameters: "{}",
          enable_payload: false,
          enable_extraction: false,
          outputs: ["kyc-stop-rejected"],
          notes: "",
          help: ""
        },
        {
          uuid: "kyc-stop-approved",
          type: "stop",
          name: "KYC Verified",
          outputs: [],
          notes: "Customer successfully verified",
          help: ""
        },
        {
          uuid: "kyc-stop-rejected",
          type: "stop",
          name: "KYC Failed",
          outputs: [],
          notes: "Customer verification failed",
          help: ""
        }
      ],
      edges: [
        { source: "kyc-start", sourceHandle: "b", target: "kyc-collect-info", targetHandle: null },
        { source: "kyc-collect-info", sourceHandle: "b", target: "kyc-collect-docs", targetHandle: null },
        { source: "kyc-collect-docs", sourceHandle: "b", target: "kyc-submit-api", targetHandle: null },
        { source: "kyc-submit-api", sourceHandle: "b", target: "kyc-wait-event", targetHandle: null },
        { source: "kyc-wait-event", sourceHandle: "b", target: "kyc-decision", targetHandle: null },
        { source: "kyc-decision", sourceHandle: "a", target: "kyc-stop-approved", targetHandle: null },
        { source: "kyc-decision", sourceHandle: "b", target: "kyc-manual-review", targetHandle: null },
        { source: "kyc-manual-review", sourceHandle: "b", target: "kyc-review-decision", targetHandle: null },
        { source: "kyc-review-decision", sourceHandle: "a", target: "kyc-stop-approved", targetHandle: null },
        { source: "kyc-review-decision", sourceHandle: "b", target: "kyc-show-reject", targetHandle: null },
        { source: "kyc-show-reject", sourceHandle: "b", target: "kyc-stop-rejected", targetHandle: null }
      ],
      positions: {
        "kyc-start": { x: 100, y: 200 },
        "kyc-collect-info": { x: 350, y: 200 },
        "kyc-collect-docs": { x: 600, y: 200 },
        "kyc-submit-api": { x: 850, y: 200 },
        "kyc-wait-event": { x: 1100, y: 200 },
        "kyc-decision": { x: 1350, y: 200 },
        "kyc-stop-approved": { x: 1600, y: 100 },
        "kyc-manual-review": { x: 1600, y: 300 },
        "kyc-review-decision": { x: 1850, y: 300 },
        "kyc-show-reject": { x: 2100, y: 400 },
        "kyc-stop-rejected": { x: 2350, y: 400 }
      }
    }
  }
];

/**
 * CONVERSATION EXAMPLES
 * Show the AI how to gather requirements through multi-turn Q&A dialogue.
 * These are injected BEFORE the workflow JSON examples so the LLM sees
 * the questioning pattern first.
 */
const CONVERSATION_EXAMPLES = [
  {
    name: "Eligibility Check — 3 rounds of Q&A before confirming",
    turns: [
      {
        role: "user",
        content: "Create a simple journey that takes basic user details from user, then based on age.. notify user that he is eligible or not"
      },
      {
        role: "assistant",
        content: `Great — you want an eligibility-check journey based on age. Before I design this, let me understand the details:

1. **User details to collect**: You mentioned "basic user details" — which specific fields? For example: full name, date of birth, email, phone number, address? Or just name and DOB?
2. **Age threshold**: What age determines eligibility? (e.g., must be 18+, or must be between 21-60?)
3. **Notification method**: How should the user be notified of the result — via SMS, an in-app screen, email, or a combination?`
      },
      {
        role: "user",
        content: "Collect name, DOB, email, and phone. Age should be 18+. Notify via SMS."
      },
      {
        role: "assistant",
        content: `Thanks! That's much clearer. A few more questions:

1. **What message should the SMS contain?** For eligible users, something like "Congratulations, you are eligible!"? And for ineligible users?
2. **Should anything else happen after notification?** For example, if eligible, should the user proceed to another step (like document upload or an application form)?
3. **Do you need any external API calls**, or is the age check purely based on the DOB the user enters?`
      },
      {
        role: "user",
        content: "For eligible: 'You are eligible for our services.' For not eligible: 'Sorry, you must be 18+ to proceed.' No additional steps needed, just notify and end. No external APIs — just check age from DOB."
      },
      {
        role: "assistant",
        content: `Perfect, I now have a complete picture. Here's what I'll build:

1. **Start** node
2. **User Interaction** — Collect name, DOB, email, phone
3. **Set Variable** — Calculate age from DOB
4. **Conditional** — Check if age >= 18
5. **SMS (eligible path)** — Send "You are eligible for our services."
6. **SMS (ineligible path)** — Send "Sorry, you must be 18+ to proceed."
7. **Stop** nodes for both paths

Does this match your intended journey? Should I add or change anything before I generate the workflow JSON?`
      }
    ]
  },
  {
    name: "Document Collection — follow-up probing for vague requests",
    turns: [
      {
        role: "user",
        content: "Build a document collection workflow"
      },
      {
        role: "assistant",
        content: `I'd be happy to help build a document collection workflow! Let me understand the requirements first:

1. **What type of documents** need to be collected? (e.g., ID proof, address proof, income documents, photos, signed agreements)
2. **Who is the target user?** (e.g., loan applicants, new customers, employees)
3. **What should happen after documents are collected?** (e.g., send for verification, manual review by a team, proceed to next workflow step)`
      },
      {
        role: "user",
        content: "It's for new customers onboarding. Need ID proof and address proof. After collection, send to KYC team for review."
      },
      {
        role: "assistant",
        content: `Got it — a customer onboarding document flow with manual review. A couple more specifics:

1. **Should ID and address proof be collected in one screen or two separate steps?**
2. **After the KYC team reviews, what are the outcomes?** (e.g., approved → proceed, rejected → notify customer and end, or rejected → ask customer to re-upload?)
3. **Any timeout on the review step?** (e.g., if the team doesn't review within 48 hours, auto-escalate?)
4. **Should the customer be notified** of the review outcome? If so, how — SMS, email, in-app?`
      }
    ]
  }
];

/**
 * Returns formatted conversation examples for injection into the system prompt.
 */
function getConversationExamplesForPrompt() {
  return CONVERSATION_EXAMPLES.map((ex) => {
    const dialogue = ex.turns
      .map((t) => `**${t.role === "user" ? "User" : "AI"}**: ${t.content}`)
      .join("\n\n");
    return `### Conversation Example: "${ex.name}"\n${dialogue}`;
  }).join("\n\n---\n\n");
}

/**
 * Returns formatted few-shot examples for injection into the system prompt.
 * Only includes a compact representation to stay within token limits.
 */
function getExamplesForPrompt() {
  return WORKFLOW_EXAMPLES.map((ex) => {
    const nodeList = ex.workflow.nodes
      .map((n) => `  - ${n.name} (type: "${n.type}", uuid: "${n.uuid}", outputs: [${(n.outputs || []).map((o) => `"${o}"`).join(", ")}])`)
      .join("\n");

    return `### Example: "${ex.name}"
Description: ${ex.description}
Journey metadata:
  - teams: ${ex.workflow.journey.teams.join(", ")}
  - variables: ${ex.workflow.journey.variables.join(", ")}
  - apiCalls: ${ex.workflow.journey.apiCalls.join(", ")}
  - userActions: ${ex.workflow.journey.userActions.join(", ")}
Nodes (${ex.workflow.nodes.length} total):
${nodeList}
Edge count: ${ex.workflow.edges.length}`;
  }).join("\n\n");
}

module.exports = { WORKFLOW_EXAMPLES, getExamplesForPrompt };
