import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Configure compound index for sorting audit history
auditLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
