import mongoose from "mongoose";
import { configService } from "./configService.js";
import { logger } from "../utils/logger.js";

// Helper to sanitize MongoDB connection string for safe logging
export function sanitizeMongoUri(uri) {
  if (!uri) return "";
  try {
    return uri.replace(/\/\/(.*?)@/, (_, credentials) => {
      const user = credentials.split(":")[0];
      return `//${user}:****@`;
    });
  } catch {
    return "[hidden uri]";
  }
}

let isConnecting = false;
let listenersRegistered = false;
let lastDbError = null;

// Configure mongoose buffering options with reasonable timeout (default bufferCommands: true)
mongoose.set("bufferTimeoutMS", 5000);

export function getLastDbError() {
  return lastDbError;
}

function diagnoseMongoError(error) {
  const msg = error?.message || String(error || "");
  if (
    msg.includes("SSL") ||
    msg.includes("tlsv1 alert internal error") ||
    msg.includes("alert number 80") ||
    msg.includes("whitelist")
  ) {
    return {
      type: "IP_WHITELIST_ERROR",
      diagnostic:
        "TLS/SSL handshake was rejected by the MongoDB Atlas cluster. Your current IP address is not whitelisted in MongoDB Atlas Network Access. Whitelist your current IP address at https://cloud.mongodb.com (Security -> Network Access -> Add IP Address).",
      raw: msg,
    };
  }
  if (msg.includes("ENOTFOUND") || msg.includes("querySrv")) {
    return {
      type: "DNS_RESOLUTION_ERROR",
      diagnostic:
        "DNS SRV lookup failed for the MongoDB Atlas cluster. Please check your internet connection and verify the cluster host in MONGO_URI.",
      raw: msg,
    };
  }
  if (msg.includes("AuthenticationFailed") || msg.includes("bad auth")) {
    return {
      type: "AUTH_ERROR",
      diagnostic:
        "MongoDB authentication failed. Please verify the username and password in MONGO_URI in your backend/.env file.",
      raw: msg,
    };
  }
  return {
    type: "CONNECTION_ERROR",
    diagnostic: msg,
    raw: msg,
  };
}

function registerConnectionEvents() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    lastDbError = null;
    logger.info(`MongoDB connection established to host: ${mongoose.connection.host}`);
  });

  mongoose.connection.on("error", (err) => {
    lastDbError = err;
    const { type, diagnostic } = diagnoseMongoError(err);
    if (type === "IP_WHITELIST_ERROR") {
      logger.error(`MongoDB connection error (Atlas IP Whitelist): ${diagnostic}`);
    } else {
      logger.error(`MongoDB connection runtime error: ${diagnostic}`);
    }
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection disconnected. Waiting for reconnection...");
  });

  mongoose.connection.on("reconnected", () => {
    lastDbError = null;
    logger.info("MongoDB connection re-established.");
  });

  // Handle graceful process termination
  const gracefulShutdown = async (signal) => {
    try {
      if (mongoose.connection.readyState !== 0) {
        logger.info(`Received ${signal}. Closing MongoDB connection cleanly...`);
        await mongoose.connection.close();
        logger.info("MongoDB connection closed.");
      }
    } catch (err) {
      logger.error(`Error closing MongoDB connection on ${signal}: ${err.message}`);
    }
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

export async function connectDB() {
  const readyState = mongoose.connection.readyState;
  // 1: connected, 2: connecting
  if (readyState === 1) {
    lastDbError = null;
    return mongoose.connection;
  }
  if (readyState === 2 || isConnecting) {
    logger.info("MongoDB connection already in progress. Waiting...");
    return;
  }

  registerConnectionEvents();

  const uri = configService.get("MONGO_URI");
  const dbName = configService.get("DB_NAME") || "helix";
  const sanitizedUri = sanitizeMongoUri(uri);

  isConnecting = true;
  try {
    lastDbError = null;
    logger.info(`Attempting MongoDB connection to: ${sanitizedUri}`);

    const conn = await mongoose.connect(uri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      autoIndex: true, // Build indexes defined in schemas
    });

    logger.info(`MongoDB Atlas Connected: ${conn.connection.host} [db: ${conn.connection.name}]`);
    isConnecting = false;
    lastDbError = null;
    return conn;
  } catch (error) {
    isConnecting = false;
    lastDbError = error;
    const { diagnostic } = diagnoseMongoError(error);
    logger.error(`Database connection warning: ${diagnostic} Continuing in standalone/offline mode.`);
    return null;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export function getDbStatus() {
  const state = mongoose.connection.readyState;
  switch (state) {
    case 0:
      return "Disconnected";
    case 1:
      return "Connected";
    case 2:
      return "Connecting";
    case 3:
      return "Disconnecting";
    default:
      return "Unknown";
  }
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
