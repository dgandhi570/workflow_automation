import { useState, useCallback, useRef, useEffect } from "react";
import { sessionApi, workflowApi } from "../services/api";

const STARTER_PROMPTS = [
  "Create a personal loan journey for salaried employees",
  "Build a KYC verification workflow for new customers",
  "Design a business loan application flow with manual review",
  "Create a credit card application journey with risk checks",
];

export function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [context, setContext] = useState({});
  const abortRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Keep ref in sync for use inside interval closure
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const addMessage = useCallback((role, content, meta = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        role,
        content,
        timestamp: new Date(),
        ...meta,
      },
    ]);
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { sessionId: sid } = await sessionApi.create();
      setSessionId(sid);
      setPhase("gathering");
      addMessage("assistant", `Hello! I'm your **Workflow Architect AI**. 👋

I'll help you design a customer journey workflow by asking you the right questions, then generate the complete workflow JSON that your platform can use directly.

**To get started**, describe the workflow you want to create. For example:
- "Create a personal loan journey for salaried employees"
- "Build a KYC verification flow for new customers"
- "Design a credit underwriting workflow"

Or pick one of the quick starts below, or describe your own use case in detail.`);
      setMessages((prev) => [
        ...prev,
        {
          id: "starters",
          role: "system",
          type: "starters",
          starters: STARTER_PROMPTS,
        },
      ]);
    } catch (err) {
      setError(err.message);
      addMessage("system_error", `Failed to connect: ${err.message}. Make sure the middleware server is running on port 3001.`);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const sendMessage = useCallback(async (message) => {
    if (!sessionId || isLoading || !message.trim()) return;

    addMessage("user", message);
    setIsLoading(true);
    setError(null);

    try {
      const result = await workflowApi.chat(sessionId, message);

      setPhase(result.phase || "gathering");

      if (result.workflow) {
        setCurrentWorkflow(result.workflow);
      }
      if (result.validation) {
        setValidation(result.validation);
      }

      // Refresh context from server after each message (non-blocking)
      if (sessionId) {
        sessionApi.get(sessionId).then((s) => {
          if (s.context && Object.keys(s.context).length > 0) {
            setContext(s.context);
          }
        }).catch(() => {});
      }

      addMessage("assistant", result.reply, {
        hasWorkflow: !!result.workflow,
        phase: result.phase,
      });
    } catch (err) {
      setError(err.message);
      addMessage("assistant", `Sorry, I encountered an error: **${err.message}**\n\nPlease try again.`, {
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, addMessage]);

  const saveWorkflow = useCallback(async () => {
    if (!sessionId || !currentWorkflow || isSaving) return;
    setIsSaving(true);
    try {
      await workflowApi.save(sessionId);
      addMessage("assistant", "✅ **Workflow saved successfully!** You can now open it in the workflow editor.");
    } catch (err) {
      addMessage("assistant", `❌ Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, currentWorkflow, isSaving, addMessage]);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setPhase("idle");
    setCurrentWorkflow(null);
    setValidation(null);
    setError(null);
    setContext({});
    initialize();
  }, [initialize]);

  return {
    sessionId,
    messages,
    isLoading,
    phase,
    currentWorkflow,
    validation,
    error,
    isSaving,
    context,
    initialize,
    sendMessage,
    saveWorkflow,
    reset,
  };
}
