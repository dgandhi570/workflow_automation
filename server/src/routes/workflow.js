const express = require("express");
const router = express.Router();
const { processMessage, getSession } = require("../agents/orchestrator");
const { validateWorkflow } = require("../agents/validatorAgent");
const railsService = require("../services/railsService");
const { transformToExportFormat } = require("../utils/workflowExporter");
const logger = require("../utils/logger");

/**
 * POST /api/workflow/chat
 * Main conversational endpoint. Send a message and get a reply.
 *
 * Body: { sessionId: string, message: string }
 * Response: { reply, phase, workflow, validation, sessionId }
 */
router.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required." });
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required." });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired. Please create a new session." });
  }

  try {
    const result = await processMessage(sessionId, message.trim());
    res.json({ ...result, sessionId });
  } catch (error) {
    logger.error("Workflow chat error", { error: error.message, sessionId });
    res.status(500).json({
      error: "Failed to process message.",
      details: error.message,
    });
  }
});

/**
 * POST /api/workflow/validate
 * Validates a workflow JSON without saving.
 *
 * Body: { workflow: object }
 */
router.post("/validate", async (req, res) => {
  const { workflow } = req.body;
  if (!workflow) {
    return res.status(400).json({ error: "workflow JSON is required." });
  }

  try {
    const result = await validateWorkflow(workflow);
    res.json(result);
  } catch (error) {
    logger.error("Workflow validate error", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflow/save
 * Saves the current session's workflow to the Rails backend.
 *
 * Body: { sessionId: string } or { workflow: object }
 */
router.post("/save", async (req, res) => {
  const { sessionId, workflow: directWorkflow } = req.body;

  let workflowToSave = directWorkflow;

  if (!workflowToSave && sessionId) {
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    workflowToSave = session.workflow;
  }

  if (!workflowToSave) {
    return res.status(400).json({ error: "No workflow to save." });
  }

  try {
    const result = await railsService.saveWorkflow(workflowToSave);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Workflow save error", { error: error.message });
    res.status(500).json({ error: `Failed to save: ${error.message}` });
  }
});

/**
 * GET /api/workflow/session/:sessionId/workflow
 * Returns the current workflow JSON for a session.
 */
router.get("/session/:sessionId/workflow", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  if (!session.workflow) {
    return res.status(404).json({ error: "No workflow generated yet." });
  }
  res.json({ workflow: session.workflow, phase: session.phase });
});

/**
 * POST /api/workflow/export
 * Transforms the AI-generated internal workflow JSON into the production export
 * format that the Yabx workflow website accepts for upload/import.
 *
 * Body: { workflow: object }  (the internal AI format with journey/nodes/edges/positions)
 * Response: production-format JSON ready for website upload
 */
router.post("/export", (req, res) => {
  const { workflow } = req.body;
  if (!workflow) {
    return res.status(400).json({ error: "workflow is required." });
  }
  try {
    const exported = transformToExportFormat(workflow);
    res.json(exported);
  } catch (error) {
    logger.error("Workflow export transform error", { error: error.message });
    res.status(500).json({ error: `Export failed: ${error.message}` });
  }
});

/**
 * GET /api/workflow/session/:sessionId/export
 * Returns the current session workflow in production export format.
 */
router.get("/session/:sessionId/export", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  if (!session.workflow) return res.status(404).json({ error: "No workflow generated yet." });
  try {
    const exported = transformToExportFormat(session.workflow);
    res.json(exported);
  } catch (error) {
    logger.error("Session export error", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow/existing
 * Returns list of workflows from the Rails backend (for reference).
 */
router.get("/existing", async (req, res) => {
  try {
    const workflows = await railsService.getWorkflowList();
    res.json({ workflows });
  } catch (error) {
    logger.error("Fetch existing workflows error", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
