const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  reviewedAt: { type: Date, default: null },
  easinessFactor: { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 },
  interval: { type: Number, default: 0 },
  nextReviewAt: { type: Date, default: Date.now },
  lastQuality: { type: Number, default: null },
  totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

flashcardSchema.index({ user: 1, document: 1 });
flashcardSchema.index({ user: 1, nextReviewAt: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
