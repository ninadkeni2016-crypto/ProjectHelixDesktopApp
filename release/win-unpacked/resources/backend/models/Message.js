import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "gemini",
    },
    model: {
      type: String,
      default: "gemini-1.5-flash",
    },
    metadata: {
      followUpSuggestions: [
        {
          type: String,
        },
      ],
      intent: {
        type: String,
        default: "general_chat",
      },
      tokens: {
        type: Number,
        default: 0,
      },
      extra: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property 'text' mapped to 'content' for frontend compatibility
messageSchema.virtual("text").get(function () {
  return this.content;
}).set(function (val) {
  this.content = val;
});

// Indexes for conversation message sequence and user search
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ user: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
