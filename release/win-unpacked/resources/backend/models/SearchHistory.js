import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    searchType: {
      type: String,
      enum: ["semantic", "file"],
      default: "semantic",
    },
    resultsCount: {
      type: Number,
      default: 0,
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

searchHistorySchema.index({ user: 1, timestamp: -1 });

const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);
export default SearchHistory;
