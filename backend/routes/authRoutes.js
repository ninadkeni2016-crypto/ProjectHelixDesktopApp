import express from "express";
import { register, login, logout, refresh, getMe, guestLogin } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { registerRules, loginRules } from "../validators/authValidator.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/guest", guestLogin);
router.post("/logout", protect, logout);
router.post("/refresh", refresh);
router.get("/me", protect, getMe);

export default router;
