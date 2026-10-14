import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { fileRepository } from "../repositories/FileRepository.js";
import { activityRepository } from "../repositories/ActivityRepository.js";
import { searchHistoryRepository } from "../repositories/SearchHistoryRepository.js";
import { scanFolders } from "../services/fileScanner.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { logger } from "../utils/logger.js";

/**
 * Validates that a file path is safe, absolute, and not pointing to critical system directories.
 */
export function validateSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    return { valid: false, message: "Invalid path provided: must be a non-empty string." };
  }

  // Detect directory traversal attempts explicitly before normalization
  if (targetPath.includes("..")) {
    return { valid: false, message: "Path traversal '..' is strictly forbidden." };
  }

  const cleanPath = path.normalize(targetPath.trim());

  if (!path.isAbsolute(cleanPath)) {
    return { valid: false, message: "Path must be an absolute path." };
  }

  if (cleanPath.includes("\0")) {
    return { valid: false, message: "Path contains illegal null characters." };
  }

  // Prevent accessing critical system directories
  const forbiddenDirs = [
    "C:\\Windows",
    "C:\\Windows\\System32",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "/bin", "/sbin", "/etc", "/usr/bin", "/sys", "/proc"
  ].map(d => path.normalize(d).toLowerCase());

  const lowerPath = cleanPath.toLowerCase();
  for (const forbidden of forbiddenDirs) {
    if (lowerPath === forbidden || lowerPath.startsWith(forbidden + path.sep)) {
      return { valid: false, message: "Access to system directory is restricted for security." };
    }
  }

  return { valid: true, path: cleanPath };
}

export async function getFiles(req, res) {
  const { category, search, favorite, recent, page = 1, limit = 20, sort } = req.query;
  const criteria = { category, search, favorite, extension: req.query.extension, folder: req.query.folder, sort };

  try {
    if (recent === "true") {
      const files = await fileRepository.findRecentlyModified(req.user._id, 1440); // 24h
      return res.json(files);
    }

    const result = await fileRepository.searchFiles(req.user._id, criteria, { page, limit });

    if (search && search.trim() && req.user?._id) {
      searchHistoryRepository
        .recordSearch(req.user._id, search, "file", result.items ? result.items.length : 0)
        .catch((e) => logger.warn("Search history record warning: " + e.message));
    }

    return res.json(result.items);
  } catch (error) {
    logger.error("Error fetching files list: " + error.message);
    return res.status(500).json({ success: false, message: "Server error fetching files" });
  }
}

export async function toggleFavorite(req, res) {
  try {
    const file = await fileRepository.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    file.favorite = !file.favorite;
    await file.save();

    await auditLogRepository.logEvent(req.user._id, "TOGGLE_FAVORITE", { fileId: file._id, favorite: file.favorite });
    return res.json(file);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ success: false, message: "Server error toggling favorite" });
  }
}

export async function updateTags(req, res) {
  const { tags } = req.body;
  try {
    const file = await fileRepository.update(req.params.id, { tags }, { new: true });
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    return res.json(file);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ success: false, message: "Server error updating tags" });
  }
}

export async function renameFile(req, res) {
  const { newName, confirm = true } = req.body;
  try {
    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return res.status(400).json({ success: false, message: "A valid new file name is required." });
    }

    // Sanitize: do not allow path separators or directory traversal in filename
    const cleanName = path.basename(newName.trim());
    if (cleanName.includes("..") || cleanName.includes("/") || cleanName.includes("\\") || cleanName.includes(":")) {
      return res.status(400).json({ success: false, message: "Invalid characters in file name." });
    }

    const file = await fileRepository.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (confirm === false) {
      return res.json({
        requiresConfirmation: true,
        message: `Rename '${file.name}' to '${cleanName}'?`,
        currentName: file.name,
        proposedName: cleanName,
      });
    }

    const oldPath = file.path;
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, cleanName);

    const val = validateSafePath(newPath);
    if (!val.valid) {
      return res.status(400).json({ success: false, message: val.message });
    }

    try {
      if (fsSync.existsSync(oldPath)) {
        await fs.rename(oldPath, newPath);
      }
    } catch (fsErr) {
      logger.warn(`Physical rename warning: ${fsErr.message}`);
    }

    file.name = cleanName;
    file.path = newPath;
    const dotIdx = cleanName.lastIndexOf(".");
    if (dotIdx !== -1) {
      file.extension = cleanName.substring(dotIdx + 1);
    }
    await file.save();

    await activityRepository.create({
      title: "File Renamed",
      desc: `Renamed to ${cleanName}`,
      type: "file",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "RENAME_FILE", { fileId: file._id, oldName: file.name, newName: cleanName });
    return res.json(file);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ success: false, message: "Server error renaming file" });
  }
}

