const StudySession = require('../models/StudySession');
const Flashcard = require('../models/Flashcard');
const { sm2 } = require('../utils/sm2');

exports.start = async (req, res) => {
  try {
    const session = await StudySession.create({ user: req.user.id });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.review = async (req, res) => {
  try {
    const { sessionId, cardId, quality } = req.body;
    if (quality < 1 || quality > 5) {
      return res.status(400).json({ message: 'Quality must be between 1 and 5.' });
    }

    const session = await StudySession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const card = await Flashcard.findOne({ _id: cardId, user: req.user.id });
    if (!card) return res.status(404).json({ message: 'Flashcard not found.' });

    const sm2Result = sm2(quality, card.repetitions, card.easinessFactor, card.interval);

    card.easinessFactor = sm2Result.easinessFactor;
    card.repetitions = sm2Result.repetitions;
    card.interval = sm2Result.interval;
    card.nextReviewAt = sm2Result.nextReviewAt;
    card.lastQuality = quality;
    card.totalReviews += 1;
    card.reviewedAt = new Date();
    await card.save();

    session.cards.push({ card: cardId, quality });
    session.cardsReviewed += 1;
    await session.save();

    res.json({ card, session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.end = async (req, res) => {
  try {
    const session = await StudySession.findOne({ _id: req.params.id, user: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    session.endedAt = new Date();
    if (session.cards.length > 0) {
      const sum = session.cards.reduce((a, c) => a + c.quality, 0);
      session.avgQuality = Math.round((sum / session.cards.length) * 100) / 100;
    }
    await session.save();

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const sessions = await StudySession.find({ user: req.user.id })
      .sort('-startedAt')
      .limit(30);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
