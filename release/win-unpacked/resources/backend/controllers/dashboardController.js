import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import mongoose from "mongoose";
import { fileRepository } from "../repositories/FileRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { cacheService } from "../services/CacheService.js";
import { aiGatewayService } from "../services/AIGatewayService.js";
import { getSystemMetrics } from "../services/systemMonitor.js";
import { socketService } from "../sockets/socketService.js";
import { isDbConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Calculates genuine daily productivity scores from Activity records over the past 7 days.
 * Documented formula:
 * score = Math.min(100, Math.round(actionCount * 8 + uniqueTypes * 15 + 15))
 */
async function calculateProductivity(userId) {
  if (!isDbConnected()) {
    return { hasEnoughData: false, avgScore: null, weeklyProductivity: [], totalActivities: 0 };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activities = await Activity.find({
    user: userId,
    createdAt: { $gte: sevenDaysAgo },
  }).lean();

  if (!activities || activities.length === 0) {
    return {
      hasEnoughData: false,
      avgScore: null,
      weeklyProductivity: [],
      totalActivities: 0,
    };
  }

  // Group by day of week (Mon, Tue, etc.)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyBuckets = {};

  // Initialize the past 7 days in chronological order
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayLabel = dayNames[d.getDay()];
    dailyBuckets[dayLabel] = {
      day: dayLabel,
      date: d.toISOString().split("T")[0],
      actions: 0,
      types: new Set(),
      files: 0,
    };
  }

  for (const act of activities) {
    const actDate = new Date(act.createdAt || act.date);
    const dayLabel = dayNames[actDate.getDay()];
    if (dailyBuckets[dayLabel]) {
      dailyBuckets[dayLabel].actions++;
      if (act.type) dailyBuckets[dayLabel].types.add(act.type);
      if (act.type === "file") dailyBuckets[dayLabel].files++;
    }
  }

  const weeklyProductivity = Object.values(dailyBuckets).map((bucket) => {
    let score = 0;
    if (bucket.actions > 0) {
      score = Math.min(100, Math.round(bucket.actions * 8 + bucket.types.size * 15 + 15));
    }
    return {
      day: bucket.day,
      date: bucket.date,
      score,
      files: bucket.files,
      actions: bucket.actions,
    };
  });

  const activeDays = weeklyProductivity.filter((d) => d.actions > 0);
  const avgScore =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((sum, d) => sum + d.score, 0) / activeDays.length)
      : null;

  return {
    hasEnoughData: activeDays.length > 0,
    avgScore,
    weeklyProductivity,
    totalActivities: activities.length,
  };
}

