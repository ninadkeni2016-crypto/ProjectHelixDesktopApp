import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: String, // format YYYY-MM-DD or Day short name (Mon, Tue)
      required: true,
    },
    score: {
      type: Number, // productivity score
      required: true,
      min: 0,
      max: 100,
    },
    filesCreatedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    activeHours: {
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

const Analytics = mongoose.model("Analytics", analyticsSchema);
export default Analytics;
