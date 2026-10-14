import chokidar from "chokidar";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { fileRepository } from "../repositories/FileRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { helixEvents } from "../events/eventEmitter.js";
import { fileScannerLogger } from "../utils/logger.js";
import { getTagsForFile, formatBytes, getCategory } from "../scanner/scannerHelper.js";

let watcherInstance = null;

export function initFolderWatcher(userId) {
  if (watcherInstance) {
    fileScannerLogger.info("Watcher already active. Stopping existing watcher...");
    stopFolderWatcher();
  }

  const homeDir = os.homedir();
  const foldersToWatch = ["Desktop", "Documents", "Downloads", "Pictures", "Videos"].map(f =>
    path.join(homeDir, f)
  );

  fileScannerLogger.info(`Initializing folder watcher for folders: ${foldersToWatch.join(", ")}`);

  watcherInstance = chokidar.watch(foldersToWatch, {
    ignored: [
      /(^|[\/\\])\../, 
      "**/node_modules/**",
      "**/AppData/**",
      "**/Library/**",
      "**/.git/**",
    ],
    persistent: true,
    ignoreInitial: true, 
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcherInstance
    .on("add", async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        const name = path.basename(filePath);
        const ext = path.extname(filePath);
        
        const fileData = {
          name,
          path: filePath,
          extension: ext.replace(".", ""),
          size: formatBytes(stats.size),
          sizeBytes: stats.size,
          createdDate: stats.birthtime,
          modifiedDate: stats.mtime,
          category: getCategory(ext),
          tags: getTagsForFile(ext, name),
          user: userId,
        };

        const doc = await fileRepository.model.findOneAndUpdate(
          { user: userId, path: filePath },
          fileData,
          { upsert: true, new: true }
        );

        fileScannerLogger.info(`Folder Watcher: File added & indexed - ${name}`);
        
        // Emit dynamic events
        helixEvents.emit("FileIndexed", { user: userId, file: doc });
        helixEvents.emit("FolderChanged", { user: userId, path: filePath });

        await activityRepository.create({
          title: "File Added",
          desc: `Indexed matching watch file: ${name}`,
          type: "file",
          user: userId,
        });

        const notif = await notificationRepository.create({
          msg: `File watcher indexed new file: ${name}`,
          type: "info",
          user: userId,
        });

        helixEvents.emit("NotificationCreated", { user: userId, notification: notif });
      } catch (error) {
        fileScannerLogger.error(`Folder Watcher add index failed: ${error.message}`);
      }
    })
    .on("change", async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        const name = path.basename(filePath);
        
        const updateData = {
          size: formatBytes(stats.size),
          sizeBytes: stats.size,
          modifiedDate: stats.mtime,
        };

        const doc = await fileRepository.model.findOneAndUpdate(
          { user: userId, path: filePath },
          { $set: updateData },
          { new: true }
        );

        fileScannerLogger.info(`Folder Watcher: File modified & index updated - ${name}`);
        
        helixEvents.emit("FileIndexed", { user: userId, file: doc });
        helixEvents.emit("FolderChanged", { user: userId, path: filePath });

        await activityRepository.create({
          title: "File Modified",
          desc: `Updated size and date metadata for: ${name}`,
          type: "file",
          user: userId,
        });
      } catch (error) {
        fileScannerLogger.error(`Folder Watcher change index failed: ${error.message}`);
      }
    })
    .on("unlink", async (filePath) => {
      try {
        const name = path.basename(filePath);
        await fileRepository.model.findOneAndDelete({ user: userId, path: filePath });

        fileScannerLogger.info(`Folder Watcher: File removed from disk and index - ${name}`);
        
        helixEvents.emit("FileDeleted", { user: userId, file: { name, path: filePath } });
        helixEvents.emit("FolderChanged", { user: userId, path: filePath });

        await activityRepository.create({
          title: "File Removed",
          desc: `Deleted metadata index for removed file: ${name}`,
          type: "file",
          user: userId,
        });
      } catch (error) {
        fileScannerLogger.error(`Folder Watcher unlink index failed: ${error.message}`);
      }
    });

  return watcherInstance;
}

export function stopFolderWatcher() {
  if (watcherInstance) {
    watcherInstance.close();
    watcherInstance = null;
    fileScannerLogger.info("Folder watcher stopped.");
  }
}
