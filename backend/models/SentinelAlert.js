import mongoose from "mongoose";

const SentinelAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high"],
      default: "low",
      index: true,
    },
    category: {
      type: String,
      enum: ["file_integrity", "auth_security", "system_anomaly", "policy_violation"],
      default: "file_integrity",
      index: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    affectedPath: {
      type: String,
      default: null,
    },
    recommendedAction: {
      type: String,
      required: true,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    status: {
      type: String,
      enum: ["active", "acknowledged", "dismissed"],
      default: "active",
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SentinelAlertSchema.index({ user: 1, createdAt: -1 });
SentinelAlertSchema.index({ user: 1, status: 1, severity: 1 });

const SentinelAlert = mongoose.models.SentinelAlert || mongoose.model("SentinelAlert", SentinelAlertSchema);
export default SentinelAlert;
