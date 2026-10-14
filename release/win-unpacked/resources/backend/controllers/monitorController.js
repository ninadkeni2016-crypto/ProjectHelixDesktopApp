import { getSystemMetrics } from "../services/systemMonitor.js";
import { queueManager } from "../queues/queueManager.js";
import { socketService } from "../sockets/socketService.js";
import { getTelemetryHistory } from "../services/telemetryService.js";

export async function getLiveMetrics(req, res) {
  try {
    const metrics = await getSystemMetrics();
    return res.json(metrics);
  } catch (error) {
    return res.status(500).json({ message: "Failed to read system metrics" });
  }
}

export async function getTelemetryHistoryController(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const history = await getTelemetryHistory(Math.min(limit, 100));
    return res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load telemetry history" });
  }
}

export async function getSystemInfoController(req, res) {
  try {
    const metrics = await getSystemMetrics();
    return res.json({
      success: true,
      cpu: {
        model: metrics.cpuModel,
        cores: metrics.cpuCores,
        physicalCores: metrics.cpuPhysicalCores,
        speed: metrics.cpuSpeed,
        perCoreLoads: metrics.perCoreLoads,
      },
      ram: {
        total: metrics.ramTotalStr,
        used: metrics.ramUsedStr,
        available: metrics.ramAvailableStr,
        totalBytes: metrics.ramTotalBytes,
        usedBytes: metrics.ramUsedBytes,
      },
      gpu: {
        name: metrics.gpuName,
        vendor: metrics.gpuVendor,
        vram: metrics.gpuVram,
      },
      disks: metrics.disks,
      os: metrics.os,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to read system info" });
  }
}

export async function getDashboardMetrics(req, res) {
  const memUsage = process.memoryUsage();
  const activeSockets = socketService ? socketService.activeConnections : 0;
  const queues = queueManager.getAllStatuses();

  return res.json({
    success: true,
    data: {
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      },
      sockets: {
        activeConnections: activeSockets,
      },
      queues: {
        scanQueueLength: queues.scan?.pendingCount || 0,
        aiQueueLength: queues.ai?.pendingCount || 0,
        notificationQueueLength: queues.notification?.pendingCount || 0,
      },
    },
  });
}
