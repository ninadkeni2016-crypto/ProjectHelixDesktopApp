import * as authService from "../services/AuthService.js";
import { isDbConnected, getLastDbError } from "../config/db.js";
import { initFolderWatcher } from "../services/folderWatcher.js";
import { startNotificationEngine } from "../services/notificationEngine.js";
import { scanFolders } from "../services/fileScanner.js";
import { sentinelService } from "../services/sentinelService.js";
import Activity from "../models/Activity.js";
import { logger } from "../utils/logger.js";

export const register = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    if (!isDbConnected()) {
      const lastErr = getLastDbError();
      const reason = lastErr ? lastErr.message : "Database connection not ready";
      return res.status(503).json({
        success: false,
        message: `Database service is currently unavailable (${reason}). Please verify MongoDB connection or Atlas IP whitelist.`,
      });
    }

    const data = await authService.registerUser(name, email, password);

    // Optional background services setup for user
    try {
      const strId = String(data.user._id);
      initFolderWatcher(strId);
      startNotificationEngine(strId);
      scanFolders(strId).catch((err) =>
        logger.warn("Initial folder scan notice: " + err.message)
      );
    } catch (bgErr) {
      logger.warn(`Desktop background service init notice: ${bgErr.message}`);
    }

    // Log user creation activity
    try {
      await Activity.create({
        type: "security",
        label: "Account registered successfully",
        iconType: "User",
        color: "text-blue-400",
        status: "completed",
        taskType: "auth_register",
        user: data.user._id,
      });
    } catch (actErr) {
      logger.warn(`Activity log notice: ${actErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
  } catch (err) {
    if (err.name === "MongoServerSelectionError" || err.name === "MongooseError") {
      return res.status(503).json({
        success: false,
        message: `Database error during registration: ${err.message}`,
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!isDbConnected()) {
      const lastErr = getLastDbError();
      const reason = lastErr ? lastErr.message : "Database connection not ready";
      return res.status(503).json({
        success: false,
        message: `Database service is currently unavailable (${reason}). Please verify MongoDB connection or Atlas IP whitelist.`,
      });
    }

    const data = await authService.loginUser(email, password);

    try {
      const strId = String(data.user._id);
      initFolderWatcher(strId);
      startNotificationEngine(strId);
      scanFolders(strId).catch((err) =>
        logger.warn("Folder scan notice: " + err.message)
      );
    } catch (bgErr) {
      logger.warn(`Desktop background service init notice: ${bgErr.message}`);
    }

    // Record login activity
    try {
      await Activity.create({
        type: "security",
        label: "Session authenticated",
        iconType: "Lock",
        color: "text-emerald-400",
        status: "completed",
        taskType: "auth_login",
        user: data.user._id,
      });
    } catch (actErr) {
      logger.warn(`Activity log notice: ${actErr.message}`);
    }

    res.json({
      success: true,
      message: "User logged in successfully",
      data: {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
  } catch (err) {
    if (err.message === "Invalid email or password") {
      sentinelService.recordAuthFailure(req.ip || req.socket.remoteAddress, email).catch(() => {});
      return res.status(401).json({ success: false, message: err.message });
    }
    if (err.name === "MongoServerSelectionError" || err.name === "MongooseError" || err.message.includes("buffering timed out")) {
      return res.status(503).json({
        success: false,
        message: `Database connection error: ${err.message}`,
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await authService.logoutUser(userId);
    }
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const refresh = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token is required" });
  }
  try {
    const tokens = await authService.refreshUserToken(refreshToken);
    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: tokens,
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res, next) => {
  try {
    // Isolated guest principal
    if (req.user?.role === "GUEST" || req.user?.isGuest) {
      return res.json({
        success: true,
        data: {
          _id: req.user._id,
          name: req.user.name || "Guest User",
          email: req.user.email || `guest_${req.user._id}@helix.local`,
          role: "GUEST",
          isGuest: true,
        },
      });
    }

    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: {
          _id: req.user._id,
          name: req.user.name || "Helix User",
          email: req.user.email || "user@helix.local",
          role: req.user.role || "USER",
          isGuest: false,
        },
      });
    }

    const user = await authService.getProfile(req.user._id);
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isGuest: false,
      },
    });
  } catch (err) {
    if (req.user) {
      return res.json({
        success: true,
        data: {
          _id: req.user._id,
          name: req.user.name || "Helix User",
          email: req.user.email || "user@helix.local",
          role: req.user.role || "USER",
          isGuest: false,
        },
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserProfile = getMe; // Fallback alias

export const guestLogin = async (req, res) => {
  try {
    const crypto = await import("crypto");
    // Generate unique, unguessable isolated guest identifier
    const guestId = "guest_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const guestName = "Helix Guest";

    const tokenObj = authService.generateGuestToken(guestId, guestName);

    res.json({
      success: true,
      message: "Guest session initialized with isolated storage",
      data: {
        _id: guestId,
        name: guestName,
        email: `${guestId}@helix.local`,
        role: "GUEST",
        isGuest: true,
        accessToken: tokenObj.accessToken,
        refreshToken: null,
      },
    });
  } catch (err) {
    logger.error("Guest login error: " + err.message);
    res.status(500).json({ success: false, message: "Failed to initialize guest session" });
  }
};

