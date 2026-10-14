import express from "express";
import {
  getFiles,
  toggleFavorite,
  updateTags,
  renameFile,
  deleteFile,
  triggerScan,
  openFile,
  revealFile,
  organizeFiles,
} from "../controllers/fileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getFiles);
router.post("/scan", protect, triggerScan);
router.post("/open", protect, openFile);
router.post("/reveal", protect, revealFile);
router.post("/organize", protect, organizeFiles);
router.post("/:id/favorite", protect, toggleFavorite);
router.put("/:id/tags", protect, updateTags);
router.put("/:id/rename", protect, renameFile);
router.delete("/:id", protect, deleteFile);

export default router;
