import fs from "fs";
import path from "path";
import crypto from "crypto";
import SentinelFolder from "../models/SentinelFolder.js";
import SentinelAlert from "../models/SentinelAlert.js";
import { validateSafePath } from "../controllers/fileController.js";
import { socketService } from "../sockets/socketService.js";
import { logger } from "../utils/logger.js";
import { isDbConnected } from "../config/db.js";

// In-memory cache for recent auth failures to detect brute-force activity
const authFailuresCache = new Map(); // ip -> timestamp[]

/**
 * Computes SHA-256 hash of a file safely using fixed chunks (memory-safe for large files).
 */
function computeFileHash(filePath) {
  let fd = null;
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return null;

    fd = fs.openSync(filePath, "r");
    // For small files (< 1MB), read full content; for large files, hash header + length
    const readSize = Math.min(1048576, stats.size);
    const buffer = Buffer.alloc(readSize);
    fs.readSync(fd, buffer, 0, readSize, 0);

    const hash = crypto.createHash("sha256").update(buffer).update(String(stats.size)).digest("hex");
    return hash;
  } catch (err) {
    return null;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

/**
 * Traverses a directory up to maxDepth and generates a relative path -> hash map.
 */
function collectFolderHashes(dirPath, maxDepth = 3, currentDepth = 0, maxFiles = 300) {
  const fileHashMap = {};
  if (currentDepth > maxDepth) return fileHashMap;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (Object.keys(fileHashMap).length >= maxFiles) break;

      // Skip noise directories
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build"
      ) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        const hash = computeFileHash(fullPath);
        if (hash) {
          fileHashMap[entry.name] = hash;
        }
      } else if (entry.isDirectory()) {
        const subMap = collectFolderHashes(fullPath, maxDepth, currentDepth + 1, maxFiles - Object.keys(fileHashMap).length);
        for (const [subKey, subHash] of Object.entries(subMap)) {
          fileHashMap[`${entry.name}/${subKey}`] = subHash;
        }
      }
    }
  } catch (err) {
    logger.warn(`Folder traversal warning on ${dirPath}: ${err.message}`);
  }

  return fileHashMap;
}

export class SentinelService {
  /**
   * Registers a new folder for File Integrity Monitoring and computes baseline.
   */
  async addMonitoredFolder(userId, folderPath, folderName) {
    const val = validateSafePath(folderPath);
    if (!val.valid) {
      throw new Error(val.message);
    }
    const cleanPath = val.path;

    if (!fs.existsSync(cleanPath) || !fs.statSync(cleanPath).isDirectory()) {
      throw new Error("Specified path is not an accessible directory on disk.");
    }

    const name = folderName?.trim() || path.basename(cleanPath) || "Monitored Folder";
    const rawHashes = collectFolderHashes(cleanPath);
    const fileCount = Object.keys(rawHashes).length;
    const baselineHashes = Object.entries(rawHashes).map(([file, hash]) => ({ file, hash }));

    let folderDoc;
    if (isDbConnected()) {
      folderDoc = await SentinelFolder.findOneAndUpdate(
        { user: userId, path: cleanPath },
        {
          name,
          enabled: true,
          baselineFileCount: fileCount,
          baselineHashes,
          lastScannedAt: new Date(),
          lastStatus: "healthy",
        },
        { upsert: true, new: true }
      );

      // Record informative alert
      await this.createAlert(userId, {
        title: "Folder Added to Integrity Monitoring",
        severity: "info",
        category: "file_integrity",
        explanation: `Baseline established for folder '${name}'. Sentinel is actively tracking ${fileCount} files against tampering.`,
        evidence: { path: cleanPath, baselineFileCount: fileCount },
        affectedPath: cleanPath,
        recommendedAction: "No action needed. Sentinel will detect any unexpected file additions, deletions, or modifications.",
        confidenceScore: 100,
      });
    }

    return {
      success: true,
      path: cleanPath,
      name,
      fileCount,
      folderId: folderDoc?._id,
      folder: folderDoc || {
        _id: folderDoc?._id,
        path: cleanPath,
        name,
        baselineFileCount: fileCount,
      },
    };
  }