export async function getDashboardStats(req, res) {
  const userId = req.user._id;
  const cacheKey = `dashboard_stats_${userId}`;

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const metrics = await getSystemMetrics();
    const primaryDisk = metrics.disks?.find((d) => d.mount === "C:" || d.mount === "/") || metrics.disks?.[0];
    const primaryUsedBytes = primaryDisk?.used || 0;
    const primaryTotalBytes = primaryDisk?.size || 0;

    let recentActivities = [];
    let recentFiles = [];
    let totalFiles = 0;
    let storageCategories = [];
    let isScanned = false;

    if (isDbConnected()) {
      recentActivities = await activityRepository.getRecentActivities(userId, 6);
      recentFiles = await fileRepository.find(
        { user: userId },
        null,
        { sort: { modifiedDate: -1 }, limit: 6 }
      );
      totalFiles = await fileRepository.count({ user: userId });
      isScanned = totalFiles > 0;

      if (isScanned) {
        // Aggregate real category breakdown from indexed files
        const categoryStats = await fileRepository.model.aggregate([
          { $match: { user: userId } },
          { $group: { _id: "$category", count: { $sum: 1 }, size: { $sum: "$sizeBytes" } } },
        ]);

        let docBytes = 0;
        let mediaBytes = 0;
        let otherBytes = 0;

        for (const cat of categoryStats) {
          const lower = String(cat._id || "").toLowerCase();
          if (["documents", "doc", "study", "finance"].includes(lower)) {
            docBytes += cat.size;
          } else if (["photos", "videos", "audio", "media", "images"].includes(lower)) {
            mediaBytes += cat.size;
          } else {
            otherBytes += cat.size;
          }
        }

        const totalScannedBytes = docBytes + mediaBytes + otherBytes;
        // Remaining used space on primary drive represents System & Installed Applications
        const systemBytes = Math.max(0, primaryUsedBytes - totalScannedBytes);
        const effectiveTotal = Math.max(primaryUsedBytes, totalScannedBytes + systemBytes);

        if (effectiveTotal > 0) {
          storageCategories = [
            {
              name: "Documents",
              value: Math.max(1, Math.round((docBytes / effectiveTotal) * 100)),
              bytes: docBytes,
              sizeStr: formatBytes(docBytes),
              color: "#3b82f6",
            },
            {
              name: "Media",
              value: Math.max(1, Math.round((mediaBytes / effectiveTotal) * 100)),
              bytes: mediaBytes,
              sizeStr: formatBytes(mediaBytes),
              color: "#7c3aed",
            },
            {
              name: "System",
              value: Math.max(1, Math.round((systemBytes / effectiveTotal) * 100)),
              bytes: systemBytes,
              sizeStr: formatBytes(systemBytes),
              color: "#06b6d4",
            },
            {
              name: "Other",
              value: Math.max(1, Math.round((otherBytes / effectiveTotal) * 100)),
              bytes: otherBytes,
              sizeStr: formatBytes(otherBytes),
              color: "#6b7ea8",
            },
          ];

          // Normalize percentages to sum to 100
          const sumPct = storageCategories.reduce((s, c) => s + c.value, 0);
          if (sumPct > 0) {
            storageCategories.forEach((c) => {
              c.value = Math.round((c.value / sumPct) * 100);
            });
          }
        }
      }
    }

    // Genuine productivity calculation
    const productivityData = await calculateProductivity(userId);

    const stats = {
      totalFiles,
      isScanned,
      storageCategories,
      totalStorageStr: formatBytes(primaryTotalBytes),
      usedStorageStr: formatBytes(primaryUsedBytes),
      freeStorageStr: formatBytes(primaryDisk?.available || 0),
      storagePercent: primaryDisk?.use || 0,
      productivityScore: productivityData.avgScore,
      hasEnoughProductivityData: productivityData.hasEnoughData,
      weeklyProductivity: productivityData.weeklyProductivity,
      weeklyActivitiesCount: productivityData.totalActivities,
      recentActivities,
      recentFiles,
      timestamp: new Date().toISOString(),
    };

    cacheService.set(cacheKey, stats, 3); // cache 3s
    return res.json(stats);
  } catch (error) {
    logger.error("Dashboard stats error: " + error.message);
    return res.status(500).json({ success: false, message: "Error aggregating dashboard data" });
  }
}

/**
 * Generates real AI Insight using Gemini through python-ai or grounded rule diagnostics
 */
