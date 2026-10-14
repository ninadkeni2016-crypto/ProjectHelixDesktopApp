import mongoose from "mongoose";

const automationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String, // lucide icon name, e.g. FolderPlus, CloudUpload, Copy, Trash2, Zap, Image, RefreshCw
      required: true,
      default: "Zap",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    actionType: {
      type: String,
      enum: ["scan_directory", "cleanup_temp", "organize_downloads", "backup_index", "duplicate_check"],
      required: true,
      default: "scan_directory",
    },
    schedule: {
      type: String,
      default: "Hourly", // "Hourly", "Every 6 Hours", "Daily", "Weekly", "Manual"
    },
    actionConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastStatus: {
      type: String,
      enum: ["idle", "running", "success", "failed"],
      default: "idle",
    },
    lastError: {
      type: String,
      default: null,
    },
    lastResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastRun: {
      type: String, // Human-readable string or timestamp
      default: "Never",
    },
    runs: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Automation = mongoose.model("Automation", automationSchema);
export default Automation;
