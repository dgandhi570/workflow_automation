import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000, // 2 minutes for AI responses
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Network error";
    return Promise.reject(new Error(msg));
  }
);

export const sessionApi = {
  create: () => api.post("/session/create"),
  get: (sessionId) => api.get(`/session/${sessionId}`),
};

export const workflowApi = {
  chat: (sessionId, message) => api.post("/workflow/chat", { sessionId, message }),
  validate: (workflow) => api.post("/workflow/validate", { workflow }),
  save: (sessionId) => api.post("/workflow/save", { sessionId }),
  getWorkflow: (sessionId) => api.get(`/workflow/session/${sessionId}/workflow`),
  exportWorkflow: (workflow) => api.post("/workflow/export", { workflow }),
  getExisting: () => api.get("/workflow/existing"),
};