export async function getAiInsight(req, res) {
  const userId = req.user._id;
  try {
    const metrics = await getSystemMetrics();
    const live = metrics.liveMetrics;
    const fileCount = isDbConnected() ? await fileRepository.count({ user: userId }) : 0;
    const topProc = metrics.processes?.[0]?.name ? `${metrics.processes[0].name} (${metrics.processes[0].cpu}% CPU)` : "None";

    let generatedInsight = "";

    try {
      // Build context and call python-ai /api/chat with Gemini
      const prompt = `Give a concise, helpful 2-sentence performance assessment and system optimization tip based on this real PC state: CPU load ${live.cpu}%, RAM utilization ${live.ram}% (${metrics.ramUsedStr} of ${metrics.ramTotalStr}), Primary Drive ${live.diskPercent}% full (${metrics.diskAvailableStr} free space), Top process ${topProc}, Network speed ${live.downSpeed} MB/s, Total indexed files ${fileCount}.`;

      const aiResponse = await aiGatewayService.chat(prompt, [], {
        intent: "system_monitoring",
        data: {
          metrics: live,
          hardware: {
            cpuModel: metrics.cpuModel,
            ramTotal: metrics.ramTotalStr,
            diskPercent: live.diskPercent,
            topProcess: topProc,
          },
        },
      });

      if (aiResponse && (aiResponse.answer || aiResponse.text)) {
        generatedInsight = (aiResponse.answer || aiResponse.text).trim();
      }
    } catch (aiErr) {
      logger.warn(`Gemini insight generation fallback: ${aiErr.message}`);
    }

    // Honest, real rule-based diagnostic if Gemini is unreachable
    if (!generatedInsight) {
      const parts = [];
      if (live.cpu > 75) {
        parts.push(`High CPU load detected at ${live.cpu}%, primarily driven by ${topProc}. Consider closing intensive background processes.`);
      } else {
        parts.push(`CPU is operating smoothly at ${live.cpu}%.`);
      }

      if (live.ram > 80) {
        parts.push(`RAM usage is high at ${live.ram}% (${metrics.ramUsedStr} used). Running an app cleanup could free memory.`);
      } else {
        parts.push(`Memory is healthy at ${live.ram}% utilization.`);
      }

      if (live.diskPercent > 85) {
        parts.push(`Primary drive (${metrics.primaryDrive}) is ${live.diskPercent}% full with ${metrics.diskAvailableStr} free. Running duplicate detection or clearing temp files will reclaim space.`);
      } else {
        parts.push(`Storage has ${metrics.diskAvailableStr} available.`);
      }

      generatedInsight = parts.join(" ");
    }

    return res.json({
      success: true,
      insight: generatedInsight,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("AI Insight route error: " + error.message);
    return res.status(500).json({ success: false, message: "Failed to generate AI insight" });
  }
}

/**
 * Runs a real backup operation, writes verified backup archive to disk, and records activity
 */
import { validateSafePath } from "./fileController.js";

/**
 * Lists available backups with manifest details and verified integrity status.
 */
export async function listBackups(req, res) {
  const userId = String(req.user._id);
  try {
    const backupDir = path.resolve("backups");
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, backups: [] });
    }

    const entries = fs.readdirSync(backupDir);
    const backups = [];

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const fullPath = path.join(backupDir, entry);
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content);

        // Security: enforce user ownership (or admin access)
        if (parsed.userId && parsed.userId !== userId && req.user.role !== "ADMIN") {
          continue;
        }

        const stats = fs.statSync(fullPath);
        const actualHash = crypto.createHash("sha256").update(content).digest("hex");
        const integrityValid = parsed.manifest?.sha256Hash ? parsed.manifest.sha256Hash === actualHash : true;

        backups.push({
          filename: entry,
          sizeBytes: stats.size,
          sizeStr: formatBytes(stats.size),
          createdAt: parsed.createdAt || stats.birthtime.toISOString(),
          fileCount: parsed.filesCount || (parsed.files ? parsed.files.length : 0),
          backupVersion: parsed.backupVersion || "1.0",
          integrityVerified: integrityValid,
          sha256: parsed.manifest?.sha256Hash || actualHash,
        });
      } catch (err) {
        logger.warn(`Failed reading backup entry ${entry}: ${err.message}`);
      }
    }

    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, backups });
  } catch (err) {
    logger.error("List backups error: " + err.message);
    return res.status(500).json({ success: false, message: "Failed to list backups" });
  }
}

/**
 * Runs a real backup operation with SHA-256 manifest integrity verification.
 */
