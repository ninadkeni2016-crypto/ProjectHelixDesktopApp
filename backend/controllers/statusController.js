import mongoose from "mongoose";
import { getDbStatus, getLastDbError } from "../config/db.js";

const formatUptime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};

export const getHealth = (req, res) => {
  const dbStatus = getDbStatus();
  const dbError = getLastDbError();
  
  res.json({
    success: true,
    status: "OK",
    database: dbStatus,
    databaseError: dbError ? dbError.message : null,
    uptime: formatUptime(process.uptime()),
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
};

export const getStatus = (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    success: true,
    status: "OK",
    uptime: formatUptime(process.uptime()),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    },
    nodeVersion: process.version,
    platform: process.platform,
  });
};

export const getVersion = (req, res) => {
  res.json({
    success: true,
    version: "1.0.0",
    appName: "Project Helix Desktop Companion"
  });
};
