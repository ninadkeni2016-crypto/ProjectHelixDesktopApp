import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";
import { fileRepository } from "../repositories/FileRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { helixEvents } from "../events/eventEmitter.js";
import { queueManager } from "../queues/queueManager.js";
import { fileScannerLogger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, "../workers/scannerWorker.js");

export const scanFolders = (userId) => {
  const safeUserId = String(userId || "");
  return new Promise((resolve, reject) => {
    queueManager.addTask("scan", async () => {
      fileScannerLogger.info(`Worker starting scan for user ${safeUserId}`);

      try {
        await activityRepository.create({
          title: "Scan Triggered",
          desc: "Started local directory crawls under home path.",
          type: "project",
          user: safeUserId,
        });
      } catch (actErr) {
        fileScannerLogger.warn(`Initial scan activity notice: ${actErr.message}`);
      }

      return new Promise((res, rej) => {
        const worker = new Worker(workerPath, {
          workerData: { userId: safeUserId }
        });

        worker.on("message", async (message) => {
          try {
            const { files } = message;
            fileScannerLogger.info(`Worker crawled ${files.length} files. Writing to database...`);

            for (const fileData of files) {
              await fileRepository.model.findOneAndUpdate(
                { user: safeUserId, path: fileData.path },
                fileData,
                { upsert: true, new: true }
              );
              helixEvents.emit("FileIndexed", { user: safeUserId, file: fileData });
            }

            try {
              await activityRepository.create({
                title: "Scan Complete",
                desc: `Indexed ${files.length} local files in user directories.`,
                type: "backup",
                user: safeUserId,
              });
            } catch (actErr) {
              fileScannerLogger.warn(`Completion scan activity notice: ${actErr.message}`);
            }

            fileScannerLogger.info(`Indexing complete for user ${safeUserId}`);
            res(files.length);
          } catch (err) {
            fileScannerLogger.error(`Database write failed: ${err.message}`);
            rej(err);
          }
        });

        worker.on("error", (err) => {
          fileScannerLogger.error(`Worker scanner crashed: ${err.message}`);
          rej(err);
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            rej(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    }, { userId });

    resolve({ success: true, message: "Folder scanner queued in background." });
  });
};