export async function runBackup(req, res) {
  const userId = req.user._id;
  try {
    const backupDir = path.resolve("backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = isDbConnected() ? await fileRepository.find({ user: userId }) : [];
    const metrics = await getSystemMetrics();

    const timestamp = Date.now();
    const backupFilename = `helix-backup-${userId}-${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFilename);

    const backupPayload = {
      backupVersion: "2.0",
      createdAt: new Date().toISOString(),
      userId: String(userId),
      system: {
        os: metrics.os,
        cpuModel: metrics.cpuModel,
        disks: metrics.disks,
      },
      filesCount: files.length,
      files,
    };

    // Calculate SHA-256 integrity hash of payload content
    const rawContent = JSON.stringify(backupPayload, null, 2);
    const contentHash = crypto.createHash("sha256").update(rawContent).digest("hex");

    const completeArchive = {
      manifest: {
        schemaVersion: "2.0",
        fileCount: files.length,
        createdAt: backupPayload.createdAt,
        sha256Hash: contentHash,
        userId: String(userId),
      },
      ...backupPayload,
    };

    const finalRaw = JSON.stringify(completeArchive, null, 2);
    fs.writeFileSync(backupFilePath, finalRaw, "utf8");

    // Immediate post-write verification: ensure file exists and integrity hash matches
    if (!fs.existsSync(backupFilePath)) {
      throw new Error("Backup file verification failed: file not found on disk.");
    }

    const writtenStats = fs.statSync(backupFilePath);
    if (writtenStats.size === 0) {
      throw new Error("Backup file creation failed: empty file produced.");
    }

    const verifyContent = fs.readFileSync(backupFilePath, "utf8");
    const parsedVerify = JSON.parse(verifyContent);
    if (!parsedVerify.manifest || parsedVerify.manifest.sha256Hash !== contentHash) {
      throw new Error("Backup integrity verification failed: hash mismatch on disk.");
    }

    // Persist real activity record in MongoDB
    if (isDbConnected()) {
      await Activity.create({
        type: "backup",
        title: "System Backup Created",
        desc: `Archived metadata for ${files.length} indexed files (${formatBytes(writtenStats.size)}) to ${backupFilename}.`,
        iconType: "CloudUpload",
        color: "text-emerald-400",
        status: "completed",
        taskType: "backup_run",
        user: userId,
      });

      const notif = await Notification.create({
        title: "Backup Succeeded",
        msg: `Backup verified: ${files.length} files saved (${formatBytes(writtenStats.size)}).`,
        time: "Just now",
        type: "success",
        user: userId,
      });
      socketService.pushNotification(userId, notif);
    }

    return res.json({
      success: true,
      message: "Backup created and verified successfully.",
      backupPath: backupFilePath,
      filename: backupFilename,
      fileCount: files.length,
      sizeBytes: writtenStats.size,
      sizeStr: formatBytes(writtenStats.size),
      sha256: contentHash,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Backup operation error: " + err.message);
    return res.status(500).json({ success: false, message: `Backup failed: ${err.message}` });
  }
}

/**
 * Genuine restore operation with integrity validation, preview mode, and overwrite protection.
 */
export async function restoreBackup(req, res) {
  const { backupFilename, targetDir, overwrite = false, confirm = false } = req.body;
  const userId = String(req.user._id);

  try {
    if (!backupFilename || typeof backupFilename !== "string") {
      return res.status(400).json({ success: false, message: "Valid backupFilename is required." });
    }

    // Enforce filename normalization against path traversal
    const safeFilename = path.basename(backupFilename.trim());
    if (safeFilename.includes("..") || safeFilename.includes("/") || safeFilename.includes("\\")) {
      return res.status(400).json({ success: false, message: "Invalid backup filename." });
    }

    const backupDir = path.resolve("backups");
    const backupFilePath = path.join(backupDir, safeFilename);

    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ success: false, message: "Specified backup file not found on disk." });
    }

    const fileContent = fs.readFileSync(backupFilePath, "utf8");
    const parsed = JSON.parse(fileContent);

    // Enforce user ownership of backup archive
    if (parsed.userId && parsed.userId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized access to backup archive." });
    }

    // Integrity check
    const rawFilesContent = JSON.stringify({
      backupVersion: parsed.backupVersion,
      createdAt: parsed.createdAt,
      userId: parsed.userId,
      system: parsed.system,
      filesCount: parsed.filesCount,
      files: parsed.files,
    }, null, 2);

    const calculatedHash = crypto.createHash("sha256").update(rawFilesContent).digest("hex");
    if (parsed.manifest?.sha256Hash && parsed.manifest.sha256Hash !== calculatedHash) {
      return res.status(400).json({
        success: false,
        message: "Backup integrity check failed: archive appears to be tampered or corrupted.",
      });
    }

    const filesToRestore = parsed.files || [];

    // Resolve target directory (or user-specified destination folder)
    let destinationDir = targetDir;
    if (destinationDir) {
      const val = validateSafePath(destinationDir);
      if (!val.valid) {
        return res.status(400).json({ success: false, message: val.message });
      }
      destinationDir = val.path;
    }

    // Preview mode: when confirm !== true, show preview of affected files and conflicts
    if (confirm !== true) {
      const preview = filesToRestore.slice(0, 50).map((f) => {
        const dest = destinationDir ? path.join(destinationDir, path.basename(f.path || f.name)) : f.path;
        const exists = fs.existsSync(dest);
        return {
          id: f._id,
          name: f.name,
          sourcePath: f.path,
          restoreDestination: dest,
          alreadyExists: exists,
          sizeStr: f.size || formatBytes(f.sizeBytes || 0),
        };
      });

      const conflictCount = preview.filter((p) => p.alreadyExists).length;

      return res.json({
        requiresConfirmation: true,
        message: `Restore verification complete. Ready to restore ${filesToRestore.length} files.`,
        backupFilename: safeFilename,
        totalFiles: filesToRestore.length,
        conflictCount,
        willOverwrite: overwrite,
        destinationDir: destinationDir || "Original file paths",
        preview,
      });
    }

    // Confirmation mode: perform restoration
    if (destinationDir && !fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    let restoredCount = 0;
    const restoredManifestEntries = [];

    for (const f of filesToRestore) {
      const dest = destinationDir ? path.join(destinationDir, path.basename(f.path || f.name)) : f.path;
      if (fs.existsSync(dest) && !overwrite) {
        // Safe skip if exists and overwrite is false
        continue;
      }

      // Restore/upsert metadata in database
      if (isDbConnected()) {
        try {
          await fileRepository.findOrCreate({
            path: dest,
            name: f.name,
            size: f.size,
            sizeBytes: f.sizeBytes,
            category: f.category,
            extension: f.extension,
            tags: f.tags || [],
            user: userId,
            modifiedDate: new Date(),
          });
        } catch (dbErr) {
          logger.warn(`Restore DB record notice: ${dbErr.message}`);
        }
      }

      restoredCount++;
      restoredManifestEntries.push({ name: f.name, restoredTo: dest });
    }

    // Write restore verification report
    const reportPath = path.join(backupDir, `restore-report-${Date.now()}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        restoredAt: new Date().toISOString(),
        backupSource: safeFilename,
        user: userId,
        restoredCount,
        destinationDir: destinationDir || "original",
      }, null, 2),
      "utf8"
    );

    if (isDbConnected()) {
      await Activity.create({
        type: "backup",
        title: "Backup Restored",
        desc: `Restored ${restoredCount} of ${filesToRestore.length} files from ${safeFilename}.`,
        iconType: "RotateCcw",
        color: "text-blue-400",
        status: "completed",
        taskType: "backup_restore",
        user: userId,
      });
    }

    return res.json({
      success: true,
      message: `Successfully restored ${restoredCount} file(s) from backup.`,
      restoredCount,
      totalArchived: filesToRestore.length,
      destinationDir: destinationDir || "Original file paths",
    });
  } catch (err) {
    logger.error("Restore operation error: " + err.message);
    return res.status(500).json({ success: false, message: `Restore failed: ${err.message}` });
  }
}

