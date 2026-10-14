import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    msg: {
      type: String,
      required: true,
    },
    time: {
      type: String, // String representation e.g. "2m ago", "1h ago"
      default: "Just now",
    },
    type: {
      type: String, // success, warning, info
      enum: ["success", "warning", "info"],
      default: "info",
    },
    read: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
