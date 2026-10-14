import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Attempt to load .env from backend directory first, then current working directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const INSECURE_DEFAULT_SECRET = "supersecrethelixkey12345!";
const INSECURE_DEFAULT_REFRESH = "supersecretrefreshhelixkey12345!";

class ConfigService {
  constructor() {
    let jwtSecret = process.env.JWT_SECRET;
    let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    // Reject predictable default secret and generate ephemeral secure secret if absent or insecure
    if (!jwtSecret || jwtSecret === INSECURE_DEFAULT_SECRET) {
      jwtSecret = crypto.randomBytes(32).toString("hex");
    }
    if (!jwtRefreshSecret || jwtRefreshSecret === INSECURE_DEFAULT_REFRESH) {
      jwtRefreshSecret = crypto.randomBytes(32).toString("hex");
    }

    this.configs = {
      PORT: parseInt(process.env.PORT || "5000", 10),
      MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/helix",
      DB_NAME: process.env.DB_NAME || "helix",
      JWT_SECRET: jwtSecret,
      JWT_REFRESH_SECRET: jwtRefreshSecret,
      NODE_ENV: process.env.NODE_ENV || "development",
      SCAN_INTERVAL_MINS: parseInt(process.env.SCAN_INTERVAL_MINS || "10", 10),
      CPU_ALERT_THRESHOLD: parseInt(process.env.CPU_ALERT_THRESHOLD || "85", 10),
      RAM_ALERT_THRESHOLD: parseInt(process.env.RAM_ALERT_THRESHOLD || "90", 10),
      DISK_ALERT_THRESHOLD: parseInt(process.env.DISK_ALERT_THRESHOLD || "10", 10),
      AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      PYTHON_AI_URL: process.env.PYTHON_AI_URL || "http://127.0.0.1:8000",
    };
  }

  get(key) {
    if (!(key in this.configs)) {
      return process.env[key];
    }
    return this.configs[key];
  }

  isDev() {
    return this.configs.NODE_ENV === "development";
  }

  isProd() {
    return this.configs.NODE_ENV === "production";
  }

  validateStartup() {
    const errors = [];
    if (!this.configs.MONGO_URI) {
      errors.push("Missing MONGO_URI in environment configuration.");
    }
    if (!this.configs.JWT_SECRET || this.configs.JWT_SECRET.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters in length.");
    }
    if (errors.length > 0) {
      throw new Error(`Configuration Validation Error: ${errors.join("; ")}`);
    }
    return true;
  }
}

export const configService = new ConfigService();

