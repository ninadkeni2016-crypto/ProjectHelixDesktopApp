import express from "express";
import {
  getDashboardStats,
  getAiInsight,
  runBackup,
  listBackups,
  restoreBackup,
  runDuplicateScan,
  deleteDuplicateFiles,
  cleanTempFiles,
} from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDashboardStats);
router.get("/stats", protect, getDashboardStats);
router.get("/ai-insight", protect, getAiInsight);
router.post("/ai-insight", protect, getAiInsight);
router.get("/backup/list", protect, listBackups);
router.post("/backup", protect, runBackup);
router.post("/backup/restore", protect, restoreBackup);
router.get("/duplicates", protect, runDuplicateScan);
router.post("/duplicates", protect, runDuplicateScan);
router.post("/duplicates/delete", protect, deleteDuplicateFiles);
router.post("/clean-temp", protect, cleanTempFiles);

export default router;

