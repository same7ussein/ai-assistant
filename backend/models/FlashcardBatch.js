const mongoose = require('mongoose');

const flashcardBatchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  label: { type: String, default: 'Flashcard Set' },
  cardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard' }],
}, { timestamps: true });

flashcardBatchSchema.index({ user: 1, document: 1 });

module.exports = mongoose.model('FlashcardBatch', flashcardBatchSchema);
