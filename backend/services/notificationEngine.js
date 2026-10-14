import si from "systeminformation";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { helixEvents } from "../events/eventEmitter.js";
import { queueManager } from "../queues/queueManager.js";
import { logger } from "../utils/logger.js";
import { socketService } from "../sockets/socketService.js";

let intervalId = null;
const alertState = {
  cpuHigh: false,
  diskLow: false,
};

export function startNotificationEngine(userId) {
  if (intervalId) {
    clearInterval(intervalId);
  }

  logger.info(`Starting background Notification Engine for user: ${userId}`);

  intervalId = setInterval(async () => {
    try {
      const load = await si.currentLoad().catch(() => ({ currentLoad: 50 }));
      const cpuLoad = load.currentLoad;

      if (cpuLoad > 85 && !alertState.cpuHigh) {
        alertState.cpuHigh = true;
        
        queueManager.addTask("notification", async () => {
          const notif = await notificationRepository.create({
            msg: `High CPU Warning: System load is currently at ${Math.round(cpuLoad)}%.`,
            type: "warning",
            user: userId,
          });

          await activityRepository.create({
            title: "System Alarm",
            desc: `High CPU usage detected: ${Math.round(cpuLoad)}%`,
            type: "system",
            user: userId,
          });

          helixEvents.emit("NotificationCreated", { user: userId, notification: notif });
          if (socketService) {
            socketService.pushNotification(userId, notif);
          }
        }, { userId, trigger: "cpu_load" });

      } else if (cpuLoad <= 80) {
        alertState.cpuHigh = false;
      }

      const fs = await si.fsSize().catch(() => []);
      const primaryDisk = fs[0];
      if (primaryDisk) {
        const percentUsed = Math.round((primaryDisk.used / primaryDisk.size) * 100);
        if (percentUsed > 90 && !alertState.diskLow) {
          alertState.diskLow = true;
          
          queueManager.addTask("notification", async () => {
            const notif = await notificationRepository.create({
              msg: `Low Storage Warning: Primary disk is ${percentUsed}% full.`,
              type: "warning",
              user: userId,
            });

            helixEvents.emit("NotificationCreated", { user: userId, notification: notif });
            if (socketService) {
              socketService.pushNotification(userId, notif);
            }
          }, { userId, trigger: "low_storage" });

        } else if (percentUsed <= 85) {
          alertState.diskLow = false;
        }
      }
    } catch (error) {
      logger.error("Error running notification engine check: " + error.message);
    }
  }, 30000);
}

export function stopNotificationEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Notification engine stopped.");
  }
}
