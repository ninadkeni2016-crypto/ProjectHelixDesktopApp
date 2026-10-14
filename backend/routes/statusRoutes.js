import express from "express";
import { getHealth, getStatus, getVersion } from "../controllers/statusController.js";

const router = express.Router();

router.get("/health", getHealth);
router.get("/status", getStatus);
router.get("/version", getVersion);

export default router;
