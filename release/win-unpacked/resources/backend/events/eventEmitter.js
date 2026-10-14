import { EventEmitter } from "events";
import { settingsRepository } from "../repositories/SettingsRepository.js";
import { automationRepository } from "../repositories/AutomationRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { logger } from "../utils/logger.js";

class HelixEventEmitter extends EventEmitter {}

export const helixEvents = new HelixEventEmitter();

// Register listeners
helixEvents.on("UserRegistered", async (user) => {
  logger.info(`Event: UserRegistered for ${user.email}`);
  try {
    await settingsRepository.create({
      notifications: true,
      aiSuggestions: true,
      autoBackup: true,
      privacyMode: false,
      theme: "Dark (Active)",
      accentColor: "#3b82f6",
      user: user._id,
    });

    const defaultRules = [
      { title: "Auto-Organize Downloads", desc: "Sort downloaded files by type into respective folders automatically", icon: "FolderPlus", enabled: true, lastRun: "2 hrs ago", runs: 1240, user: user._id },
      { title: "Smart Backup", desc: "Incremental backup to cloud every 6 hours with smart deduplication", icon: "CloudUpload", enabled: true, lastRun: "2 hrs ago", runs: 892, user: user._id },
      { title: "Duplicate Cleanup", desc: "Detect and remove duplicate files weekly to free up storage", icon: "Copy", enabled: false, lastRun: "7 days ago", runs: 48, user: user._id },
      { title: "Temp File Sweep", desc: "Remove temporary files, browser cache, and system junk monthly", icon: "Trash2", enabled: true, lastRun: "6 days ago", runs: 312, user: user._id },
      { title: "App Startup Optimizer", desc: "Disable slow startup programs and prioritize system resources", icon: "Zap", enabled: true, lastRun: "On boot", runs: 634, user: user._id },
      { title: "Screenshot Organizer", desc: "Tag and sort screenshots by app context using AI vision", icon: "Image", enabled: false, lastRun: "Never", runs: 0, user: user._id },
    ];
    await automationRepository.model.insertMany(defaultRules);

    const defaultActivities = [
      { date: "2026-07-23", time: "11:42 AM", type: "download", label: "Downloaded Node.js Installer", iconType: "Download", color: "text-blue-400", user: user._id },
      { date: "2026-07-23", time: "10:15 AM", type: "meeting", label: "Meeting: Q3 Sprint Planning — 47 min", iconType: "Calendar", color: "text-purple-400", user: user._id },
      { date: "2026-07-23", time: "09:30 AM", type: "screenshot", label: "Screenshot: Figma wireframe", iconType: "Image", color: "text-cyan-400", user: user._id },
      { date: "2026-07-22", time: "04:22 PM", type: "file", label: "Edited DBMS_Presentation.pptx", iconType: "FileText", color: "text-green-400", user: user._id },
      { date: "2026-07-22", time: "02:10 PM", type: "project", label: "Project Helix — 2h 12m session", iconType: "Layers", color: "text-blue-400", user: user._id },
      { date: "2026-07-22", time: "10:00 AM", type: "backup", label: "Automatic backup completed — 4.2 GB", iconType: "CloudUpload", color: "text-emerald-400", user: user._id },
    ];
    await activityRepository.model.insertMany(defaultActivities);

    const defaultAnalytics = [
      { date: "Mon", score: 72, filesCreatedCount: 24, activeHours: 6.5, user: user._id },
      { date: "Tue", score: 85, filesCreatedCount: 31, activeHours: 7.2, user: user._id },
      { date: "Wed", score: 61, filesCreatedCount: 18, activeHours: 5.0, user: user._id },
      { date: "Thu", score: 90, filesCreatedCount: 42, activeHours: 8.4, user: user._id },
      { date: "Fri", score: 78, filesCreatedCount: 29, activeHours: 7.0, user: user._id },
      { date: "Sat", score: 45, filesCreatedCount: 11, activeHours: 3.2, user: user._id },
      { date: "Sun", score: 33, filesCreatedCount: 8, activeHours: 2.1, user: user._id },
    ];
    // Seed database models using raw model calls
    const AnalyticsModel = activityRepository.model.db.model("Analytics");
    await AnalyticsModel.insertMany(defaultAnalytics);

    const NotificationModel = activityRepository.model.db.model("Notification");
    await NotificationModel.create({
      msg: "Welcome to Project Helix! Desktop scan has completed initial setup.",
      time: "Just now",
      type: "success",
      user: user._id,
    });

    await auditLogRepository.logEvent(user._id, "REGISTER", "Account created and default configurations seeded");
  } catch (err) {
    logger.error(`Failed to handle UserRegistered event: ${err.message}`);
  }
});

helixEvents.on("FileIndexed", async ({ user, file }) => {
  logger.info(`Event: FileIndexed - ${file.name}`);
});

helixEvents.on("FileDeleted", async ({ user, file }) => {
  logger.info(`Event: FileDeleted - ${file.name}`);
  await auditLogRepository.logEvent(user, "DELETE_FILE", `Deleted file metadata: ${file.name}`);
});

helixEvents.on("FolderChanged", async ({ user, path }) => {
  logger.info(`Event: FolderChanged - ${path}`);
});

helixEvents.on("AutomationExecuted", async ({ user, rule }) => {
  logger.info(`Event: AutomationExecuted - ${rule.title}`);
  await auditLogRepository.logEvent(user, "RUN_AUTOMATION", `Rule executed: ${rule.title}`);
});

helixEvents.on("NotificationCreated", async ({ user, notification }) => {
  logger.info(`Event: NotificationCreated - ${notification.msg}`);
});

helixEvents.on("AIRequestCompleted", async ({ user, action }) => {
  logger.info(`Event: AIRequestCompleted - ${action}`);
  await auditLogRepository.logEvent(user, "AI_REQUEST", `Executed AI action: ${action}`);
});
