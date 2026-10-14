import mongoose from "mongoose";

const formatDate = (d = new Date()) => d.toISOString().split("T")[0];
const formatTime = (d = new Date()) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const TYPE_ICON_MAP = {
  download: "Download",
  meeting: "Calendar",
  screenshot: "Image",
  file: "FileText",
  project: "Layers",
  backup: "CloudUpload",
  security: "Shield",
  search: "Search",
  system: "Zap",
  auth_login: "Lock",
  auth_register: "User",
};

const TYPE_COLOR_MAP = {
  download: "text-blue-400",
  meeting: "text-purple-400",
  screenshot: "text-cyan-400",
  file: "text-green-400",
  project: "text-blue-400",
  backup: "text-emerald-400",
  security: "text-amber-400",
  search: "text-sky-400",
  system: "text-orange-400",
};

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },
    desc: {
      type: String,
      default: "",
    },
    date: {
      type: String, // format YYYY-MM-DD
      default: () => formatDate(),
    },
    time: {
      type: String, // format HH:MM AM/PM
      default: () => formatTime(),
    },
    type: {
      type: String, // download, meeting, screenshot, file, project, backup, etc.
      default: "project",
    },
    label: {
      type: String,
      default: function () {
        return this.title || this.desc || "Activity";
      },
    },
    iconType: {
      type: String, // Lucide icon name, e.g. Download, Calendar, Image, FileText, Layers, CloudUpload
      default: function () {
        return TYPE_ICON_MAP[this.type] || "Activity";
      },
    },
    color: {
      type: String,
      default: function () {
        return TYPE_COLOR_MAP[this.type] || "text-blue-400";
      },
    },
    status: {
      type: String,
      enum: ["completed", "in_progress", "failed", "pending"],
      default: "completed",
    },
    taskType: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ user: 1, createdAt: -1 });

// Resilient pre-validation hook to normalize activity entries across all creation patterns
activitySchema.pre("validate", function (next) {
  if (!this.date) {
    this.date = formatDate();
  }
  if (!this.time) {
    this.time = formatTime();
  }
  if (!this.label) {
    this.label = this.title || this.desc || "Activity";
  }
  if (!this.title && this.label) {
    this.title = this.label;
  }
  if (!this.desc && this.label) {
    this.desc = this.label;
  }
  if (!this.iconType) {
    this.iconType = TYPE_ICON_MAP[this.type] || "Activity";
  }
  if (!this.color) {
    this.color = TYPE_COLOR_MAP[this.type] || "text-blue-400";
  }
  if (typeof next === "function") next();
});

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;
