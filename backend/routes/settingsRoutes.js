import express from "express";
import { getSettings, updateSettings, updateProfileName } from "../controllers/settingsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.put("/", protect, updateSettings);
router.put("/profile", protect, updateProfileName);

export default router;