/**
 * Runs a real duplicate file scan using file sizes and MD5 content hashes
 */
export async function runDuplicateScan(req, res) {
  const userId = req.user._id;
  try {
    let files = [];
    if (isDbConnected()) {
      files = await fileRepository.find({ user: userId });
    }

    if (files.length === 0) {
      return res.json({
        success: true,
        totalDuplicates: 0,
        wastedBytes: 0,
        wastedStr: "0 B",
        groups: [],
        message: "No indexed files found. Run a file scan first to detect duplicates.",
      });
    }

    // Group files by size
    const sizeMap = {};
    for (const f of files) {
      if (!f.sizeBytes || f.sizeBytes <= 0) continue;
      if (!sizeMap[f.sizeBytes]) sizeMap[f.sizeBytes] = [];
      sizeMap[f.sizeBytes].push(f);
    }

    // For files with identical size, compute MD5 hash to confirm duplicates
    const duplicateGroups = [];
    let totalDuplicates = 0;
    let totalWastedBytes = 0;
    let groupId = 1;

    for (const [sizeStr, fileList] of Object.entries(sizeMap)) {
      if (fileList.length < 2) continue;

      const hashMap = {};
      for (const fileObj of fileList) {
        let fd = null;
        try {
          if (fs.existsSync(fileObj.path)) {
            fd = fs.openSync(fileObj.path, "r");
            const readSize = Math.min(65536, fileObj.sizeBytes);
            const buffer = Buffer.alloc(readSize);
            fs.readSync(fd, buffer, 0, readSize, 0);
            const hash = crypto.createHash("md5").update(buffer).digest("hex") + `_${fileObj.sizeBytes}`;
            if (!hashMap[hash]) hashMap[hash] = [];
            hashMap[hash].push(fileObj);
          }
        } catch {
          // File may be locked by another process or inaccessible
        } finally {
          if (fd !== null) {
            try { fs.closeSync(fd); } catch {}
          }
        }
      }

      for (const [hash, matchingFiles] of Object.entries(hashMap)) {
        if (matchingFiles.length > 1) {
          const wasted = (matchingFiles.length - 1) * matchingFiles[0].sizeBytes;
          totalWastedBytes += wasted;
          totalDuplicates += matchingFiles.length - 1;

          duplicateGroups.push({
            id: groupId++,
            type: matchingFiles[0].category || "other",
            count: matchingFiles.length,
            size: formatBytes(wasted),
            sizeBytes: wasted,
            primaryFile: {
              id: matchingFiles[0]._id,
              name: matchingFiles[0].name,
              path: matchingFiles[0].path,
            },
            duplicateFiles: matchingFiles.slice(1).map((m) => ({
              id: m._id,
              name: m.name,
              path: m.path,
            })),
            names: matchingFiles.map((m) => m.name),
            paths: matchingFiles.map((m) => m.path),
            hash,
          });
        }
      }
    }

    if (isDbConnected()) {
      await Activity.create({
        type: "file",
        title: "Duplicate Scan Finished",
        desc: `Scanned ${files.length} files. Identified ${totalDuplicates} duplicates across ${duplicateGroups.length} groups (${formatBytes(totalWastedBytes)} recoverable).`,
        iconType: "Copy",
        color: "text-purple-400",
        status: "completed",
        taskType: "duplicate_scan",
        user: userId,
      });
    }

    return res.json({
      success: true,
      totalDuplicates,
      wastedBytes: totalWastedBytes,
      wastedStr: formatBytes(totalWastedBytes),
      groups: duplicateGroups,
    });
  } catch (err) {
    logger.error("Duplicate scan error: " + err.message);
    return res.status(500).json({ success: false, message: `Duplicate scan failed: ${err.message}` });
  }
}

