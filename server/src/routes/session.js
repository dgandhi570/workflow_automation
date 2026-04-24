const express = require("express");
const router = express.Router();
const { createSession, getSession } = require("../agents/orchestrator");
const logger = require("../utils/logger");

/**
 * POST /api/session/create
 * Creates a new conversation session.
 * Returns sessionId to be used in all subsequent requests.
 */
router.post("/create", (req, res) => {
  try {
    const sessionId = createSession();
    res.json({ sessionId, message: "Session created. Start by describing the workflow you want to build." });
  } catch (error) {
    logger.error("Session create error", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:sessionId
 * Returns current session state (phase, context, messages count).
 */
router.get("/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired." });
  }
  res.json({
    sessionId: session.id,
    phase: session.phase,
    messageCount: session.messages.length,
    contextKeys: Object.keys(session.context),
    context: session.context,
    hasWorkflow: !!session.workflow,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
});

module.exports = router;
