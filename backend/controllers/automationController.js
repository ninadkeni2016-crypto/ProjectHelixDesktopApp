import Automation from "../models/Automation.js";
import { automationRepository } from "../repositories/AutomationRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import Notification from "../models/Notification.js";
import { executeAutomationAction } from "../services/automationActions.js";
import { helixEvents } from "../events/eventEmitter.js";
import { logger } from "../utils/logger.js";

const DEFAULT_AUTOMATIONS = [
  {
    title: "Auto-Organize Downloads",
    desc: "Sorts incoming downloaded files into categorized subfolders (Documents, Images, Media, Archives).",
    icon: "FolderPlus",
    actionType: "organize_downloads",
    schedule: "Every 2 hours",
    enabled: true,
  },
  {
    title: "Index Backup Snapshot",
    desc: "Creates a verified JSON snapshot backup of your local indexed files and metadata.",
    icon: "CloudUpload",
    actionType: "backup_index",
    schedule: "Every 6 hours",
    enabled: true,
  },
  {
    title: "SHA-256 Duplicate Check",
    desc: "Identifies byte-identical duplicate files using file sizes and SHA-256 cryptographic hashes.",
    icon: "Copy",
    actionType: "duplicate_check",
    schedule: "Weekly",
    enabled: false,
  },
  {
    title: "Temporary Cache Cleanup",
    desc: "Safely cleans up stale temporary files and cache entries older than 24 hours.",
    icon: "Trash2",
    actionType: "cleanup_temp",
    schedule: "Daily",
    enabled: true,
  },
  {
    title: "Local Directory Scanner",
    desc: "Recursively scans your approved user folders to update file indexes and search vectors.",
    icon: "Zap",
    actionType: "scan_directory",
    schedule: "Hourly",
    enabled: true,
  },
];

export async function getAutomations(req, res) {
  try {
    let automations = await automationRepository.find({ user: req.user._id });

    // Seed default automations if user currently has none
    if (!automations || automations.length === 0) {
      const seeded = [];
      for (const def of DEFAULT_AUTOMATIONS) {
        const item = await automationRepository.create({
          ...def,
          user: req.user._id,
        });
        seeded.push(item);
      }
      automations = seeded;
    }

    return res.json(automations);
  } catch (error) {
    logger.error("Error fetching automations: " + error.message);
    return res.status(500).json({ success: false, message: "Server error fetching automations" });
  }
}

export async function createAutomation(req, res) {
  const { title, desc, icon, actionType, schedule, actionConfig, enabled } = req.body;
  try {
    if (!title || !desc) {
      return res.status(400).json({ success: false, message: "Title and description are required." });
    }

    const validActions = ["scan_directory", "cleanup_temp", "organize_downloads", "backup_index", "duplicate_check"];
    const resolvedActionType = validActions.includes(actionType) ? actionType : "scan_directory";

    const automation = await automationRepository.create({
      title: title.trim(),
      desc: desc.trim(),
      icon: icon || "Zap",
      actionType: resolvedActionType,
      schedule: schedule || "Hourly",
      actionConfig: actionConfig || {},
      enabled: enabled !== undefined ? enabled : true,
      user: req.user._id,
    });

    await activityRepository.create({
      title: "Created Automation",
      desc: `Created task: ${title}`,
      type: "project",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "CREATE_AUTOMATION", { id: automation._id, title });
    return res.status(201).json(automation);
  } catch (error) {
    logger.error("Error creating automation: " + error.message);
    return res.status(500).json({ success: false, message: "Server error creating automation" });
  }
}

export async function updateAutomation(req, res) {
  try {
    const automation = await automationRepository.update(req.params.id, req.body, { new: true });
    if (!automation) {
      return res.status(404).json({ success: false, message: "Automation rule not found" });
    }

    helixEvents.emit("AutomationUpdated", { user: req.user._id, rule: automation });
    return res.json(automation);
  } catch (error) {
    logger.error("Error updating automation: " + error.message);
    return res.status(500).json({ success: false, message: "Server error updating automation" });
  }
}

export async function deleteAutomation(req, res) {
  try {
    const automation = await automationRepository.findOne({ _id: req.params.id, user: req.user._id });
    if (!automation) {
      return res.status(404).json({ success: false, message: "Automation rule not found" });
    }

    await automationRepository.delete(automation._id);

    await activityRepository.create({
      title: "Deleted Automation",
      desc: `Removed: ${automation.title}`,
      type: "project",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "DELETE_AUTOMATION", { id: automation._id, title: automation.title });
    return res.json({ message: "Automation deleted successfully", automationId: automation._id });
  } catch (error) {
    logger.error("Error deleting automation: " + error.message);
    return res.status(500).json({ success: false, message: "Server error deleting automation" });
  }
}

/**
 * Execute an automation immediately on-demand with real action execution and status reporting.
 * POST /api/v1/automations/:id/run
 */
export async function runAutomation(req, res) {
  try {
    const automation = await automationRepository.findOne({ _id: req.params.id, user: req.user._id });
    if (!automation) {
      return res.status(404).json({ success: false, message: "Automation task not found." });
    }

    automation.lastStatus = "running";
    await automation.save();

    try {
      const result = await executeAutomationAction(
        automation.actionType || "scan_directory",
        req.user._id,
        automation.actionConfig || {}
      );

      const now = new Date();
      automation.lastStatus = "success";
      automation.lastError = null;
      automation.lastResult = result;
      automation.lastRunAt = now;
      automation.lastRun = "Just now";
      automation.runs = (automation.runs || 0) + 1;
      await automation.save();

      // Log real activity in MongoDB
      await activityRepository.create({
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "project",
        label: `Automation executed: ${automation.title}`,
        title: "Automation Executed",
        desc: `${automation.title} — ${result.message}`,
        iconType: automation.icon || "Zap",
        color: "text-emerald-400",
        status: "completed",
        user: req.user._id,
      });

      // Create Notification
      await Notification.create({
        msg: `${automation.title}: ${result.message}`,
        time: "Just now",
        type: "success",
        user: req.user._id,
      });

      return res.json({
        success: true,
        message: result.message,
        automation,
        result,
      });
    } catch (runErr) {
      automation.lastStatus = "failed";
      automation.lastError = runErr.message;
      automation.lastRunAt = new Date();
      automation.lastRun = "Failed just now";
      await automation.save();

      await activityRepository.create({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "project",
        label: `Automation failed: ${automation.title}`,
        title: "Automation Failed",
        desc: `${automation.title} failed: ${runErr.message}`,
        iconType: automation.icon || "Zap",
        color: "text-red-400",
        status: "failed",
        user: req.user._id,
      });

      await Notification.create({
        msg: `Automation task "${automation.title}" failed: ${runErr.message}`,
        time: "Just now",
        type: "error",
        user: req.user._id,
      });

      return res.status(500).json({
        success: false,
        message: `Task execution failed: ${runErr.message}`,
        automation,
        error: runErr.message,
      });
    }
  } catch (error) {
    logger.error("Error executing automation: " + error.message);
    return res.status(500).json({ success: false, message: "Server error executing automation: " + error.message });
  }
}
