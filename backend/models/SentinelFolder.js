import mongoose from "mongoose";

const SentinelFolderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    baselineFileCount: {
      type: Number,
      default: 0,
    },
    baselineHashes: {
      type: [
        {
          file: { type: String, required: true },
          hash: { type: String, required: true },
        },
      ],
      default: [],
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    lastStatus: {
      type: String,
      enum: ["healthy", "modified", "error", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

SentinelFolderSchema.index({ user: 1, path: 1 }, { unique: true });

const SentinelFolder = mongoose.models.SentinelFolder || mongoose.model("SentinelFolder", SentinelFolderSchema);
export default SentinelFolder;
