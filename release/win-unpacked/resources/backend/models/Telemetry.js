import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
  {
    cpu: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    cpuModel: {
      type: String,
      default: "",
    },
    cpuCores: {
      type: Number,
      default: 0,
    },
    ram: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    ramUsedBytes: {
      type: Number,
      default: 0,
    },
    ramTotalBytes: {
      type: Number,
      default: 0,
    },
    gpu: {
      type: Number,
      default: null,
    },
    gpuName: {
      type: String,
      default: "",
    },
    disk: {
      type: Number,
      default: 0,
    },
    diskPercent: {
      type: Number,
      default: 0,
    },
    downSpeed: {
      type: Number,
      default: 0,
    },
    upSpeed: {
      type: Number,
      default: 0,
    },
    temp: {
      type: Number,
      default: null,
    },
    batteryPercent: {
      type: Number,
      default: null,
    },
    hasBattery: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Bounded retention: automatically expire telemetry records older than 7 days
telemetrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
telemetrySchema.index({ timestamp: -1 });

const Telemetry = mongoose.model("Telemetry", telemetrySchema);
export default Telemetry;