export async function deleteFile(req, res) {
  const { confirm = false } = req.body;
  try {
    const file = await fileRepository.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (confirm !== true) {
      return res.json({
        requiresConfirmation: true,
        message: `Permanently delete '${file.name}' from disk?`,
        fileId: file._id,
        path: file.path,
      });
    }

    const val = validateSafePath(file.path);
    if (!val.valid) {
      return res.status(400).json({ success: false, message: val.message });
    }

    try {
      if (fsSync.existsSync(file.path)) {
        await fs.unlink(file.path);
      }
    } catch (fsErr) {
      logger.warn(`Physical deletion warning: ${fsErr.message}`);
    }

    await fileRepository.delete(file._id);

    await activityRepository.create({
      title: "File Deleted",
      desc: `Deleted: ${file.name}`,
      type: "file",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "DELETE_FILE", { fileId: file._id, name: file.name });
    return res.json({ message: "File deleted successfully", fileId: file._id });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ success: false, message: "Server error deleting file" });
  }
}

/**
 * Open a file with its registered system default application.
 * POST /api/v1/files/open
 */
export async function openFile(req, res) {
  const { fileId, filePath } = req.body;
  try {
    let targetPath = filePath;

    if (fileId) {
      const file = await fileRepository.findOne({ _id: fileId, user: req.user._id });
      if (!file) {
        return res.status(404).json({ success: false, message: "File not found." });
      }
      targetPath = file.path;
    }

    const validation = validateSafePath(targetPath);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const verifiedPath = validation.path;
    if (!fsSync.existsSync(verifiedPath)) {
      return res.status(404).json({ success: false, message: "File does not exist on disk." });
    }

    // Launch with default OS application safely without shell execution
    if (process.platform === "win32") {
      spawn("explorer.exe", [verifiedPath], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [verifiedPath], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [verifiedPath], { detached: true, stdio: "ignore" }).unref();
    }

    await activityRepository.create({
      title: "File Opened",
      desc: `Opened ${path.basename(verifiedPath)}`,
      type: "file",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "OPEN_FILE", { path: verifiedPath });
    return res.json({ success: true, message: "File launched in default application", path: verifiedPath });
  } catch (error) {
    logger.error("Error opening file: " + error.message);
    return res.status(500).json({ success: false, message: "Server error opening file: " + error.message });
  }
}

/**
 * Open the containing folder in OS file manager and reveal the selected file.
 * POST /api/v1/files/reveal
 */
export async function revealFile(req, res) {
  const { fileId, filePath } = req.body;
  try {
    let targetPath = filePath;

    if (fileId) {
      const file = await fileRepository.findOne({ _id: fileId, user: req.user._id });
      if (!file) {
        return res.status(404).json({ success: false, message: "File not found." });
      }
      targetPath = file.path;
    }

    const validation = validateSafePath(targetPath);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const verifiedPath = validation.path;
    if (!fsSync.existsSync(verifiedPath)) {
      return res.status(404).json({ success: false, message: "File or directory does not exist on disk." });
    }

    if (process.platform === "win32") {
      spawn("explorer.exe", ["/select,", verifiedPath], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", ["-R", verifiedPath], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [path.dirname(verifiedPath)], { detached: true, stdio: "ignore" }).unref();
    }

    await activityRepository.create({
      title: "Folder Revealed",
      desc: `Revealed ${path.basename(verifiedPath)} in explorer`,
      type: "file",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "REVEAL_FILE", { path: verifiedPath });
    return res.json({ success: true, message: "Containing folder opened", path: verifiedPath });
  } catch (error) {
    logger.error("Error revealing file in folder: " + error.message);
    return res.status(500).json({ success: false, message: "Server error revealing file: " + error.message });
  }
}

/**
 * Safely organize selected files into a destination folder.
 * POST /api/v1/files/organize
 */
export async function organizeFiles(req, res) {
  const { fileIds, targetFolder, confirm = false } = req.body;
  try {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: "fileIds array cannot be empty." });
    }

    const folderVal = validateSafePath(targetFolder);
    if (!folderVal.valid) {
      return res.status(400).json({ success: false, message: folderVal.message });
    }
    const cleanTargetFolder = folderVal.path;

    // Retrieve requested files belonging to the authenticated user
    const filesToMove = await fileRepository.find({
      _id: { $in: fileIds },
      user: req.user._id,
    });

    if (!filesToMove || filesToMove.length === 0) {
      return res.status(404).json({ success: false, message: "No matching user files found to move." });
    }

    // Require explicit user confirmation before moving files
    if (confirm !== true) {
      const preview = filesToMove.map(f => ({
        id: f._id,
        name: f.name,
        currentPath: f.path,
        destinationPath: path.join(cleanTargetFolder, f.name),
      }));

      return res.json({
        requiresConfirmation: true,
        message: `Moving ${filesToMove.length} file(s) into '${path.basename(cleanTargetFolder)}' requires your confirmation.`,
        targetFolder: cleanTargetFolder,
        preview,
      });
    }

    // Ensure target folder exists
    await fs.mkdir(cleanTargetFolder, { recursive: true });

    const movedFiles = [];
    for (const file of filesToMove) {
      const srcPath = file.path;
      if (!fsSync.existsSync(srcPath)) {
        logger.warn(`File on disk not found, skipping move: ${srcPath}`);
        continue;
      }

      // Handle duplicate filenames in destination
      let destName = file.name;
      let destPath = path.join(cleanTargetFolder, destName);
      let counter = 1;
      const ext = path.extname(file.name);
      const base = path.basename(file.name, ext);

      while (fsSync.existsSync(destPath) && path.resolve(destPath) !== path.resolve(srcPath)) {
        destName = `${base} (${counter})${ext}`;
        destPath = path.join(cleanTargetFolder, destName);
        counter++;
      }

      if (path.resolve(destPath) === path.resolve(srcPath)) {
        continue; // Already in destination
      }

      try {
        await fs.rename(srcPath, destPath);
      } catch (err) {
        // Fallback for cross-device moves
        await fs.copyFile(srcPath, destPath);
        await fs.unlink(srcPath);
      }

      file.name = destName;
      file.path = destPath;
      file.folder = cleanTargetFolder;
      file.modifiedDate = new Date();
      await file.save();

      movedFiles.push({ id: file._id, name: destName, path: destPath });
    }

    await activityRepository.create({
      title: "Files Organized",
      desc: `Organized ${movedFiles.length} file(s) into ${path.basename(cleanTargetFolder)}`,
      type: "file",
      user: req.user._id,
    });

    await auditLogRepository.logEvent(req.user._id, "ORGANIZE_FILES", {
      targetFolder: cleanTargetFolder,
      count: movedFiles.length,
      movedFiles,
    });

    return res.json({
      success: true,
      message: `Successfully organized ${movedFiles.length} file(s).`,
      movedCount: movedFiles.length,
      targetFolder: cleanTargetFolder,
      movedFiles,
    });
  } catch (error) {
    logger.error("Error organizing files: " + error.message);
    return res.status(500).json({ success: false, message: "Server error organizing files: " + error.message });
  }
}

export async function triggerScan(req, res) {
  try {
    scanFolders(req.user._id)
      .then(result => logger.info("Manual scan result: " + JSON.stringify(result)))
      .catch(err => logger.error("Manual scan error: " + err.message));

    return res.json({ message: "Folder scan initiated in background" });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ success: false, message: "Server error initiating scan" });
  }
}
