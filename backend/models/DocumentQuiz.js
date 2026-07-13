const mongoose = require("mongoose");

const documentQuizSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    title: { type: String, required: true },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        explanation: { type: String },
      },
    ],
    difficulty: { type: String, default: "medium" },
    result: {
      type: {
        score: { type: Number },
        answers: [{ type: Number }],
      },
      default: null,
    },
  },
  { timestamps: true },
);

documentQuizSchema.index({ user: 1, document: 1 });

module.exports = mongoose.model("DocumentQuiz", documentQuizSchema);
