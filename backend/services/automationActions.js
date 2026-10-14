import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import mongoose from "mongoose";
import { scanFolders } from "./fileScanner.js";
import { fileRepository } from "../repositories/FileRepository.js";
import { logger } from "../utils/logger.js";

/**
 * Execute a validated automation action for a given user.
 * @param {string} actionType
 * @param {string} userId
 * @param {object} actionConfig
 */
export async function executeAutomationAction(actionType, userId, actionConfig = {}) {
  switch (actionType) {
    case "scan_directory":
      return await executeScanDirectory(userId, actionConfig);

    case "cleanup_temp":
      return await executeCleanupTemp(userId, actionConfig);

    case "organize_downloads":
      return await executeOrganizeDownloads(userId, actionConfig);

    case "backup_index":
      return await executeBackupIndex(userId, actionConfig);

    case "duplicate_check":
      return await executeDuplicateCheck(userId, actionConfig);

    default:
      throw new Error(`Unsupported automation action: '${actionType}'. Explicitly supported actions are: scan_directory, cleanup_temp, organize_downloads, backup_index, duplicate_check.`);
  }
}

/**
 * 1. Scan and index local user directories into MongoDB & ChromaDB
 */
async function executeScanDirectory(userId, config) {
  logger.info(`Running scan_directory automation for user ${userId}`);
  const scanResult = await scanFolders(userId);
  return {
    action: "scan_directory",
    scannedFolders: scanResult.scannedFolders || 0,
    filesIndexed: scanResult.filesIndexed || 0,
    timestamp: new Date().toISOString(),
    message: `Directory scan completed: ${scanResult.filesIndexed || 0} files indexed.`,
  };
}

/**
 * 2. Cleanup safe temporary files older than 24 hours
 */
async function executeCleanupTemp(userId, config) {
  logger.info(`Running cleanup_temp automation for user ${userId}`);
  const tempDir = os.tmpdir();
  let filesCleaned = 0;
  let bytesReclaimed = 0;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  try {
    const entries = await fs.readdir(tempDir);
    // Target only transient temp files with safe extensions
    const targetFiles = entries.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === ".tmp" || ext === ".log" || ext === ".cache" || f.startsWith("tmp-");
    });

    for (const f of targetFiles.slice(0, 50)) {
      const fullPath = path.join(tempDir, f);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile() && stat.mtimeMs < oneDayAgo) {
          bytesReclaimed += stat.size;
          await fs.unlink(fullPath);
          filesCleaned++;
        }
      } catch (err) {
        // Skip locked or in-use files
      }
    }
  } catch (err) {
    logger.warn(`Temp cleanup read warning: ${err.message}`);
  }

  const mbReclaimed = (bytesReclaimed / (1024 * 1024)).toFixed(2);
  return {
    action: "cleanup_temp",
    filesCleaned,
    bytesReclaimed,
    message: filesCleaned > 0
      ? `Cleaned ${filesCleaned} temporary file(s), reclaiming ${mbReclaimed} MB.`
      : `Temporary folder checked. No stale temporary files needed cleanup.`,
  };
}

/**
 * 3. Organize Downloads folder into categorized subfolders
 */
async function executeOrganizeDownloads(userId, config) {
  logger.info(`Running organize_downloads automation for user ${userId}`);
  const downloadsDir = path.join(os.homedir(), "Downloads");

  if (!fsSync.existsSync(downloadsDir)) {
    return {
      action: "organize_downloads",
      filesOrganized: 0,
      message: "Downloads directory not found on host system.",
    };
  }

  const categories = {
    Documents: [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".csv", ".pptx", ".ppt"],
    Images: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico"],
    Media: [".mp4", ".mkv", ".mp3", ".wav", ".avi", ".mov"],
    Archives: [".zip", ".tar", ".gz", ".7z", ".rar"],
  };

  let filesOrganized = 0;
  const entries = await fs.readdir(downloadsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    let targetCat = null;
    for (const [cat, exts] of Object.entries(categories)) {
      if (exts.includes(ext)) {
        targetCat = cat;
        break;
      }
    }

    if (!targetCat) continue;

    const targetSubfolder = path.join(downloadsDir, targetCat);
    await fs.mkdir(targetSubfolder, { recursive: true });

    const srcPath = path.join(downloadsDir, entry.name);
    let destPath = path.join(targetSubfolder, entry.name);

    if (fsSync.existsSync(destPath)) {
      const base = path.basename(entry.name, ext);
      destPath = path.join(targetSubfolder, `${base}_${Date.now()}${ext}`);
    }

    try {
      await fs.rename(srcPath, destPath);
      filesOrganized++;
    } catch (err) {
      // Skip if file is currently open or downloading
    }
  }

  return {
    action: "organize_downloads",
    filesOrganized,
    message: filesOrganized > 0
      ? `Organized ${filesOrganized} file(s) into categorized Downloads folders.`
      : "Downloads folder evaluated. All files are already categorized.",
  };
}