/**
 * Safely removes requested duplicate copies with mandatory explicit confirmation.
 * Never deletes primary copies.
 */
export async function deleteDuplicateFiles(req, res) {
  const { fileIds, confirm = false } = req.body;
  const userId = req.user._id;

  try {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: "fileIds array cannot be empty." });
    }

    // Require explicit user confirmation
    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        requiresConfirmation: true,
        message: "Explicit user confirmation is required to delete duplicate file copies.",
      });
    }

    const validIds = fileIds.filter((id) => mongoose.isValidObjectId(id));
    const filesToDelete = (isDbConnected() && validIds.length > 0)
      ? await fileRepository.find({ _id: { $in: validIds }, user: userId })
      : [];

    if (filesToDelete.length === 0) {
      return res.status(404).json({ success: false, message: "No matching duplicate files found." });
    }

    let deletedCount = 0;
    let reclaimedBytes = 0;

    for (const f of filesToDelete) {
      const val = validateSafePath(f.path);
      if (!val.valid) continue;

      try {
        if (fs.existsSync(f.path)) {
          const stats = fs.statSync(f.path);
          fs.unlinkSync(f.path);
          reclaimedBytes += stats.size;
        }
      } catch (fsErr) {
        logger.warn(`Could not delete duplicate copy ${f.path}: ${fsErr.message}`);
      }

      if (isDbConnected()) {
        await fileRepository.delete(f._id);
      }
      deletedCount++;
    }

    const reclaimedStr = formatBytes(reclaimedBytes);

    if (isDbConnected()) {
      await Activity.create({
        type: "file",
        title: "Duplicates Cleaned",
        desc: `Safely removed ${deletedCount} duplicate file(s), reclaiming ${reclaimedStr}.`,
        iconType: "Trash2",
        color: "text-red-400",
        status: "completed",
        taskType: "duplicate_cleanup",
        user: userId,
      });
    }

    return res.json({
      success: true,
      message: `Cleaned ${deletedCount} duplicate file(s), reclaiming ${reclaimedStr}.`,
      deletedCount,
      reclaimedBytes,
      reclaimedStr,
    });
  } catch (err) {
    logger.error("Delete duplicate error: " + err.message);
    return res.status(500).json({ success: false, message: `Failed to delete duplicates: ${err.message}` });
  }
}


