const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    documents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    }],
    title: { type: String, required: true },
    questions: [
      {
        type: {
          type: String,
          enum: ["multiple-choice", "true-false", "short-answer"],
          required: true,
        },
        question: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
        explanation: { type: String },
      },
    ],
    difficulty: { type: String, default: "medium" },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    result: {
      type: {
        score: { type: Number },
        answers: [{ type: mongoose.Schema.Types.Mixed }],
      },
      default: null,
    },
  },
  { timestamps: true },
);

examSchema.index({ user: 1 });

module.exports = mongoose.model("Exam", examSchema);
