const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  cardsReviewed: { type: Number, default: 0 },
  avgQuality: { type: Number, default: null },
  cards: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard' },
    quality: Number,
  }],
}, { timestamps: true });

studySessionSchema.index({ user: 1, startedAt: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
