import express from "express";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  runAutomation,
} from "../controllers/automationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAutomations);
router.post("/", protect, createAutomation);
router.post("/:id/run", protect, runAutomation);
router.put("/:id", protect, updateAutomation);
router.delete("/:id", protect, deleteAutomation);

export default router;
