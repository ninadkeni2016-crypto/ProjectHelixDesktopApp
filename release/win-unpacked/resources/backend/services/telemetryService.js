import Telemetry from "../models/Telemetry.js";
import { isDbConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

let lastRecordTime = 0;
const RECORD_INTERVAL_MS = 30000; // Sample every 30 seconds to prevent DB bloat

export async function recordTelemetrySnapshot(metrics) {
  if (!isDbConnected() || !metrics || !metrics.liveMetrics) {
    return;
  }

  const now = Date.now();
  if (now - lastRecordTime < RECORD_INTERVAL_MS) {
    return;
  }
  lastRecordTime = now;

  try {
    const live = metrics.liveMetrics;
    await Telemetry.create({
      cpu: typeof live.cpu === "number" ? live.cpu : 0,
      cpuModel: metrics.cpuModel || "",
      cpuCores: metrics.cpuCores || 0,
      ram: typeof live.ram === "number" ? live.ram : 0,
      ramUsedBytes: metrics.ramUsedBytes || 0,
      ramTotalBytes: metrics.ramTotalBytes || 0,
      gpu: typeof live.gpu === "number" ? live.gpu : null,
      gpuName: metrics.gpuName || "",
      disk: typeof live.disk === "number" ? live.disk : 0,
      diskPercent: typeof live.diskPercent === "number" ? live.diskPercent : 0,
      downSpeed: typeof live.downSpeed === "number" ? live.downSpeed : 0,
      upSpeed: typeof live.upSpeed === "number" ? live.upSpeed : 0,
      temp: typeof live.temp === "number" ? live.temp : null,
      batteryPercent: typeof live.batteryPercent === "number" ? live.batteryPercent : null,
      hasBattery: Boolean(live.hasBattery),
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn(`Failed to persist telemetry snapshot: ${err.message}`);
  }
}

export async function getTelemetryHistory(limit = 20) {
  if (!isDbConnected()) {
    return [];
  }
  try {
    const records = await Telemetry.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return records.reverse(); // Return in chronological order
  } catch (err) {
    logger.error(`Error querying telemetry history: ${err.message}`);
    return [];
  }
}
