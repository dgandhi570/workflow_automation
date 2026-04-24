const axios = require("axios");
const logger = require("../utils/logger");
const { transformToExportFormat } = require("../utils/workflowExporter");

const BASE_URL = process.env.RAILS_BACKEND_URL || "http://localhost:3000";
const AUTH_TOKEN = process.env.RAILS_AUTH_TOKEN || "";

const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : undefined,
  },
});

/**
 * Fetch list of existing workflows from Rails backend.
 * Used to give Claude context about what already exists.
 */
async function getWorkflowList(page = 1, status = "approved") {
  try {
    const response = await httpClient.get("/api/workflow/list", {
      params: { page, status },
    });
    return response.data?.workflows || response.data || [];
  } catch (error) {
    logger.warn("Could not fetch workflow list from Rails", { error: error.message });
    return [];
  }
}

/**
 * Fetch a specific workflow by ID (for pattern learning).
 */
async function getWorkflow(id) {
  try {
    const response = await httpClient.get("/api/workflow/load", {
      params: { id },
    });
    return response.data;
  } catch (error) {
    logger.warn(`Could not fetch workflow ${id}`, { error: error.message });
    return null;
  }
}

/**
 * Save a generated workflow to the Rails backend.
 * Transforms the AI-generated format to the production Rails format.
 */
async function saveWorkflow(workflowJson) {
  const payload = transformToExportFormat(workflowJson);

  logger.info("Saving workflow to Rails", { name: payload.name });

  const response = await httpClient.post("/api/workflow/save", { workflow: payload });
  return response.data;
}

module.exports = { getWorkflowList, getWorkflow, saveWorkflow };
