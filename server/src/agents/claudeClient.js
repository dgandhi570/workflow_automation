const OpenAI = require("openai");
const logger = require("../utils/logger");

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is not set.");
    }
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return client;
}

/**
 * Send a multi-turn conversation to Grok and get a response.
 * @param {Array} messages - Array of {role, content} objects
 * @param {string} system - System prompt
 * @param {Object} options - model, max_tokens, temperature
 * @returns {string} - The assistant's text response
 */
async function chat(messages, system, options = {}) {
  const grok = getClient();

  const model = options.model || "llama-3.3-70b-versatile";
  const max_tokens = options.max_tokens || 4096;

  logger.info(`Groq API call | model: ${model} | messages: ${messages.length}`);

  const response = await grok.chat.completions.create({
    model,
    max_tokens,
    messages: [{ role: "system", content: system }, ...messages],
  });

  const text = response.choices[0].message.content;

  logger.info(`Groq response | prompt_tokens: ${response.usage.prompt_tokens} | completion_tokens: ${response.usage.completion_tokens}`);

  return text;
}

/**
 * Extract JSON from Grok's response (handles code blocks and raw JSON).
 */
function extractJson(text) {
  // Try to find JSON in a code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Fall through
    }
  }

  // Try raw JSON parse
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // Try to find the first { and last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Extract the workflow JSON block from a mixed text+JSON response.
 */
function extractWorkflowJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      logger.warn("Failed to parse workflow JSON from code block", { error: e.message });
      return null;
    }
  }
  return null;
}

module.exports = { chat, extractJson, extractWorkflowJson };
