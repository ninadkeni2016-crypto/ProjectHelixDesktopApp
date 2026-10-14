import { getSystemMetrics } from "../services/systemMonitor.js";
import { queueManager } from "../queues/queueManager.js";
import { logger } from "../utils/logger.js";

class SocketService {
  constructor() {
    this.io = null;
    this.activeConnections = 0;
    this.telemetryIntervalId = null;
  }

  initialize(io) {
    this.io = io;
    queueManager.setSocketService(this);

    this.io.on("connection", (socket) => {
      this.activeConnections++;
      logger.info(`WebSocket: Client connected. Total: ${this.activeConnections}`);

      socket.on("join", (userId) => {
        if (userId) {
          socket.join(userId.toString());
          logger.info(`WebSocket: Socket ${socket.id} joined room ${userId}`);
        }
      });

      socket.emit("queue:status", queueManager.getAllStatuses());

      // Send immediate initial metrics snapshot upon client connection
      getSystemMetrics()
        .then((metrics) => socket.emit("telemetry:metrics", metrics))
        .catch((e) => logger.warn(`Initial socket telemetry emit warning: ${e.message}`));

      socket.on("disconnect", () => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        logger.info(`WebSocket: Client disconnected. Total: ${this.activeConnections}`);
        this.manageTelemetryStream();
      });

      this.manageTelemetryStream();
    });
  }

  manageTelemetryStream() {
    if (this.activeConnections > 0 && !this.telemetryIntervalId) {
      logger.info("WebSocket: Starting real-time system metrics telemetry stream...");
      this.telemetryIntervalId = setInterval(async () => {
        try {
          const metrics = await getSystemMetrics();
          this.broadcast("telemetry:metrics", metrics);
        } catch (e) {
          logger.error(`WebSocket telemetry broadcast failed: ${e.message}`);
        }
      }, 2000); 
    } else if (this.activeConnections === 0 && this.telemetryIntervalId) {
      logger.info("WebSocket: Stopping system metrics telemetry stream (no active clients).");
      clearInterval(this.telemetryIntervalId);
      this.telemetryIntervalId = null;
    }
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  sendToUser(userId, event, data) {
    if (this.io) {
      this.io.to(userId.toString()).emit(event, data);
    }
  }

  pushNotification(userId, notification) {
    this.sendToUser(userId, "notification:new", notification);
  }
}

export const socketService = new SocketService();
