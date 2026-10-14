import express from "express";
import {
  getLiveMetrics,
  getDashboardMetrics,
  getTelemetryHistoryController,
  getSystemInfoController,
} from "../controllers/monitorController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getLiveMetrics);
router.get("/current", protect, getLiveMetrics);
router.get("/history", protect, getTelemetryHistoryController);
router.get("/info", protect, getSystemInfoController);
router.get("/dashboard", protect, authorizeRoles("DEVELOPER", "ADMIN"), getDashboardMetrics);

export default router;
