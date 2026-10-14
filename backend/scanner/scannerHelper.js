export const CATEGORY_MAP = {
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

export function getTagsForFile(ext, name) {
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

export function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getCategory(ext) {
  return CATEGORY_MAP[ext.toLowerCase()] || "other";
}
