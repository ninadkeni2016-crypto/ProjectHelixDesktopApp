import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    size: {
      type: String, // String format (e.g. "4.2 MB", "892 KB") for easy rendering
      required: true,
    },
    sizeBytes: {
      type: Number, // Number in bytes for calculations and analytics
      required: true,
    },
    createdDate: {
      type: Date,
      required: true,
    },
    modifiedDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String, // e.g. "study", "design", "tech", "meetings", "photos", "videos", "finance", "other"
      required: true,
      default: "other",
    },
    tags: [
      {
        type: String,
      },
    ],
    favorite: {
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

// Compound index to quickly search files per user
fileSchema.index({ user: 1, path: 1 }, { unique: true });
fileSchema.index({ user: 1, category: 1 });
fileSchema.index({ user: 1, favorite: 1 });
fileSchema.index({ user: 1, modifiedDate: -1 });
fileSchema.index({ user: 1, sizeBytes: -1 });
fileSchema.index({ name: "text" });

const File = mongoose.model("File", fileSchema);
export default File;
