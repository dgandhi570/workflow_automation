const { chat, extractJson } = require("./claudeClient");
const { getValidatorPrompt } = require("../prompts/systemPrompt");
const logger = require("../utils/logger");

/**
 * Workflow Validator Agent
 * Validates generated workflow JSON for structural correctness.
 */
async function validateWorkflow(workflowJson) {
  try {
    // First: run fast local structural checks
    const localResult = localValidate(workflowJson);
    if (!localResult.is_valid) {
      return localResult;
    }

    // Then: use AI for semantic validation
    const prompt = getValidatorPrompt(workflowJson);
    const response = await chat(
      [{ role: "user", content: prompt }],
      "You are a workflow validation expert. Return only valid JSON.",
      { model: "llama-3.1-8b-instant", max_tokens: 1024 }
    );

    const result = extractJson(response);
    if (!result) {
      // If AI parsing fails, trust local validation
      return { ...localResult, warnings: ["AI validation skipped - JSON parse error"] };
    }

    // Merge AI results with local results
    return {
      is_valid: result.is_valid && localResult.is_valid,
      errors: [...(localResult.errors || []), ...(result.errors || [])],
      warnings: [...(localResult.warnings || []), ...(result.warnings || [])],
      node_count: workflowJson.nodes?.length || 0,
      has_start: localResult.has_start,
      has_stop: localResult.has_stop,
      summary: result.summary || "Validation complete",
    };
  } catch (error) {
    logger.error("ValidatorAgent error", { error: error.message });
    return localValidate(workflowJson);
  }
}

/**
 * Fast, synchronous local validation without AI.
 */
function localValidate(workflow) {
  const errors = [];
  const warnings = [];

  if (!workflow || typeof workflow !== "object") {
    return { is_valid: false, errors: ["Workflow is not a valid object"], warnings: [], has_start: false, has_stop: false };
  }

  const nodes = workflow.nodes || [];
  const journey = workflow.journey || {};

  const startNodes = nodes.filter((n) => n.type === "start");
  const stopNodes = nodes.filter((n) => n.type === "stop");

  const has_start = startNodes.length > 0;
  const has_stop = stopNodes.length > 0;

  if (startNodes.length === 0) errors.push("Workflow must have exactly one 'start' node.");
  if (startNodes.length > 1) errors.push("Workflow has multiple 'start' nodes — only one allowed.");
  if (stopNodes.length === 0) errors.push("Workflow must have at least one 'stop' node.");

  // Check UUID uniqueness
  const uuids = nodes.map((n) => n.uuid);
  const uniqueUuids = new Set(uuids);
  if (uniqueUuids.size !== uuids.length) {
    errors.push("Duplicate node UUIDs detected.");
  }

  // Check all output UUIDs exist
  const uuidSet = new Set(uuids);
  for (const node of nodes) {
    if (node.outputs && Array.isArray(node.outputs)) {
      for (const outUuid of node.outputs) {
        if (!uuidSet.has(outUuid)) {
          errors.push(`Node "${node.name || node.uuid}" has output pointing to unknown UUID: ${outUuid}`);
        }
      }
    }
  }

  // Check journey metadata references
  const apiCallNames = new Set((journey.apiCalls || []).map((a) => (typeof a === "string" ? a : a.value)));
  const variableNames = new Set((journey.variables || []).map((v) => (typeof v === "string" ? v : v.value)));
  const userActionNames = new Set((journey.userActions || []).map((u) => (typeof u === "string" ? u : u.value)));
  const teamNames = new Set((journey.teams || []).map((t) => (typeof t === "string" ? t : t.value)));

  for (const node of nodes) {
    if (node.type === "apiCall" && node.api_call) {
      const name = node.api_call.value || node.api_call;
      if (!apiCallNames.has(name)) {
        warnings.push(`API call "${name}" in node "${node.name}" is not listed in journey.apiCalls.`);
      }
    }
    if (node.type === "review" && node.teams) {
      const teams = Array.isArray(node.teams) ? node.teams : [node.teams];
      for (const t of teams) {
        const tName = t.value || t;
        if (!teamNames.has(tName)) {
          warnings.push(`Team "${tName}" in review node "${node.name}" is not listed in journey.teams.`);
        }
      }
    }
    if (node.type === "userInteraction" && node.actions) {
      const actions = Array.isArray(node.actions) ? node.actions : [node.actions];
      for (const a of actions) {
        const aName = a.value || a;
        if (!userActionNames.has(aName)) {
          warnings.push(`User action "${aName}" in node "${node.name}" is not listed in journey.userActions.`);
        }
      }
    }
  }

  if (nodes.length < 2) {
    warnings.push("Workflow has fewer than 2 nodes — likely incomplete.");
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
    node_count: nodes.length,
    has_start,
    has_stop,
    summary: errors.length === 0 ? "Workflow is structurally valid." : `${errors.length} error(s) found.`,
  };
}

module.exports = { validateWorkflow, localValidate };