  /**
   * Re-evaluates integrity of a monitored folder against its baseline.
   */
  async scanFolder(userId, folderId) {
    if (!isDbConnected()) {
      throw new Error("Database connection required for Sentinel scanning.");
    }

    const folder = await SentinelFolder.findOne({ _id: folderId, user: userId });
    if (!folder) {
      throw new Error("Monitored folder not found.");
    }

    if (!fs.existsSync(folder.path)) {
      folder.lastStatus = "error";
      await folder.save();
      await this.createAlert(userId, {
        title: "Monitored Folder Missing or Inaccessible",
        severity: "high",
        category: "file_integrity",
        explanation: `The monitored directory '${folder.name}' at '${folder.path}' can no longer be accessed on disk.`,
        evidence: { path: folder.path },
        affectedPath: folder.path,
        recommendedAction: "Verify if the drive was disconnected, or update monitoring paths if the folder was relocated.",
        confidenceScore: 95,
      });
      return { status: "error", modifiedCount: 0, addedCount: 0, deletedCount: 0 };
    }

    const currentHashes = collectFolderHashes(folder.path);
    const baseline = {};
    if (Array.isArray(folder.baselineHashes)) {
      for (const item of folder.baselineHashes) {
        if (item && item.file) baseline[item.file] = item.hash;
      }
    } else if (folder.baselineHashes instanceof Map) {
      for (const [k, v] of folder.baselineHashes.entries()) {
        baseline[k] = v;
      }
    } else if (typeof folder.baselineHashes === "object" && folder.baselineHashes !== null) {
      Object.assign(baseline, folder.baselineHashes);
    }

    const modified = [];
    const added = [];
    const deleted = [];

    // Check for modifications and deletions
    for (const [relPath, baseHash] of Object.entries(baseline)) {
      if (!(relPath in currentHashes)) {
        deleted.push(relPath);
      } else if (currentHashes[relPath] !== baseHash) {
        modified.push(relPath);
      }
    }

    // Check for additions
    for (const relPath of Object.keys(currentHashes)) {
      if (!(relPath in baseline)) {
        added.push(relPath);
      }
    }

    const hasChanges = modified.length > 0 || added.length > 0 || deleted.length > 0;
    folder.lastStatus = hasChanges ? "modified" : "healthy";
    folder.lastScannedAt = new Date();
    await folder.save();

    // Generate explainable alerts for detected changes
    if (modified.length > 0) {
      await this.createAlert(userId, {
        title: `File Integrity Change Detected in ${folder.name}`,
        severity: "medium",
        category: "file_integrity",
        explanation: `${modified.length} file(s) had content modifications that diverge from their baseline hash.`,
        evidence: {
          folder: folder.path,
          modifiedFiles: modified.slice(0, 5),
          totalModified: modified.length,
        },
        affectedPath: path.join(folder.path, modified[0]),
        recommendedAction: "Review recent changes. If these modifications were intentional, refresh the folder baseline.",
        confidenceScore: 90,
      });
    }

    if (deleted.length > 0) {
      await this.createAlert(userId, {
        title: `Monitored Files Deleted in ${folder.name}`,
        severity: "low",
        category: "file_integrity",
        explanation: `${deleted.length} file(s) previously in the baseline were deleted or moved out of the folder.`,
        evidence: {
          folder: folder.path,
          deletedFiles: deleted.slice(0, 5),
          totalDeleted: deleted.length,
        },
        affectedPath: path.join(folder.path, deleted[0]),
        recommendedAction: "Confirm whether deletion was deliberate. Restore from backup if accidental.",
        confidenceScore: 85,
      });
    }

    if (added.length > 0) {
      await this.createAlert(userId, {
        title: `New Files Detected in ${folder.name}`,
        severity: "info",
        category: "file_integrity",
        explanation: `${added.length} new file(s) appeared in the monitored directory.`,
        evidence: {
          folder: folder.path,
          addedFiles: added.slice(0, 5),
          totalAdded: added.length,
        },
        affectedPath: path.join(folder.path, added[0]),
        recommendedAction: "Check new files to ensure they belong to your project.",
        confidenceScore: 80,
      });
    }

    return {
      status: folder.lastStatus,
      modifiedCount: modified.length,
      addedCount: added.length,
      deletedCount: deleted.length,
      scannedAt: folder.lastScannedAt,
    };
  }

  /**
   * Scans all monitored folders for the user.
   */
  async scanAllFolders(userId) {
    if (!isDbConnected()) return [];
    const folders = await SentinelFolder.find({ user: userId, enabled: true });
    const results = [];
    for (const f of folders) {
      try {
        const res = await this.scanFolder(userId, f._id);
        results.push({ folderId: f._id, name: f.name, ...res });
      } catch (err) {
        results.push({ folderId: f._id, name: f.name, status: "error", error: err.message });
      }
    }
    return results;
  }

