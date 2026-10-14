import fs from "fs";
import path from "path";
import { fileRepository } from "../repositories/FileRepository.js";
import { logger } from "../utils/logger.js";

const backupDir = "backups";

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

export const exportMetadata = async (userId) => {
  try {
    const files = await fileRepository.find({ user: userId });
    const backupPath = path.join(backupDir, `metadata-backup-${userId}-${Date.now()}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(files, null, 2), "utf8");
    logger.info(`Metadata backup exported successfully to ${backupPath}`);
    return backupPath;
  } catch (err) {
    logger.error(`Failed to export metadata backup: ${err.message}`);
    throw err;
  }
};

export const restoreMetadata = async (userId, filepath) => {
  try {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file does not exist at ${filepath}`);
    }

    const backupContent = fs.readFileSync(filepath, "utf8");
    const parsedFiles = JSON.parse(backupContent);

    await fileRepository.deleteMany({ user: userId });

    const normalized = parsedFiles.map(f => {
      delete f._id;
      delete f.createdAt;
      delete f.updatedAt;
      f.user = userId;
      return f;
    });

    await fileRepository.model.insertMany(normalized);
    logger.info(`Metadata restored successfully from ${filepath} for user ${userId}`);
    return true;
  } catch (err) {
    logger.error(`Failed to restore metadata backup: ${err.message}`);
    throw err;
  }
};