/**
 * 4. Backup MongoDB file index & metadata to local secure snapshot
 */
async function executeBackupIndex(userId, config) {
  logger.info(`Running backup_index automation for user ${userId}`);
  const backupDir = path.join(os.homedir(), ".helix", "backups");
  await fs.mkdir(backupDir, { recursive: true });

  const isUserValid = mongoose.Types.ObjectId.isValid(userId);
  const files = isUserValid ? await fileRepository.find({ user: userId }) : [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `helix-file-index-${timestamp}.json`);

  const payload = {
    userId: String(userId),
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    files: files.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      category: f.category,
      tags: f.tags,
      favorite: f.favorite,
      modifiedDate: f.modifiedDate,
    })),
  };

  await fs.writeFile(backupFile, JSON.stringify(payload, null, 2), "utf-8");
  const stat = await fs.stat(backupFile);

  return {
    action: "backup_index",
    backupFile,
    recordsCount: files.length,
    backupBytes: stat.size,
    message: `Saved verified index snapshot of ${files.length} items (${(stat.size / 1024).toFixed(1)} KB) to ${path.basename(backupFile)}.`,
  };
}

/**
 * 5. Check indexed files for exact byte-identical duplicates via SHA-256
 */
async function executeDuplicateCheck(userId, config) {
  logger.info(`Running duplicate_check automation for user ${userId}`);
  const isUserValid = mongoose.Types.ObjectId.isValid(userId);
  const userFiles = isUserValid ? await fileRepository.find({ user: userId }) : [];

  // Group by exact byte size
  const sizeMap = new Map();
  for (const f of userFiles) {
    if (!f.size || !f.path || !fsSync.existsSync(f.path)) continue;
    try {
      const stat = fsSync.statSync(f.path);
      if (stat.size > 0) {
        if (!sizeMap.has(stat.size)) {
          sizeMap.set(stat.size, []);
        }
        sizeMap.get(stat.size).push({ file: f, path: f.path, size: stat.size });
      }
    } catch (e) {
      // skip inaccessible file
    }
  }

  const duplicates = [];
  let potentialReclaimBytes = 0;

  for (const [size, candidates] of sizeMap.entries()) {
    if (candidates.length < 2) continue;

    // Calculate SHA-256 hash for candidates of identical size
    const hashMap = new Map();
    for (const cand of candidates) {
      try {
        const buffer = await fs.readFile(cand.path);
        const hash = crypto.createHash("sha256").update(buffer).digest("hex");
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash).push(cand);
      } catch (e) {
        // skip unreadable
      }
    }

    for (const [hash, group] of hashMap.entries()) {
      if (group.length > 1) {
        duplicates.push({
          hash,
          size,
          count: group.length,
          files: group.map(g => g.file.name),
        });
        potentialReclaimBytes += size * (group.length - 1);
      }
    }
  }

  const totalDuplicates = duplicates.reduce((acc, g) => acc + (g.count - 1), 0);
  const mbSavings = (potentialReclaimBytes / (1024 * 1024)).toFixed(2);

  return {
    action: "duplicate_check",
    duplicateGroupsCount: duplicates.length,
    totalDuplicateFiles: totalDuplicates,
    potentialReclaimBytes,
    message: duplicates.length > 0
      ? `Found ${totalDuplicates} duplicate file(s) across ${duplicates.length} groups (~${mbSavings} MB reclaimable).`
      : "Duplicate check complete. No byte-identical duplicate files found.",
  };
}
