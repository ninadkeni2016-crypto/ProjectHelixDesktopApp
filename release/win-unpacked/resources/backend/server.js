import express from "express";
import http from "http";
import { Server } from "socket.io";
import compression from "compression";
import { connectDB } from "./config/db.js";
import { configService } from "./config/configService.js";
import { logger } from "./utils/logger.js";

// Validate required configuration and secrets at startup
try {
  configService.validateStartup();
} catch (configErr) {
  logger.error("Startup Configuration Failure: " + configErr.message);
  process.exit(1);
}

// Middlewares
import { configureSecurity, apiLimiter, authLimiter, corsOriginValidator } from "./middleware/security.js";

// Sockets, Cron, Plugins, Swagger Docs
import { socketService } from "./sockets/socketService.js";
import { initCronJobs } from "./scheduler/cronJobs.js";
import { initPlugins } from "./plugins/pluginLoader.js";
import { configureDocs } from "./docs/swagger.js";

// Routes imports
import statusRoutes from "./routes/statusRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import monitorRoutes from "./routes/monitorRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import automationRoutes from "./routes/automationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import sentinelRoutes from "./routes/sentinelRoutes.js";

// Process level error handlers to prevent unhandled background task crashes
process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  logger.error(`Unhandled Promise Rejection: ${message}`);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.stack || error.message}`);
});

// Non-blocking database connection
connectDB().catch((err) => {
  logger.error(`Initial database connection error: ${err.message}`);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

configureSecurity(app);

app.use("/api/", apiLimiter);

configureDocs(app);

app.use("/api/v1", statusRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/monitor", monitorRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/sentinel", sentinelRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/automations", automationRoutes);
app.use("/api/v1/activities", activityRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("Project Helix Desktop Companion Enterprise API is running...");
});

app.use((err, req, res, next) => {
  logger.error(`Server Error: ${err.message} \n ${err.stack}`);
  res.status(500).json({
    success: false,
    message: "Server error occurred",
    error: configService.isDev() ? err.message : {}
  });
});

socketService.initialize(io);
initCronJobs();
initPlugins(app).catch(err => logger.error(`Failed to load plugins: ${err.message}`));

// Server listener error handling for port conflicts (EADDRINUSE)
server.on("error", (err) => {
  const PORT = configService.get("PORT");
  if (err.code === "EADDRINUSE") {
    logger.error(
      `PORT CONFLICT: Port ${PORT} is already in use by another process. Ensure no orphaned node.js instances are running, or change PORT in backend/.env.`
    );
  } else {
    logger.error(`Express server network error (${err.code || "UNKNOWN"}): ${err.message}`);
  }
});

if (process.env.NODE_ENV !== "test") {
  const PORT = configService.get("PORT");
  server.listen(PORT, () => {
    logger.info(`Express Backend Server running in ${configService.get("NODE_ENV")} mode on port ${PORT}`);
  });
}

export default app; // For testing
