const DocumentQuiz = require("../models/DocumentQuiz");

exports.list = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.document) filter.document = req.query.document;
    const quizzes = await DocumentQuiz.find(filter).sort("-createdAt").lean();
    // Normalize legacy records where result exists but score was never saved
    const normalized = quizzes.map((q) => ({
      ...q,
      result: q.result?.score != null ? q.result : null,
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { documentId, title, questions, difficulty } = req.body;
    if (!documentId || !title || !questions?.length) {
      return res
        .status(400)
        .json({ message: "documentId, title, and questions are required." });
    }
    const quiz = await DocumentQuiz.create({
      user: req.user.id,
      document: documentId,
      title,
      questions,
      difficulty: difficulty || "medium",
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveResult = async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await DocumentQuiz.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    let correct = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (answers[i] === q.correctAnswer) {
        correct++;
      }
    }
    const score = Math.round((correct / quiz.questions.length) * 100);
    quiz.result = { score, answers };
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.clearResult = async (req, res) => {
  try {
    const quiz = await DocumentQuiz.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $unset: { result: "" } },
      { new: true },
    );
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const quiz = await DocumentQuiz.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    res.json({ message: "Quiz deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