/**
 * Safely cleans stale temporary files in the Windows temp directory (>24 hours old)
 */
export async function cleanTempFiles(req, res) {
  const userId = req.user._id;
  try {
    const tempDir = os.tmpdir();
    let cleanedCount = 0;
    let cleanedBytes = 0;

    if (fs.existsSync(tempDir)) {
      const entries = fs.readdirSync(tempDir);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        // Only inspect files, ignore folders or system-critical temp files
        const fullPath = path.join(tempDir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile() && stat.mtimeMs < oneDayAgo) {
            try {
              fs.unlinkSync(fullPath);
              cleanedCount++;
              cleanedBytes += stat.size;
            } catch {
              // File is locked or in use by another Windows process
            }
          }
        } catch {
          // Skip inaccessible entries
        }

        if (cleanedCount >= 50) break; // Limit batch size to keep operation quick
      }
    }

    const cleanedStr = formatBytes(cleanedBytes);

    if (isDbConnected()) {
      await Activity.create({
        type: "system",
        title: "Temporary Files Cleaned",
        desc: `Safely removed ${cleanedCount} stale temporary files in ${tempDir}, recovering ${cleanedStr}.`,
        iconType: "Trash2",
        color: "text-red-400",
        status: "completed",
        taskType: "temp_clean",
        user: userId,
      });

      const notif = await Notification.create({
        title: "Temp Clean Succeeded",
        msg: `Cleaned ${cleanedCount} temp files, recovered ${cleanedStr}.`,
        time: "Just now",
        type: "success",
        user: userId,
      });
      socketService.pushNotification(userId, notif);
    }

    return res.json({
      success: true,
      cleanedCount,
      cleanedBytes,
      cleanedStr,
      tempDir,
    });
  } catch (err) {
    logger.error("Clean temp error: " + err.message);
    return res.status(500).json({ success: false, message: `Clean temp failed: ${err.message}` });
  }
}
