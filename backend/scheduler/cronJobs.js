import cron from "node-cron";
import fs from "fs";
import path from "path";
import { scanFolders } from "../services/fileScanner.js";
import { exportMetadata } from "../backup/backupManager.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { logger } from "../utils/logger.js";

export const initCronJobs = () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  logger.info("Initializing Cron Scheduler...");

  // 1. Rescan folders every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    logger.info("Cron: Starting scheduled folders scan...");
    try {
      const users = await userRepository.find();
      for (const u of users) {
        await scanFolders(u._id);
      }
    } catch (e) {
      logger.error(`Cron Rescan failed: ${e.message}`);
    }
  });

  // 2. Clean logs daily at midnight (delete logs older than 14 days)
  cron.schedule("0 0 * * *", () => {
    logger.info("Cron: Cleaning logs daily...");
    const logDir = "logs";
    try {
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        const threshold = Date.now() - 14 * 24 * 60 * 60 * 1000;

        for (const file of files) {
          const filepath = path.join(logDir, file);
          const stats = fs.statSync(filepath);
          if (stats.mtimeMs < threshold) {
            fs.unlinkSync(filepath);
            logger.info(`Cron: Cleaned old log file ${file}`);
          }
        }
      }
    } catch (e) {
      logger.error(`Cron Log clean failed: ${e.message}`);
    }
  });

  // 3. Backup metadata daily at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    logger.info("Cron: Starting scheduled daily metadata backup...");
    try {
      const users = await userRepository.find();
      for (const u of users) {
        await exportMetadata(u._id);
      }
    } catch (e) {
      logger.error(`Cron Metadata Backup failed: ${e.message}`);
    }
  });

  // 4. Cleanup read notifications weekly on Sunday at midnight
  cron.schedule("0 0 * * 0", async () => {
    logger.info("Cron: Cleaning up read notifications...");
    try {
      const result = await notificationRepository.deleteMany({ read: true });
      logger.info(`Cron: Cleaned up ${result.deletedCount} read notifications.`);
    } catch (e) {
      logger.error(`Cron Notification clean failed: ${e.message}`);
    }
  });
};
