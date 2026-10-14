import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { configService } from "../config/configService.js";

/**
 * Protect middleware: Verifies JWT token, loads user from database,
 * and sets authenticated user on req.user.
 * Rejects predictable development tokens and insecure fallbacks.
 */
export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required: no token provided.",
    });
  }

  const jwtSecret = configService.get("JWT_SECRET");

  try {
    const decoded = jwt.verify(token, jwtSecret);

    // Guest token handling: restricted role, short-lived session
    if (decoded.role === "GUEST" || decoded.isGuest) {
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name || "Guest User",
        email: decoded.email || `guest_${decoded.id}@helix.local`,
        role: "GUEST",
        isGuest: true,
      };
      return next();
    }

    // Standard registered user verification
    try {
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User session revoked: account not found.",
        });
      }
      req.user = user;
      return next();
    } catch (dbError) {
      return res.status(401).json({
        success: false,
        message: "Failed to verify user credentials.",
      });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        expired: true,
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid or tampered authentication token.",
    });
  }
}

/**
 * Authorize role-based access: ensures req.user has one of the allowed roles.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permissions to perform this action.",
      });
    }
    next();
  };
};

/**
 * Ensures a guest user cannot access sensitive administrative or cross-user operations.
 */
export const forbidGuests = (req, res, next) => {
  if (req.user?.role === "GUEST" || req.user?.isGuest) {
    return res.status(403).json({
      success: false,
      message: "Action restricted: Full registered account required for this feature.",
    });
  }
  next();
};

