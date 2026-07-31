require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { createOpenAIService } = require("./ai/openaiService");
const { createAuthRouter } = require("./routes/authRoutes");
const { createApiRouter } = require("./routes");
const { createSocketServer } = require("./socket");
const { createCorsOptions } = require("./utils/corsOptions");
const { requireDashboardAuth } = require("./utils/dashboardAuth");
const { migrateLegacyRuntimeStorage } = require("./utils/runtimeStorage");
const { createAppStore } = require("./services/store");
const { createWhatsAppService } = require("./services/whatsappService");
const { createScheduleService } = require("./services/scheduleService");
const logger = require("./utils/logger");

// General limiter for all API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});

// Stricter limiter for sensitive session-mutation endpoints
const sessionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please wait before retrying." }
});

async function startServer() {
  const app = express();
  app.set("trust proxy", 1); // Trust first proxy (Nginx/CloudPanel)
  const httpServer = http.createServer(app);
  const port = Number(process.env.PORT || 3001);

  logger.info("Starting server migration check...");
  await migrateLegacyRuntimeStorage();

  const store = createAppStore();
  await store.initialize();

  // Security headers — must be before routes
  app.use(helmet({
    // CSP is relaxed because the backend serves only JSON APIs; the frontend
    // is a separate Next.js process. Adjust if you ever serve HTML from here.
    contentSecurityPolicy: false
  }));

  app.use(cors(createCorsOptions()));
  app.use(cookieParser());

  // Bound body size — 64 KB is more than enough for any settings payload
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: true, limit: "64kb" }));

  // Health check is intentionally outside auth and rate limiting so that
  // AWS ALB / ECS health probes always succeed without credentials.
  app.get("/health", (_request, response) => {
    response.json({
      success: true,
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  const openAIService = createOpenAIService();
  const whatsappService = createWhatsAppService({
    store,
    openAIService
  });
  const scheduleService = createScheduleService({
    store,
    whatsappService
  });
  await scheduleService.initialize();

  logger.info("Registering authentication routes at /api/auth");
  app.use("/api/auth", createAuthRouter());

  // Apply general rate limit to all /api routes
  app.use("/api", apiLimiter);

  app.use("/api", requireDashboardAuth);
  app.use("/api/session", sessionLimiter);
  app.use("/api", createApiRouter({ store, whatsappService, scheduleService }));

  // Centralised error handler — must be defined last, after all routes
  app.use((error, request, response, _next) => {
    logger.error("API Error", {
      message: error.message,
      stack: error.stack,
      path: request.path,
      method: request.method
    });

    response.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  });

  createSocketServer(httpServer, store);

  httpServer.listen(port, () => {
    logger.info(`Backend running on port ${port}`, { nodeEnv: process.env.NODE_ENV });

    // Delay WhatsApp initialization slightly to give Next.js compilation priority on system RAM
    setTimeout(() => {
      whatsappService.initialize().catch((error) => {
        logger.error("WhatsApp initialization failed", { error: error.message });
        store.updateStatus("disconnected", {
          lastError: error.message || "WhatsApp initialization failed"
        });
      });
    }, 10000);
  });

  // Graceful shutdown — PM2 sends SIGINT, ECS sends SIGTERM
  function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    httpServer.close(() => {
      logger.info("HTTP server closed. Exiting.");
      process.exit(0);
    });

    // Force exit after 15 s if something hangs (e.g. a stuck Puppeteer session)
    setTimeout(() => {
      logger.warn("Forced shutdown after timeout.");
      process.exit(1);
    }, 15000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", { message: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection", { reason: String(reason) });
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server", { error: error.message, stack: error.stack });
  process.exit(1);
});
