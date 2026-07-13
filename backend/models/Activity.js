const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["upload", "question", "flashcard", "quiz", "exam", "roadmap"],
      required: true,
    },
    description: { type: String, required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
