import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    notifications: {
      type: Boolean,
      default: true,
    },
    aiSuggestions: {
      type: Boolean,
      default: true,
    },
    autoBackup: {
      type: Boolean,
      default: true,
    },
    privacyMode: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      default: "Dark (Active)",
    },
    accentColor: {
      type: String,
      default: "#3b82f6",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Only one settings document per user
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