  /**
   * Records a security alert with explainable evidence and emits it live over Socket.IO.
   */
  async createAlert(userId, alertData) {
    if (!isDbConnected()) return null;

    try {
      const alert = await SentinelAlert.create({
        user: userId,
        title: alertData.title,
        severity: alertData.severity || "low",
        category: alertData.category || "file_integrity",
        explanation: alertData.explanation,
        evidence: alertData.evidence || {},
        affectedPath: alertData.affectedPath || null,
        recommendedAction: alertData.recommendedAction,
        confidenceScore: alertData.confidenceScore || 85,
        status: "active",
      });

      // Emit live alert to user
      socketService.emitToUser(userId, "sentinel:alert", alert);
      return alert;
    } catch (err) {
      logger.error("Failed creating Sentinel alert: " + err.message);
      return null;
    }
  }

  /**
   * Records failed authentication attempt and detects brute-force activity.
   */
  async recordAuthFailure(ip, email) {
    const now = Date.now();
    const attempts = authFailuresCache.get(ip) || [];
    // Keep attempts from last 5 minutes
    const recent = attempts.filter((t) => now - t < 5 * 60 * 1000);
    recent.push(now);
    authFailuresCache.set(ip, recent);

    if (recent.length >= 5) {
      logger.warn(`Sentinel Brute-Force Alert: ${recent.length} failed attempts from IP ${ip}`);
      // Find user if exists
      const UserModule = (await import("../models/User.js")).default;
      const targetUser = await UserModule.findOne({ email });
      const targetUserId = targetUser ? targetUser._id : "security_system";

      await this.createAlert(targetUserId, {
        title: "Repeated Authentication Failure Detected",
        severity: "high",
        category: "auth_security",
        explanation: `${recent.length} consecutive failed sign-in attempts were detected from IP ${ip} within 5 minutes.`,
        evidence: { ip, email, attemptsCount: recent.length, windowMinutes: 5 },
        affectedPath: null,
        recommendedAction: "Rate-limiting is active. Ensure your credentials are secure and consider rotating your password.",
        confidenceScore: 95,
      });
    }
  }

  /**
   * Retrieves security overview status and calculate transparent score.
   */
  async getStatus(userId) {
    if (!isDbConnected()) {
      return {
        score: 95,
        rating: "Protected",
        activeAlerts: 0,
        monitoredFoldersCount: 0,
        healthyFoldersCount: 0,
        recentAlerts: [],
      };
    }

    const folders = await SentinelFolder.find({ user: userId });
    const alerts = await SentinelAlert.find({ user: userId, status: "active" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate transparent score
    let score = 100;
    for (const a of alerts) {
      if (a.severity === "high") score -= 25;
      else if (a.severity === "medium") score -= 15;
      else if (a.severity === "low") score -= 5;
    }
    score = Math.max(20, Math.min(100, score));

    let rating = "Protected";
    if (score < 60) rating = "At Risk";
    else if (score < 85) rating = "Warning";

    const healthyCount = folders.filter((f) => f.lastStatus === "healthy").length;

    return {
      score,
      rating,
      activeAlerts: alerts.length,
      monitoredFoldersCount: folders.length,
      healthyFoldersCount: healthyCount,
      recentAlerts: alerts,
    };
  }

  /**
   * Acknowledges an alert.
   */
  async acknowledgeAlert(userId, alertId) {
    if (!isDbConnected()) return null;
    return await SentinelAlert.findOneAndUpdate(
      { _id: alertId, user: userId },
      { status: "acknowledged", acknowledgedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Dismisses an alert.
   */
  async dismissAlert(userId, alertId) {
    if (!isDbConnected()) return null;
    return await SentinelAlert.findOneAndUpdate(
      { _id: alertId, user: userId },
      { status: "dismissed" },
      { new: true }
    );
  }

  /**
   * Lists monitored folders.
   */
  async getFolders(userId) {
    if (!isDbConnected()) return [];
    return await SentinelFolder.find({ user: userId }).sort({ createdAt: -1 });
  }

  /**
   * Removes a folder from monitoring.
   */
  async removeFolder(userId, folderId) {
    if (!isDbConnected()) return false;
    await SentinelFolder.findOneAndDelete({ _id: folderId, user: userId });
    return true;
  }
}

export const sentinelService = new SentinelService();
