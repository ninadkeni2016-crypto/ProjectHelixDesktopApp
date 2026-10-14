import Activity from "../models/Activity.js";
import { isDbConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

// @desc    Get user activities (timeline logs)
// @route   GET /api/v1/activities
export async function getActivities(req, res) {
  try {
    if (!isDbConnected()) {
      return res.json([]);
    }
    const activities = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(activities);
  } catch (error) {
    logger.error("Error fetching activities: " + error.message);
    return res.status(500).json({ success: false, message: "Server error fetching timeline events" });
  }
}

// @desc    Store user action log
// @route   POST /api/v1/activities
export async function createActivity(req, res) {
  const { type, label, iconType, color, status, taskType, details, title, desc } = req.body;

  try {
    const activity = await Activity.create({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: type || "project",
      label: label || title || desc || "Activity Log",
      iconType: iconType || "FileText",
      color: color || "text-blue-400",
      status: status || "completed",
      taskType: taskType || "",
      details: details || {},
      user: req.user._id,
    });

    return res.status(201).json(activity);
  } catch (error) {
    logger.error("Error creating activity: " + error.message);
    return res.status(500).json({ success: false, message: "Server error logging action" });
  }
}

// @desc    Clear user activities
// @route   DELETE /api/v1/activities
export async function clearActivities(req, res) {
  try {
    if (!isDbConnected()) {
      return res.json({ success: true, message: "Activity history cleared successfully" });
    }
    await Activity.deleteMany({ user: req.user._id });
    return res.json({ success: true, message: "Activity history cleared successfully" });
  } catch (error) {
    logger.error("Error clearing activities: " + error.message);
    return res.status(500).json({ success: false, message: "Server error clearing activity history" });
  }
}
