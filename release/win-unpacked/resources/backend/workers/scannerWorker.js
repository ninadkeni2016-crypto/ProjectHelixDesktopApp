import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import path from "path";
import os from "os";

const CATEGORY_MAP = {
  ".pdf": "Documents",
  ".docx": "Documents",
  ".doc": "Documents",
  ".txt": "Documents",
  ".rtf": "Documents",
  ".md": "Documents",
  ".pptx": "Documents",
  ".ppt": "Documents",
  ".xlsx": "Documents",
  ".xls": "Documents",
  ".csv": "Documents",
  ".fig": "Design",
  ".psd": "Design",
  ".ai": "Design",
  ".sketch": "Design",
  ".jpg": "Media",
  ".jpeg": "Media",
  ".png": "Media",
  ".gif": "Media",
  ".webp": "Media",
  ".svg": "Media",
  ".mp4": "Media",
  ".mkv": "Media",
  ".avi": "Media",
  ".mov": "Media",
  ".mp3": "Media",
  ".wav": "Media",
  ".flac": "Media",
};

function getTagsForFile(ext, name) {
  const tags = [];
  const lowerName = name.toLowerCase();

  if (ext === ".pdf" || ext === ".docx" || ext === ".doc") tags.push("docs");
  if (ext === ".pptx" || ext === ".ppt") tags.push("presentation");
  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") tags.push("finance");
  if (ext === ".fig") tags.push("design", "ui");
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") tags.push("photos");
  if (ext === ".mp4" || ext === ".mov") tags.push("video");

  if (lowerName.includes("study") || lowerName.includes("university")) tags.push("study");
  if (lowerName.includes("work") || lowerName.includes("job")) tags.push("work");
  if (lowerName.includes("budget") || lowerName.includes("invoice")) tags.push("finance");
  if (lowerName.includes("meeting") || lowerName.includes("notes")) tags.push("meetings");

  if (tags.length === 0) tags.push("file");
  return tags;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function crawlDirectory(dirPath, userId, maxFiles = 300, depth = 0, maxDepth = 2) {
  const filesList = [];
  if (depth > maxDepth) return filesList;

  try {
    if (!fs.existsSync(dirPath)) return filesList;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
      if (count >= maxFiles) break;

      const fullPath = path.join(dirPath, entry.name);
      
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "AppData" ||
        entry.name === "Library" ||
        entry.name === "Local Settings"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        try {
          const subFiles = crawlDirectory(fullPath, userId, maxFiles - count, depth + 1, maxDepth);
          filesList.push(...subFiles);
          count += subFiles.length;
        } catch (e) {
          // ignore
        }
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name);
          const formattedSize = formatBytes(stats.size);

          filesList.push({
            name: entry.name,
            path: fullPath,
            extension: ext.replace(".", ""),
            size: formattedSize,
            sizeBytes: stats.size,
            createdDate: stats.birthtime,
            modifiedDate: stats.mtime,
            category: CATEGORY_MAP[ext.toLowerCase()] || "other",
            tags: getTagsForFile(ext, entry.name),
            user: userId,
          });
          count++;
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (error) {
    // ignore
  }

  return filesList;
}

const safeUserId = String(workerData?.userId || "");
const homeDir = os.homedir();
const foldersToScan = ["Desktop", "Documents", "Downloads", "Pictures", "Videos"];
let allFiles = [];

for (const folder of foldersToScan) {
  const targetPath = path.join(homeDir, folder);
  try {
    const files = crawlDirectory(targetPath, safeUserId, 200, 0, 2);
    allFiles.push(...files);
  } catch (e) {
    // missing
  }
}

parentPort.postMessage({ files: allFiles });
