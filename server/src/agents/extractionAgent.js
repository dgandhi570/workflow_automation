const { chat, extractJson } = require("./claudeClient");
const { getExtractionPrompt } = require("../prompts/systemPrompt");
const logger = require("../utils/logger");

/**
 * Information Extraction Agent
 * Parses each user message and extracts structured context (variables, APIs, steps, etc.)
 * Uses a fast, cheap model since this is a simple extraction task.
 */
async function extractContext(userMessage, currentContext = {}) {
  try {
    const prompt = getExtractionPrompt(userMessage, currentContext);

    const response = await chat(
      [{ role: "user", content: prompt }],
      "You are a precise information extraction assistant. Extract structured data from text and return valid JSON only.",
      { model: "llama-3.1-8b-instant", max_tokens: 1024 }
    );

    const extracted = extractJson(response);
    if (!extracted) {
      logger.warn("ExtractionAgent: Could not parse JSON response");
      return currentContext;
    }

    // Merge extracted data into existing context, removing nulls
    const merged = { ...currentContext };
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value) && value.length > 0) {
          // Merge arrays, deduplicate
          const existing = merged[key] || [];
          merged[key] = [...new Set([...existing, ...value])];
        } else if (!Array.isArray(value)) {
          merged[key] = value;
        }
      }
    }

    logger.info("ExtractionAgent: Context updated", { keys: Object.keys(merged) });
    return merged;
  } catch (error) {
    logger.error("ExtractionAgent error", { error: error.message });
    return currentContext;
  }
}

/**
 * Checks if enough context has been collected to attempt workflow generation.
 * Deliberately strict — we want the AI to ask thorough questions before generating.
 */
function isContextSufficient(context) {
  // Hard requirements: these must always be present
  const required = ["workflow_name", "target_customer_type"];
  const hasRequired = required.every((k) => context[k]);
  if (!hasRequired) return false;

  // Core workflow design fields — need at least 4 of these 6
  const coreFields = [
    "data_collection_steps",    // What data to collect
    "api_integrations",         // What external calls to make
    "decision_criteria",        // What rules/conditions apply
    "approval_actions",         // What happens on success/approval
    "rejection_actions",        // What happens on failure/rejection
    "user_actions_needed",      // What screens/forms to show
  ];

  const hasCoreFields = coreFields.filter((k) => {
    const v = context[k];
    return v && (Array.isArray(v) ? v.length > 0 : true);
  }).length;

  return hasCoreFields >= 4;
}

/**
 * Determines what information is still missing.
 * Domain-agnostic — works for any workflow type, not just financial.
 */
function getMissingInfo(context) {
  const checks = [
    { key: "workflow_name", question: "What should this workflow be called?" },
    { key: "target_customer_type", question: "Who is the target user of this workflow? (e.g., customer, employee, applicant)" },
    { key: "data_collection_steps", question: "What specific information do you need to collect from the user during this workflow?" },
    { key: "api_integrations", question: "Are there any external systems or APIs that need to be called? (e.g., verification services, notification systems, third-party checks)" },
    { key: "decision_criteria", question: "What are the decision rules or conditions that determine the flow? (e.g., eligibility criteria, thresholds, approval rules)" },
    { key: "approval_actions", question: "What should happen when the outcome is positive/approved? (notifications, next steps, etc.)" },
    { key: "rejection_actions", question: "What should happen when the outcome is negative/rejected?" },
    { key: "user_actions_needed", question: "What screens or forms need to be shown to the user at each step?" },
    { key: "teams_for_review", question: "Are there any manual review steps? If so, which team handles them?" },
    { key: "variables_needed", question: "What data fields or variables need to be tracked throughout the workflow?" },
  ];

  const missing = [];
  for (const check of checks) {
    const val = context[check.key];
    if (!val || (Array.isArray(val) && val.length === 0)) {
      missing.push(check.question);
    }
  }
  return missing;
}

module.exports = { extractContext, isContextSufficient, getMissingInfo };
