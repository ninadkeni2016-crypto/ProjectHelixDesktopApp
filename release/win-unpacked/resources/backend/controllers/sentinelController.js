import { sentinelService } from "../services/sentinelService.js";
import SentinelAlert from "../models/SentinelAlert.js";
import { isDbConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

export async function getSentinelStatus(req, res) {
  try {
    const status = await sentinelService.getStatus(req.user._id);
    return res.json({ success: true, ...status });
  } catch (err) {
    logger.error("Sentinel getStatus error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch Sentinel status" });
  }
}

export async function getAlerts(req, res) {
  const { severity, category, status = "active", limit = 50 } = req.query;
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, alerts: [] });
    }

    const query = { user: req.user._id };
    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (status && status !== "all") query.status = status;

    const alerts = await SentinelAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({ success: true, alerts });
  } catch (err) {
    logger.error("Sentinel getAlerts error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch Sentinel alerts" });
  }
}

export async function acknowledgeAlert(req, res) {
  const { id } = req.params;
  try {
    const updated = await sentinelService.acknowledgeAlert(req.user._id, id);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    return res.json({ success: true, message: "Alert acknowledged", alert: updated });
  } catch (err) {
    logger.error("Sentinel acknowledgeAlert error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to acknowledge alert" });
  }
}

export async function dismissAlert(req, res) {
  const { id } = req.params;
  try {
    const updated = await sentinelService.dismissAlert(req.user._id, id);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    return res.json({ success: true, message: "Alert dismissed", alert: updated });
  } catch (err) {
    logger.error("Sentinel dismissAlert error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to dismiss alert" });
  }
}

export async function getMonitoredFolders(req, res) {
  try {
    const folders = await sentinelService.getFolders(req.user._id);
    return res.json({ success: true, folders });
  } catch (err) {
    logger.error("Sentinel getMonitoredFolders error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch monitored folders" });
  }
}

export async function addMonitoredFolder(req, res) {
  const { path: folderPath, name } = req.body;
  try {
    if (!folderPath) {
      return res.status(400).json({ success: false, message: "Folder path is required." });
    }
    const result = await sentinelService.addMonitoredFolder(req.user._id, folderPath, name);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function removeMonitoredFolder(req, res) {
  const { id } = req.params;
  try {
    const success = await sentinelService.removeFolder(req.user._id, id);
    return res.json({ success, message: "Folder removed from monitoring" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function scanFolder(req, res) {
  const { id } = req.params;
  try {
    const result = await sentinelService.scanFolder(req.user._id, id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function scanAllFolders(req, res) {
  try {
    const results = await sentinelService.scanAllFolders(req.user._id);
    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
