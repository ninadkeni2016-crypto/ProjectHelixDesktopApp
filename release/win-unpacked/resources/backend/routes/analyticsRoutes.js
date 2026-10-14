import express from "express";
import { getAnalyticsData } from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAnalyticsData);

export default router;
