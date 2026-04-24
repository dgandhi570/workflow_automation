require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const workflowRoutes = require("./routes/workflow");
const sessionRoutes = require("./routes/session");

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "workflow-ai-middleware", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/workflow", workflowRoutes);
app.use("/api/session", sessionRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  logger.info(`Workflow AI Middleware running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (!process.env.GROQ_API_KEY) {
    logger.warn("GROQ_API_KEY not set - AI features will not work");
  }
});

module.exports = app;
