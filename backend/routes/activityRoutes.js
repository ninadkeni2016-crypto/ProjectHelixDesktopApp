import express from "express";
import { getActivities, createActivity, clearActivities } from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getActivities);
router.post("/", protect, createActivity);
router.delete("/", protect, clearActivities);

export default router;
