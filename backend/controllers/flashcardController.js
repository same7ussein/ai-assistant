const Flashcard = require("../models/Flashcard");
const Document = require("../models/Document");
const Activity = require("../models/Activity");
const config = require("../config/env");
const { generateLocalFlashcards } = require("../utils/freeAiFallback");
const { isRetryableGeminiError } = require("../utils/geminiRetry");
const { sm2 } = require("../utils/sm2");

exports.list = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.document) filter.document = req.query.document;
    const cards = await Flashcard.find(filter)
      .populate("document", "title")
      .sort("-createdAt");
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.review = async (req, res) => {
  try {
    const { quality } = req.body;
    if (quality == null || quality < 1 || quality > 5) {
      return res
        .status(400)
        .json({ message: "Quality must be between 1 and 5." });
    }

    const card = await Flashcard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!card) return res.status(404).json({ message: "Flashcard not found." });

    const result = sm2(
      quality,
      card.repetitions,
      card.easinessFactor,
      card.interval,
    );

    card.easinessFactor = result.easinessFactor;
    card.repetitions = result.repetitions;
    card.interval = result.interval;
    card.nextReviewAt = result.nextReviewAt;
    card.lastQuality = quality;
    card.totalReviews += 1;
    card.reviewedAt = new Date();
    await card.save();

    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reviewed = async (req, res) => {
  try {
    const filter = { user: req.user.id, reviewedAt: { $ne: null } };
    if (req.query.document) filter.document = req.query.document;
    const cards = await Flashcard.find(filter).select("_id").lean();
    res.json(cards.map((c) => c._id.toString()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.due = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      user: req.user.id,
      $or: [
        { nextReviewAt: { $lte: now } },
        { lastQuality: { $lte: 3, $ne: null } },
      ],
    };
    if (req.query.document) filter.document = req.query.document;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const cards = await Flashcard.find(filter)
      .populate("document", "title")
      .sort("nextReviewAt")
      .limit(limit);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.dueCount = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      user: req.user.id,
      $or: [
        { nextReviewAt: { $lte: now } },
        { lastQuality: { $lte: 3, $ne: null } },
      ],
    };
    if (req.query.document) filter.document = req.query.document;
    const count = await Flashcard.countDocuments(filter);

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const reviewedToday = await Flashcard.countDocuments({
      user: req.user.id,
      reviewedAt: { $gte: startOfToday },
    });

    let streak = 0;
    let checkDate = new Date(startOfToday);
    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000);
      const count = await Flashcard.countDocuments({
        user: req.user.id,
        reviewedAt: { $gte: dayStart, $lt: dayEnd },
      });
      if (count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({ dueCount: count, reviewedToday, streak });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const sevenDaysAgo = new Date(
      startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000,
    );

    const [totalCards, dueToday, reviewedThisWeek, reviewData] =
      await Promise.all([
        Flashcard.countDocuments({ user: req.user.id }),
        Flashcard.countDocuments({
          user: req.user.id,
          $or: [
            { nextReviewAt: { $lte: now } },
            { lastQuality: { $lte: 3, $ne: null } },
          ],
        }),
        Flashcard.countDocuments({
          user: req.user.id,
          reviewedAt: { $gte: sevenDaysAgo },
        }),
        Flashcard.aggregate([
          { $match: { user: req.user.id, lastQuality: { $ne: null } } },
          {
            $group: {
              _id: null,
              avgQuality: { $avg: "$lastQuality" },
              totalReviews: { $sum: "$totalReviews" },
            },
          },
        ]),
      ]);

    const avgQuality =
      reviewData.length > 0
        ? Math.round(reviewData[0].avgQuality * 100) / 100
        : null;
    const totalReviews = reviewData.length > 0 ? reviewData[0].totalReviews : 0;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(
        sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000,
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await Flashcard.countDocuments({
        user: req.user.id,
        reviewedAt: { $gte: dayStart, $lt: dayEnd },
      });
      days.push({ date: dayStart.toISOString().slice(0, 10), count });
    }

    res.json({
      totalCards,
      dueToday,
      reviewedThisWeek,
      avgQuality,
      totalReviews,
      dailyReviews: days,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const card = await Flashcard.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!card) return res.status(404).json({ message: "Flashcard not found." });
    res.json({ message: "Flashcard deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function generateTitle(docTitle, keywords) {
  if (keywords && keywords.length > 0) {
    const top = keywords.slice(0, 3).join(", ");
    return `Key Ideas: ${top}`;
  }
  return `Cards: ${docTitle}`;
}

exports.generate = async (req, res) => {
  try {
    const { documentId, count } = req.body;
    const numCards = Math.min(Math.max(count || 5, 1), 20);
    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    const context = doc.content.substring(0, 25000);

    if (!config.GEMINI_API_KEY) {
      const result = generateLocalFlashcards(context, numCards);
      const saved = await Flashcard.insertMany(
        result.cards.map((c) => ({
          question: c.question,
          answer: c.answer,
          document: doc._id,
          user: req.user.id,
        })),
      );

      await Activity.create({
        user: req.user.id,
        type: "flashcard",
        description: `Created ${saved.length} flashcards from "${doc.title}" (local mode)`,
        document: doc._id,
      });

      return res.status(201).json({ cards: saved, title: result.title });
    }

    const models = config.GEMINI_MODELS;

    async function tryModel(idx) {
      if (idx >= models.length) return null;
      const model = models[idx];
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create ${numCards} flashcards from this document. Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "title": "a short evocative name for this flashcard set (max 6 words)",
  "cards": [
    { "question": "...", "answer": "..." }
  ]
}\n\nDocument:\n${context}`,
                  },
                ],
              },
            ],
          }),
        },
      );
      const data = await response.json();
      if (!response.ok && isRetryableGeminiError(response, data))
        return tryModel(idx + 1);
      if (!response.ok) {
        console.error(`Gemini error (${model}):`, JSON.stringify(data));
        return null;
      }
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    const raw = await tryModel(0);
    if (!raw) {
      const result = generateLocalFlashcards(context, numCards);
      const saved = await Flashcard.insertMany(
        result.cards.map((c) => ({
          question: c.question,
          answer: c.answer,
          document: doc._id,
          user: req.user.id,
        })),
      );

      await Activity.create({
        user: req.user.id,
        type: "flashcard",
        description: `Created ${saved.length} flashcards from "${doc.title}" (fallback)`,
        document: doc._id,
      });

      return res.status(201).json({ cards: saved, title: result.title });
    }

    const json = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      return res.status(500).json({ message: "Failed to parse AI response." });
    }

    const cards = parsed.cards || parsed;
    const aiTitle = parsed.title || generateTitle(doc.title);

    if (!Array.isArray(cards))
      return res.status(500).json({ message: "Invalid AI response format." });

    const saved = await Flashcard.insertMany(
      cards.map((c) => ({
        question: c.question,
        answer: c.answer,
        document: doc._id,
        user: req.user.id,
      })),
    );

    await Activity.create({
      user: req.user.id,
      type: "flashcard",
      description: `Created ${saved.length} flashcards from "${doc.title}"`,
      document: doc._id,
    });

    res.status(201).json({ cards: saved, title: aiTitle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
