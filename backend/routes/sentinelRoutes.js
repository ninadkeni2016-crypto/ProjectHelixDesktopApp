import express from "express";
import {
  getSentinelStatus,
  getAlerts,
  acknowledgeAlert,
  dismissAlert,
  getMonitoredFolders,
  addMonitoredFolder,
  removeMonitoredFolder,
  scanFolder,
  scanAllFolders,
} from "../controllers/sentinelController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/status", protect, getSentinelStatus);
router.get("/alerts", protect, getAlerts);
router.post("/alerts/:id/acknowledge", protect, acknowledgeAlert);
router.post("/alerts/:id/dismiss", protect, dismissAlert);
router.get("/folders", protect, getMonitoredFolders);
router.post("/folders", protect, addMonitoredFolder);
router.delete("/folders/:id", protect, removeMonitoredFolder);
router.post("/folders/:id/scan", protect, scanFolder);
router.post("/scan", protect, scanAllFolders);

export default router;
