import Automation from "../models/Automation.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";
import { executeAutomationAction } from "./automationActions.js";
import { logger } from "../utils/logger.js";

let schedulerInterval = null;

export function startAutomationScheduler(userId) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  logger.info(`Starting Automation Scheduler for user: ${userId}`);

  // Check active enabled automations every 60 seconds
  schedulerInterval = setInterval(async () => {
    try {
      const activeAutomations = await Automation.find({ user: userId, enabled: true });

      for (const auto of activeAutomations) {
        // Execute automation only if it has never run or at least 1 hour has elapsed since last execution
        const lastRunTime = auto.lastRunAt ? new Date(auto.lastRunAt).getTime() : 0;
        const elapsedMs = Date.now() - lastRunTime;

        if (!auto.lastRunAt || elapsedMs >= 3600000) {
          try {
            logger.info(`Scheduler executing automation: ${auto.title} (${auto.actionType})`);
            const result = await executeAutomationAction(
              auto.actionType || "scan_directory",
              userId,
              auto.actionConfig || {}
            );

            const now = new Date();
            auto.runs = (auto.runs || 0) + 1;
            auto.lastRun = "Just now";
            auto.lastRunAt = now;
            auto.lastStatus = "success";
            auto.lastError = null;
            auto.lastResult = result;
            await auto.save();

            await Activity.create({
              date: now.toISOString().split("T")[0],
              time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "project",
              label: `Scheduled: ${auto.title}`,
              title: "Scheduled Task Completed",
              desc: `${auto.title} — ${result.message}`,
              iconType: auto.icon || "Zap",
              color: "text-purple-400",
              status: "completed",
              user: userId,
            });

            await Notification.create({
              msg: `${auto.title}: ${result.message}`,
              time: "Just now",
              type: "success",
              user: userId,
            });
          } catch (execErr) {
            auto.lastStatus = "failed";
            auto.lastError = execErr.message;
            auto.lastRunAt = new Date();
            auto.lastRun = "Failed just now";
            await auto.save();

            await Activity.create({
              date: new Date().toISOString().split("T")[0],
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "project",
              label: `Scheduled failed: ${auto.title}`,
              title: "Scheduled Task Failed",
              desc: `${auto.title} failed: ${execErr.message}`,
              iconType: auto.icon || "Zap",
              color: "text-red-400",
              status: "failed",
              user: userId,
            });
          }
        }
      }
    } catch (error) {
      logger.error("Error in automation scheduler loop: " + error.message);
    }
  }, 60000);
}

export function stopAutomationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info("Automation scheduler stopped.");
  }
}
