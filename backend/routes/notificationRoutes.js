import express from "express";
import { getNotifications, markAsRead, clearAllNotifications } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/:id/read", protect, markAsRead);
router.delete("/", protect, clearAllNotifications);

export default router;
