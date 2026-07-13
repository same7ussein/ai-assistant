const FlashcardBatch = require("../models/FlashcardBatch");
const Flashcard = require("../models/Flashcard");

exports.list = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.document) filter.document = req.query.document;
    const batches = await FlashcardBatch.find(filter).sort("-createdAt");
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { documentId, label, cardIds } = req.body;
    if (!documentId || !cardIds?.length) {
      return res.status(400).json({ message: "documentId and cardIds are required." });
    }
    const batch = await FlashcardBatch.create({
      user: req.user.id,
      document: documentId,
      label: label || "Flashcard Set",
      cardIds,
    });
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const batch = await FlashcardBatch.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!batch) return res.status(404).json({ message: "Batch not found." });
    await Flashcard.deleteMany({ _id: { $in: batch.cardIds }, user: req.user.id });
    res.json({ message: "Batch deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
