import { fileRepository } from "../repositories/FileRepository.js";
import { analyticsRepository } from "../repositories/AnalyticsRepository.js";
import { cacheService } from "../services/CacheService.js";
import { logger } from "../utils/logger.js";

export async function getAnalyticsData(req, res) {
  const userId = req.user._id;
  const cacheKey = `analytics_stats_${userId}`;

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const fileStats = await fileRepository.model.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalBytes: { $sum: "$sizeBytes" } } },
    ]);

    const formatSize = (bytes) => {
      if (bytes > 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
      }
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const categoryLabels = {
      photos: "Images",
      videos: "Videos",
      audio: "Audio",
      documents: "Documents",
      finance: "Finance",
      study: "Study",
      design: "Design"
    };

    const totalBytes = fileStats.reduce((acc, curr) => acc + curr.totalBytes, 0);

    const breakdown = fileStats.map((item) => {
      const label = categoryLabels[item._id] || "Other";
      const pct = totalBytes > 0 ? Math.round((item.totalBytes / totalBytes) * 100) : 0;
      return {
        type: label,
        count: item.count,
        size: formatSize(item.totalBytes),
        pct,
        color:
          label === "Documents"
            ? "#3b82f6"
            : label === "Images"
            ? "#7c3aed"
            : label === "Videos"
            ? "#06b6d4"
            : label === "Audio"
            ? "#10b981"
            : "#6b7ea8",
      };
    });

    if (breakdown.length === 0) {
      breakdown.push(
        { type: "Documents", count: 0, size: "0 MB", pct: 0, color: "#3b82f6" },
        { type: "Images", count: 0, size: "0 MB", pct: 0, color: "#7c3aed" },
        { type: "Videos", count: 0, size: "0 MB", pct: 0, color: "#06b6d4" },
        { type: "Audio", count: 0, size: "0 MB", pct: 0, color: "#10b981" }
      );
    }

    const productivityTrends = await analyticsRepository.model.find({ user: userId }).sort({ createdAt: 1 });
    const totalFiles = await fileRepository.count({ user: userId });
    const avgScore = productivityTrends.length > 0 
      ? Math.round(productivityTrends.reduce((acc, curr) => acc + curr.score, 0) / productivityTrends.length)
      : 78;

    const data = {
      metrics: {
        filesCreated: { value: String(totalFiles), change: "+12%", up: true },
        activeHours: { value: "142h", change: "+8%", up: true },
        storageUsed: { value: formatSize(totalBytes), change: `+${formatSize(totalBytes * 0.01)}`, up: false },
        avgProductivity: { value: `${avgScore}%`, change: "+6%", up: true }
      },
      productivityWeekly: productivityTrends.map(t => ({
        day: t.date,
        score: t.score,
        files: t.filesCreatedCount,
      })),
      storageBreakdown: breakdown,
    };

    cacheService.set(cacheKey, data, 5); // cache for 5 seconds
    return res.json(data);
  } catch (error) {
    logger.error("Analytics fetch error: " + error.message);
    return res.status(500).json({ success: false, message: "Server error fetching analytics data" });
  }
}
