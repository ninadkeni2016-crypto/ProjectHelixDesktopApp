import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = "logs";

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, label }) => {
    return `[${timestamp}] [${label || "App"}] [${level.toUpperCase()}]: ${message}`;
  })
);

// Helper to create rotating logs config
const createRotateTransport = (filename, label) => {
  return new DailyRotateFile({
    filename: path.join(logDir, `${filename}-%DATE%.log`),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: winston.format.combine(
      winston.format.label({ label }),
      customFormat
    )
  });
};

// Main application logger
export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.label({ label: "App" }),
        customFormat
      )
    }),
    createRotateTransport("application", "App")
  ]
});

// Category loggers
export const authLogger = winston.createLogger({
  transports: [createRotateTransport("auth", "Auth")]
});

export const fileScannerLogger = winston.createLogger({
  transports: [createRotateTransport("filescanner", "FileScanner")]
});

export const automationLogger = winston.createLogger({
  transports: [createRotateTransport("automation", "Automation")]
});

export const aiLogger = winston.createLogger({
  transports: [createRotateTransport("ai", "AI")]
});

export const monitorLogger = winston.createLogger({
  transports: [createRotateTransport("systemmonitor", "SystemMonitor")]
});
