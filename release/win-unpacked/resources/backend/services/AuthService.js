import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/UserRepository.js";
import { helixEvents } from "../events/eventEmitter.js";
import { configService } from "../config/configService.js";
import { authLogger } from "../utils/logger.js";
import User from "../models/User.js";

const getJwtSecret = () => configService.get("JWT_SECRET");
const getJwtRefreshSecret = () => configService.get("JWT_REFRESH_SECRET");

export const generateTokens = (user) => {
  const payload = { id: user._id.toString(), role: user.role, isGuest: false };
  const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
  const refreshToken = jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: "30d" });
  return { accessToken, refreshToken };
};

export const generateGuestToken = (guestId, guestName = "Guest User") => {
  const payload = { id: guestId, name: guestName, role: "GUEST", isGuest: true };
  const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });
  return { accessToken };
};


export const registerUser = async (name, email, password) => {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").toLowerCase().trim();

  if (!cleanName) {
    throw new Error("Full name is required");
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid email address is required");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    throw new Error("A user already exists with this email address");
  }

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password,
    lastLogin: new Date(),
  });

  authLogger.info(`User registered successfully: ${cleanEmail}`);

  try {
    helixEvents.emit("UserRegistered", user);
  } catch (evErr) {
    authLogger.warn(`Event emission error: ${evErr.message}`);
  }

  const tokens = generateTokens(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return { user, ...tokens };
};

export const loginUser = async (email, password) => {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail || !password) {
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw new Error("Invalid email or password");
  }

  authLogger.info(`User logged in: ${cleanEmail}`);

  user.lastLogin = new Date();
  const tokens = generateTokens(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return { user, ...tokens };
};

export const logoutUser = async (userId) => {
  try {
    if (userId) {
      await User.findByIdAndUpdate(userId, { refreshToken: null });
    }
    return true;
  } catch (err) {
    authLogger.error(`Logout user error: ${err.message}`);
    return false;
  }
};

export const refreshUserToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    return tokens;
  } catch (err) {
    authLogger.error(`Token refresh failed: ${err.message}`);
    throw new Error("Authentication refresh token invalid or expired");
  }
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
