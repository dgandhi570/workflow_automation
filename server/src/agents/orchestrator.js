const { v4: uuidv4 } = require("uuid");
const { chat, extractWorkflowJson } = require("./claudeClient");
const { extractContext, isContextSufficient, getMissingInfo } = require("./extractionAgent");
const { validateWorkflow } = require("./validatorAgent");
const { getSystemPrompt } = require("../prompts/systemPrompt");
const railsService = require("../services/railsService");
const logger = require("../utils/logger");

/**
 * In-memory session store.
 * In production, replace with Redis or a database.
 *
 * Each session has:
 *   - messages: Array of {role, content} (conversation history for Claude)
 *   - context: Extracted structured information
 *   - phase: "gathering" | "confirming" | "generated" | "complete"
 *   - workflow: The generated workflow JSON (once generated)
 *   - createdAt, updatedAt
 */
const sessions = new Map();

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function createSession() {
  const id = uuidv4();
  sessions.set(id, {
    id,
    messages: [],
    context: {},
    phase: "gathering",
    workflow: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  logger.info(`Session created: ${id}`);
  return id;
}

function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  // Check TTL
  if (Date.now() - session.updatedAt.getTime() > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return session;
}

function touchSession(session) {
  session.updatedAt = new Date();
}

/**
 * Main orchestration function.
 * Handles one turn of the conversation.
 *
 * @param {string} sessionId
 * @param {string} userMessage
 * @returns {{ reply: string, phase: string, workflow: object|null, validation: object|null }}
 */
async function processMessage(sessionId, userMessage) {
  let session = getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found or expired.`);
  }

  touchSession(session);

  // Step 1: Extract structured context from this message (background, non-blocking to UX)
  try {
    session.context = await extractContext(userMessage, session.context);
  } catch (e) {
    logger.warn("Context extraction failed (non-fatal)", { error: e.message });
  }

  // Step 2: Add user message to conversation history
  session.messages.push({ role: "user", content: userMessage });

  // Step 3: Check for explicit commands
  const lowerMsg = userMessage.toLowerCase().trim();
  if (lowerMsg === "/generate" || lowerMsg === "generate workflow" || lowerMsg === "build it") {
    return await triggerGeneration(session);
  }
  if (lowerMsg === "/reset" || lowerMsg === "start over") {
    session.messages = [];
    session.context = {};
    session.phase = "gathering";
    session.workflow = null;
    const reply = "I've reset our conversation. Let's start fresh! Tell me about the workflow you want to create.";
    session.messages.push({ role: "assistant", content: reply });
    return { reply, phase: "gathering", workflow: null, validation: null };
  }
  if ((lowerMsg.includes("save") || lowerMsg.includes("push")) && session.workflow) {
    return await saveWorkflow(session);
  }

  // Step 4: If we have a generated workflow and user is asking for modifications
  if (session.phase === "generated" && session.workflow) {
    return await refineWorkflow(session, userMessage);
  }

  // Step 5: Decide if we're ready to generate or still gathering
  if (session.phase === "confirming") {
    // User responded to our confirmation question
    if (isConfirmation(userMessage)) {
      return await triggerGeneration(session);
    } else {
      // User wants changes — go back to gathering
      session.phase = "gathering";
    }
  }

  // Step 6: Check if we have enough context to move to confirmation
  if (session.phase === "gathering" && isContextSufficient(session.context) && session.messages.length >= 4) {
    // Try to move to confirmation phase
    const missing = getMissingInfo(session.context);
    if (missing.length === 0) {
      session.phase = "confirming";
    }
  }

  // Step 7: Call Claude for the main conversational response
  const systemPrompt = getSystemPrompt();
  let augmentedSystem = systemPrompt;

  // Inject extracted context as a hint to Claude
  if (Object.keys(session.context).length > 0) {
    augmentedSystem += `\n\n## CONTEXT COLLECTED SO FAR (do not repeat back, just use internally):\n${JSON.stringify(session.context, null, 2)}`;
  }

  // Inject existing workflows from Rails if available (for pattern learning)
  try {
    const existingWorkflows = await railsService.getWorkflowList();
    if (existingWorkflows && existingWorkflows.length > 0) {
      const names = existingWorkflows.slice(0, 10).map((w) => w.name || w.label).filter(Boolean);
      augmentedSystem += `\n\n## EXISTING WORKFLOWS IN THE SYSTEM (for reference):\n${names.join(", ")}`;
    }
  } catch (e) {
    // Non-fatal
  }

  const reply = await chat(session.messages, augmentedSystem, { max_tokens: 2048 });

  session.messages.push({ role: "assistant", content: reply });

  // Check if Claude's reply contains a workflow JSON
  const embeddedWorkflow = extractWorkflowJson(reply);
  if (embeddedWorkflow && embeddedWorkflow.nodes && embeddedWorkflow.journey) {
    logger.info("Workflow JSON detected in Claude response");
    session.workflow = embeddedWorkflow;
    session.phase = "generated";
    const validation = await validateWorkflow(embeddedWorkflow);
    return { reply, phase: "generated", workflow: embeddedWorkflow, validation };
  }

  return { reply, phase: session.phase, workflow: session.workflow, validation: null };
}

/**
 * Triggers workflow generation regardless of phase.
 */
async function triggerGeneration(session) {
  logger.info(`Triggering workflow generation for session: ${session.id}`);

  const systemPrompt = getSystemPrompt();
  const generationPrompt = `Based on everything we've discussed, now generate the complete workflow JSON.

Context summary:
${JSON.stringify(session.context, null, 2)}

Generate a complete, production-ready workflow JSON following the exact format specified in your instructions.
Include all nodes, edges, positions, and journey metadata.
Make sure every referenced API, variable, team, and userAction is included in the journey metadata.
Return the JSON in a code block.`;

  session.messages.push({ role: "user", content: generationPrompt });

  const reply = await chat(session.messages, systemPrompt, { max_tokens: 8096 });
  session.messages.push({ role: "assistant", content: reply });

  const workflow = extractWorkflowJson(reply);

  if (workflow) {
    session.workflow = workflow;
    session.phase = "generated";
    const validation = await validateWorkflow(workflow);

    let finalReply = reply;
    if (!validation.is_valid) {
      finalReply += `\n\n> **Validation Notes:**\n${validation.errors.map((e) => `- ⚠️ ${e}`).join("\n")}`;
    }
    if (validation.warnings.length > 0) {
      finalReply += `\n\n> **Suggestions:**\n${validation.warnings.map((w) => `- 💡 ${w}`).join("\n")}`;
    }
    finalReply += `\n\nWorkflow generated with **${workflow.nodes?.length || 0} nodes**. Would you like to:\n- Refine anything?\n- Save it to the backend? (just say "save")`;

    return { reply: finalReply, phase: "generated", workflow, validation };
  } else {
    session.phase = "generating_failed";
    return { reply, phase: "gathering", workflow: null, validation: null };
  }
}

/**
 * Handles workflow refinement requests.
 */
async function refineWorkflow(session, userMessage) {
  const systemPrompt = getSystemPrompt();
  const augmented =
    systemPrompt +
    `\n\nCurrent workflow JSON:\n\`\`\`json\n${JSON.stringify(session.workflow, null, 2)}\n\`\`\`\nThe user wants modifications. Apply them and return the COMPLETE updated workflow JSON.`;

  const reply = await chat(session.messages, augmented, { max_tokens: 8096 });
  session.messages.push({ role: "assistant", content: reply });

  const updatedWorkflow = extractWorkflowJson(reply);
  if (updatedWorkflow) {
    session.workflow = updatedWorkflow;
    const validation = await validateWorkflow(updatedWorkflow);
    return { reply, phase: "generated", workflow: updatedWorkflow, validation };
  }

  return { reply, phase: "generated", workflow: session.workflow, validation: null };
}

/**
 * Saves the generated workflow to the Rails backend.
 */
async function saveWorkflow(session) {
  if (!session.workflow) {
    return {
      reply: "No workflow to save yet. Let's build one first!",
      phase: session.phase,
      workflow: null,
      validation: null,
    };
  }

  try {
    const result = await railsService.saveWorkflow(session.workflow);
    session.phase = "complete";
    const reply = `✅ **Workflow saved successfully!**\n\nWorkflow ID: \`${result.id || "saved"}\`\nName: **${session.workflow.journey?.name}**\n\nYou can now open it in the workflow editor. Would you like to create another workflow?`;
    session.messages.push({ role: "assistant", content: reply });
    return { reply, phase: "complete", workflow: session.workflow, validation: null, savedId: result.id };
  } catch (error) {
    logger.error("Failed to save workflow", { error: error.message });
    const reply = `❌ Failed to save workflow: ${error.message}\n\nThe workflow JSON is still available above. You can manually import it.`;
    return { reply, phase: "generated", workflow: session.workflow, validation: null };
  }
}

function isConfirmation(message) {
  const confirmWords = ["yes", "correct", "right", "go ahead", "proceed", "looks good", "perfect", "generate", "build"];
  const lower = message.toLowerCase();
  return confirmWords.some((w) => lower.includes(w));
}

module.exports = {
  createSession,
  getSession,
  processMessage,
};
